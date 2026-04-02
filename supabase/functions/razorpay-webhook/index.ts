import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function getSettings(supabase: any): Promise<Record<string, string>> {
  const { data } = await supabase.from('settings').select('key, value');
  const settings: Record<string, string> = {};
  if (data) data.forEach((s: { key: string; value: string | null }) => { if (s.value) settings[s.key] = s.value; });
  return settings;
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyWebhookSignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const expected = arrayBufferToHex(sig);
    if (expected.length !== signature.length) return false;
    let result = 0;
    for (let i = 0; i < expected.length; i++) result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    return result === 0;
  } catch (e) {
    console.error("Signature verification error:", e);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    console.log("Razorpay webhook received. Has signature:", !!signature);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const settings = await getSettings(supabase);
    const webhookSecret = settings['razorpay_webhook_secret'] || Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
    const IS_TEST_MODE = settings['razorpay_test_mode'] === 'true';

    // Verify signature (skip in test mode or if no secret configured)
    if (!IS_TEST_MODE && webhookSecret && signature) {
      const isValid = await verifyWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.error("❌ Invalid Razorpay webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      console.log("✅ Webhook signature verified");
    } else if (!IS_TEST_MODE && !webhookSecret) {
      console.warn("⚠️ No razorpay_webhook_secret configured - accepting without verification");
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    console.log("Webhook event:", event);

    // We care about payment.captured (money received)
    if (event === 'payment.captured' || event === 'payment.authorized') {
      const payment = payload.payload?.payment?.entity;
      if (!payment) {
        console.error("No payment entity in webhook payload");
        return new Response(JSON.stringify({ status: "ignored", reason: "no payment entity" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const razorpayPaymentId = payment.id;
      const razorpayOrderId = payment.notes?.razorpay_payment_link_id || payment.order_id;
      const orderNumber = payment.notes?.order_number || payment.description;

      console.log(`Payment ${event}:`, { razorpayPaymentId, razorpayOrderId, orderNumber, amount: payment.amount });

      // Find the order - try multiple strategies
      let order = null;

      // Strategy 1: By razorpay_payment_id (already processed)
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('*')
        .eq('razorpay_payment_id', razorpayPaymentId)
        .maybeSingle();

      if (existingOrder) {
        console.log(`Order already has payment ID. Status: ${existingOrder.status}, Delivery: ${existingOrder.delivery_status}`);
        
        // If paid but delivery not started, trigger delivery
        if ((existingOrder.status === 'paid' || existingOrder.status === 'completed') && existingOrder.delivery_status === 'pending') {
          console.log("🔄 Re-triggering delivery for paid order with pending delivery");
          fetch(`${supabaseUrl}/functions/v1/process-order-delivery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
            body: JSON.stringify({ order_id: existingOrder.id }),
          }).catch(err => console.error('Failed to trigger delivery:', err));
        }

        return new Response(JSON.stringify({ status: "ok", message: "Order already processed" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Strategy 2: By razorpay_order_id (payment link ID)
      if (razorpayOrderId) {
        const { data } = await supabase.from('orders').select('*').eq('razorpay_order_id', razorpayOrderId).maybeSingle();
        if (data) order = data;
      }

      // Strategy 3: By order_number from payment notes
      if (!order && orderNumber) {
        const { data } = await supabase.from('orders').select('*').eq('order_number', orderNumber).maybeSingle();
        if (data) order = data;
      }

      // Strategy 4: By payment link reference_id
      const refId = payment.notes?.razorpay_payment_link_reference_id;
      if (!order && refId) {
        const { data } = await supabase.from('orders').select('*').eq('order_number', refId).maybeSingle();
        if (data) order = data;
      }

      if (!order) {
        console.warn("⚠️ No matching order found for payment:", razorpayPaymentId);
        return new Response(JSON.stringify({ status: "ignored", reason: "no matching order" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Idempotency: skip if already paid
      if (order.status === 'paid' || order.status === 'completed') {
        console.log(`Order ${order.order_number} already ${order.status}. Skipping.`);
        return new Response(JSON.stringify({ status: "ok", message: "Already processed" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Mark as paid and trigger delivery
      console.log(`🎉 Marking order ${order.order_number} as PAID via webhook`);
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: 'webhook_verified',
          delivery_status: 'pending',
        })
        .eq('id', order.id);

      if (updateError) {
        console.error("Error updating order:", updateError);
        throw updateError;
      }

      // Fire-and-forget: trigger delivery
      fetch(`${supabaseUrl}/functions/v1/process-order-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
        body: JSON.stringify({ order_id: order.id }),
      }).catch(err => console.error('Failed to trigger delivery:', err));

      // Send Telegram notification
      fetch(`${supabaseUrl}/functions/v1/send-telegram-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
        body: JSON.stringify({
          type: 'webhook_recovery',
          data: {
            order_number: order.order_number,
            customer_name: order.customer_name,
            customer_email: order.customer_email,
            amount: order.total_amount,
            payment_id: razorpayPaymentId,
          }
        }),
      }).catch(err => console.error('Failed to send Telegram:', err));

      return new Response(JSON.stringify({ status: "ok", message: `Order ${order.order_number} marked as paid` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // For other events, just acknowledge
    console.log(`Ignoring event: ${event}`);
    return new Response(JSON.stringify({ status: "ok", event }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error("Razorpay webhook error:", error);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
