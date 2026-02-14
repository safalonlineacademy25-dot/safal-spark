import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PHONE_NUMBER_ID = "1014204688435339";

// Get verify token from env or settings
async function getVerifyToken(): Promise<string> {
  // Primary: check settings table (most reliable)
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "whatsapp_webhook_verify_token")
    .single();
  
  if (data?.value) return data.value;
  
  // Fallback: env var
  return Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN") || "";
}

serve(async (req: Request): Promise<Response> => {
  // ─── GET: Meta Webhook Verification Handshake ───
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const verifyToken = await getVerifyToken();
    console.log("Webhook verification request:", { mode, hasToken: !!verifyToken });

    if (mode === "subscribe" && token && token === verifyToken) {
      console.log("✅ Webhook verified successfully");
      return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    console.error("❌ Webhook verification failed - token mismatch");
    return new Response("Forbidden", { status: 403 });
  }

  // ─── POST: Incoming Webhook Events ───
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("Webhook event received:", JSON.stringify(body, null, 2));

      // Meta sends a specific structure for WhatsApp webhooks
      const entries = body?.entry;
      if (!entries || !Array.isArray(entries)) {
        console.log("No entries in webhook payload, acknowledging");
        return new Response("OK", { status: 200 });
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      for (const entry of entries) {
        const changes = entry?.changes;
        if (!changes || !Array.isArray(changes)) continue;

        for (const change of changes) {
          if (change.field !== "messages") continue;

          const value = change.value;

          // ─── Process delivery status updates ───
          const statuses = value?.statuses;
          if (statuses && Array.isArray(statuses)) {
            for (const status of statuses) {
              const messageId = status.id;
              const recipientPhone = status.recipient_id;
              const statusValue = status.status; // sent, delivered, read, failed
              const timestamp = status.timestamp;
              const errors = status.errors;

              console.log(`📱 Status update: ${statusValue} for ${recipientPhone} (msg: ${messageId})`);

              if (errors) {
                console.error("WhatsApp delivery error:", JSON.stringify(errors));
              }

              // Map WhatsApp status to our delivery_status
              let deliveryStatus: string;
              switch (statusValue) {
                case "sent":
                  deliveryStatus = "sent";
                  break;
                case "delivered":
                  deliveryStatus = "delivered";
                  break;
                case "read":
                  deliveryStatus = "read";
                  break;
                case "failed":
                  deliveryStatus = "failed";
                  break;
                default:
                  deliveryStatus = statusValue;
              }

              // Clean phone number for matching (remove leading country code format differences)
              const cleanPhone = recipientPhone.replace(/^\+/, "");

              // Find orders matching this phone number and update delivery status
              // We match on phone ending to handle country code variations
              const { data: matchedOrders, error: matchError } = await supabase
                .from("orders")
                .select("id, customer_phone, delivery_status")
                .or(`customer_phone.eq.${cleanPhone},customer_phone.eq.+${cleanPhone},customer_phone.ilike.%${cleanPhone.slice(-10)}`)
                .in("status", ["paid", "completed"])
                .order("created_at", { ascending: false })
                .limit(5);

              if (matchError) {
                console.error("Error finding orders:", matchError);
                continue;
              }

              if (!matchedOrders || matchedOrders.length === 0) {
                console.log(`No matching orders found for phone: ${cleanPhone}`);
                continue;
              }

              // Update orders that haven't reached a "better" status yet
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

                // Only update if new status is "better" (higher priority), or if it's a failure
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
                  console.log(`Skipping order ${order.id}: current status "${order.delivery_status}" >= "${deliveryStatus}"`);
                }
              }
            }
          }

          // ─── Process incoming messages (optional - log them) ───
          const messages = value?.messages;
          if (messages && Array.isArray(messages)) {
            for (const msg of messages) {
              console.log(`📩 Incoming message from ${msg.from}: type=${msg.type}, text=${msg.text?.body || "(non-text)"}`);
              // We don't respond to incoming messages for now
              // This could be extended for customer support features
            }
          }
        }
      }

      // Always return 200 to acknowledge receipt (Meta requires this)
      return new Response("OK", { status: 200 });
    } catch (error: any) {
      console.error("❌ Webhook processing error:", error.message);
      // Still return 200 to prevent Meta from retrying endlessly
      return new Response("OK", { status: 200 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
