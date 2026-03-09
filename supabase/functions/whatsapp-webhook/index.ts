import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Get verify token from env or settings
async function getVerifyToken(): Promise<string> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "whatsapp_webhook_verify_token")
    .single();
  
  if (data?.value) return data.value;
  return Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN") || "";
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ─── GET: Webhook Verification Handshake ───
  if (req.method === "GET") {
    const url = new URL(req.url);
    
    // Support both Meta-style (hub.*) and generic verification
    const mode = url.searchParams.get("hub.mode") || url.searchParams.get("mode");
    const token = url.searchParams.get("hub.verify_token") || url.searchParams.get("verify_token") || url.searchParams.get("token");
    const challenge = url.searchParams.get("hub.challenge") || url.searchParams.get("challenge");

    const verifyToken = await getVerifyToken();
    console.log("Webhook verification request:", { mode, hasToken: !!verifyToken, hasChallenge: !!challenge });

    if (token && token === verifyToken) {
      console.log("✅ Webhook verified successfully");
      return new Response(challenge || "OK", { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    console.error("❌ Webhook verification failed - token mismatch");
    return new Response("Forbidden", { status: 403 });
  }

  // ─── POST: Incoming Webhook Events ───
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("Webhook event received:", JSON.stringify(body, null, 2));

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // ─── Try WaSimple format first ───
      // WaSimple may send: { event: "messages.update", data: { update: { status: 2 }, key: { remoteJid, id } } }
      // Or standard WhatsApp Cloud API format via statuses array
      if (body?.event) {
        console.log(`📱 WaSimple event: ${body.event}`);
        await handleWaSimpleEvent(supabase, body);
        return new Response("OK", { status: 200, headers: corsHeaders });
      }

      // ─── Try statuses directly (some providers send flat format) ───
      if (body?.statuses && Array.isArray(body.statuses)) {
        console.log("📱 Direct statuses format detected");
        for (const status of body.statuses) {
          await processStatusUpdate(supabase, status.recipient_id, status.status, status.id, status.errors);
        }
        return new Response("OK", { status: 200, headers: corsHeaders });
      }

      // ─── Meta/Cloud API format ───
      const entries = body?.entry;
      if (entries && Array.isArray(entries)) {
        for (const entry of entries) {
          const changes = entry?.changes;
          if (!changes || !Array.isArray(changes)) continue;

          for (const change of changes) {
            if (change.field !== "messages") continue;
            const value = change.value;

            const statuses = value?.statuses;
            if (statuses && Array.isArray(statuses)) {
              for (const status of statuses) {
                await processStatusUpdate(supabase, status.recipient_id, status.status, status.id, status.errors);
              }
            }

            const messages = value?.messages;
            if (messages && Array.isArray(messages)) {
              for (const msg of messages) {
                console.log(`📩 Incoming message from ${msg.from}: type=${msg.type}, text=${msg.text?.body || "(non-text)"}`);
              }
            }
          }
        }
      }

      // Log unrecognized format for debugging
      if (!body?.event && !body?.statuses && !body?.entry) {
        console.log("⚠️ Unrecognized webhook format - logging for analysis:", JSON.stringify(body));
      }

      return new Response("OK", { status: 200, headers: corsHeaders });
    } catch (error: any) {
      console.error("❌ Webhook processing error:", error.message);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});

// ─── Handle WaSimple-specific events ───
async function handleWaSimpleEvent(supabase: any, body: any) {
  const event = body.event;

  if (event === "messages.update" || event === "message.update") {
    const data = body.data;
    if (!data) return;

    // WaSimple status codes: 0=ERROR, 1=PENDING, 2=SENT, 3=DELIVERED, 4=READ
    const statusCode = data?.update?.status ?? data?.status;
    const remoteJid = data?.key?.remoteJid || data?.remoteJid || data?.to;
    const messageId = data?.key?.id || data?.id;

    const statusMap: Record<number, string> = {
      0: "failed",
      1: "pending",
      2: "sent",
      3: "delivered",
      4: "read",
    };

    // Also handle string statuses
    const stringStatusMap: Record<string, string> = {
      "error": "failed",
      "failed": "failed",
      "pending": "pending",
      "sent": "sent",
      "delivered": "delivered",
      "read": "read",
    };

    let deliveryStatus: string;
    if (typeof statusCode === "number") {
      deliveryStatus = statusMap[statusCode] || "sent";
    } else if (typeof statusCode === "string") {
      deliveryStatus = stringStatusMap[statusCode.toLowerCase()] || statusCode;
    } else {
      console.log("⚠️ Unknown status format:", statusCode);
      return;
    }

    // Extract phone from remoteJid (format: "919604756115@s.whatsapp.net")
    let phone = remoteJid || "";
    phone = phone.replace(/@.*$/, "").replace(/^\+/, "");

    console.log(`📱 WaSimple status: ${deliveryStatus} for ${phone} (msg: ${messageId})`);

    if (phone) {
      await processStatusUpdate(supabase, phone, deliveryStatus, messageId, null);
    }
  } else if (event === "messages.received" || event === "message.received") {
    const msg = body.data;
    console.log(`📩 WaSimple incoming message from ${msg?.key?.remoteJid || msg?.from}: ${msg?.messageBody || "(non-text)"}`);
  } else if (event === "message.sent") {
    const data = body.data;
    const phone = (data?.to || "").replace(/^\+/, "");
    console.log(`📤 WaSimple message sent to ${phone}, status: ${data?.status}`);
    if (phone && data?.status) {
      await processStatusUpdate(supabase, phone, data.status, data?.id, null);
    }
  } else {
    console.log(`ℹ️ Unhandled WaSimple event: ${event}`);
  }
}

// ─── Shared status update logic ───
async function processStatusUpdate(supabase: any, recipientPhone: string, statusValue: string, messageId: string | null, errors: any) {
  if (!recipientPhone) return;

  console.log(`📱 Processing status: ${statusValue} for ${recipientPhone} (msg: ${messageId})`);

  if (errors) {
    console.error("WhatsApp delivery error:", JSON.stringify(errors));
  }

  // Normalize status
  const statusNormalize: Record<string, string> = {
    "sent": "sent",
    "delivered": "delivered",
    "read": "read",
    "failed": "failed",
    "error": "failed",
    "pending": "pending",
  };
  const deliveryStatus = statusNormalize[statusValue.toLowerCase()] || statusValue;

  const cleanPhone = recipientPhone.replace(/^\+/, "").replace(/@.*$/, "");
  const last10 = cleanPhone.slice(-10);

  const { data: matchedOrders, error: matchError } = await supabase
    .from("orders")
    .select("id, customer_phone, delivery_status")
    .or(`customer_phone.eq.${cleanPhone},customer_phone.eq.+${cleanPhone},customer_phone.ilike.%${last10}`)
    .in("status", ["paid", "completed"])
    .order("created_at", { ascending: false })
    .limit(5);

  if (matchError) {
    console.error("Error finding orders:", matchError);
    return;
  }

  if (!matchedOrders || matchedOrders.length === 0) {
    console.log(`No matching orders found for phone: ${cleanPhone}`);
    return;
  }

  const statusPriority: Record<string, number> = {
    "pending": 0,
    "sent": 1,
    "delivered": 2,
    "read": 3,
    "failed": -1,
  };

  for (const order of matchedOrders) {
    const currentPriority = statusPriority[order.delivery_status || "pending"] ?? 0;
    const newPriority = statusPriority[deliveryStatus] ?? 0;

    if (newPriority > currentPriority || deliveryStatus === "failed") {
      const { error: updateError } = await supabase
        .from("orders")
        .update({ delivery_status: deliveryStatus })
        .eq("id", order.id);

      if (updateError) {
        console.error(`Error updating order ${order.id}:`, updateError);
      } else {
        console.log(`✅ Updated order ${order.id} delivery_status → ${deliveryStatus}`);
      }
    } else {
      console.log(`Skipping order ${order.id}: current "${order.delivery_status}" >= "${deliveryStatus}"`);
    }
  }
}
