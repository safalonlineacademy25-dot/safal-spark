import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// CORS headers - webhooks don't need CORS but including for consistency
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
};

// Resend webhook event types we care about
type ResendEventType = 
  | 'email.sent'
  | 'email.delivered'
  | 'email.delivery_delayed'
  | 'email.complained'
  | 'email.bounced'
  | 'email.opened'
  | 'email.clicked';

interface ResendWebhookPayload {
  type: ResendEventType;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    // For bounce events
    bounce?: {
      message: string;
      code?: string;
    };
    // For complaint events  
    complaint?: {
      message: string;
    };
  };
}

// Verify webhook signature from Resend (using Svix)
async function verifyWebhookSignature(
  payload: string,
  headers: Headers
): Promise<boolean> {
  const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  
  if (!webhookSecret) {
    console.warn("RESEND_WEBHOOK_SECRET not configured - skipping signature verification");
    return true; // Allow in development but log warning
  }

  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error("Missing Svix headers for webhook verification");
    return false;
  }

  // Check timestamp to prevent replay attacks (5 minutes tolerance)
  const timestamp = parseInt(svixTimestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) {
    console.error("Webhook timestamp too old, possible replay attack");
    return false;
  }

  // Verify signature using HMAC-SHA256
  try {
    const signedContent = `${svixId}.${svixTimestamp}.${payload}`;
    
    // Extract the secret (remove "whsec_" prefix if present)
    const secretBytes = webhookSecret.startsWith("whsec_") 
      ? webhookSecret.substring(6) 
      : webhookSecret;
    
    // Decode base64 secret
    const secretKey = Uint8Array.from(atob(secretBytes), c => c.charCodeAt(0));
    
    // Import key for HMAC
    const key = await crypto.subtle.importKey(
      "raw",
      secretKey,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    // Sign the content
    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(signedContent)
    );
    
    // Convert to base64
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));
    
    // Parse the v1 signatures from the header
    const signatures = svixSignature.split(" ");
    for (const sig of signatures) {
      const [version, signature] = sig.split(",");
      if (version === "v1" && signature === expectedSignature) {
        return true;
      }
    }
    
    console.error("Webhook signature verification failed");
    return false;
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const payload = await req.text();
    
    // Verify webhook signature
    const isValid = await verifyWebhookSignature(payload, req.headers);
    if (!isValid) {
      console.error("Invalid webhook signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const event: ResendWebhookPayload = JSON.parse(payload);
    console.log("Received Resend webhook event:", event.type);
    console.log("Email ID:", event.data.email_id);
    console.log("Recipients:", event.data.to);

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle different event types
    switch (event.type) {
      case 'email.bounced': {
        console.log("Processing bounce event");
        const bounceMessage = event.data.bounce?.message || 'Email bounced';
        
        // Find the email log by resend_email_id
        const { data: emailLog, error: findError } = await supabase
          .from('email_delivery_logs')
          .select('id, order_id, product_id, recipient_email')
          .eq('resend_email_id', event.data.email_id)
          .single();

        if (findError || !emailLog) {
          console.log("Email log not found for ID:", event.data.email_id);
          // Still return 200 to acknowledge receipt
          return new Response(
            JSON.stringify({ received: true, action: 'none', reason: 'email_log_not_found' }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update email delivery status to bounced
        await supabase
          .from('email_delivery_logs')
          .update({ 
            delivery_status: 'bounced',
            error_message: bounceMessage,
            updated_at: new Date().toISOString()
          })
          .eq('id', emailLog.id);

        // Get order details for refund
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('id, razorpay_payment_id, total_amount, status')
          .eq('id', emailLog.order_id)
          .single();

        if (orderError || !order) {
          console.error("Could not fetch order for refund:", orderError);
          return new Response(
            JSON.stringify({ received: true, action: 'logged_bounce', refund: false }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if refund already exists
        const { data: existingRefund } = await supabase
          .from('refunds')
          .select('id')
          .eq('order_id', emailLog.order_id)
          .single();

        if (!existingRefund && order.razorpay_payment_id && 
            (order.status === 'paid' || order.status === 'completed')) {
          // Create refund entry
          console.log("Creating refund entry for bounced email");
          await supabase.from('refunds').insert({
            order_id: emailLog.order_id,
            razorpay_payment_id: order.razorpay_payment_id,
            amount: order.total_amount,
            currency: 'INR',
            reason: 'email_bounced',
            failed_email: emailLog.recipient_email,
            status: 'eligible',
          });

          // Update order delivery status
          await supabase
            .from('orders')
            .update({ delivery_status: 'bounced' })
            .eq('id', emailLog.order_id);

          return new Response(
            JSON.stringify({ received: true, action: 'refund_created' }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ received: true, action: 'logged_bounce' }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'email.complained': {
        console.log("Processing complaint event");
        const complaintMessage = event.data.complaint?.message || 'Email marked as spam';
        
        // Find and update the email log
        const { data: emailLog } = await supabase
          .from('email_delivery_logs')
          .select('id, order_id')
          .eq('resend_email_id', event.data.email_id)
          .single();

        if (emailLog) {
          await supabase
            .from('email_delivery_logs')
            .update({ 
              delivery_status: 'complained',
              error_message: complaintMessage,
              updated_at: new Date().toISOString()
            })
            .eq('id', emailLog.id);

          // Update order status
          await supabase
            .from('orders')
            .update({ delivery_status: 'complained' })
            .eq('id', emailLog.order_id);
        }

        return new Response(
          JSON.stringify({ received: true, action: 'logged_complaint' }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'email.delivered': {
        console.log("Processing delivery confirmation");
        
        // Update email log to delivered
        const { data: emailLog } = await supabase
          .from('email_delivery_logs')
          .select('id, order_id')
          .eq('resend_email_id', event.data.email_id)
          .single();

        if (emailLog) {
          await supabase
            .from('email_delivery_logs')
            .update({ 
              delivery_status: 'delivered',
              updated_at: new Date().toISOString()
            })
            .eq('id', emailLog.id);

          // Update order delivery status
          await supabase
            .from('orders')
            .update({ delivery_status: 'delivered' })
            .eq('id', emailLog.order_id);
        }

        return new Response(
          JSON.stringify({ received: true, action: 'logged_delivery' }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'email.delivery_delayed': {
        console.log("Processing delivery delay");
        
        const { data: emailLog } = await supabase
          .from('email_delivery_logs')
          .select('id')
          .eq('resend_email_id', event.data.email_id)
          .single();

        if (emailLog) {
          await supabase
            .from('email_delivery_logs')
            .update({ 
              delivery_status: 'delayed',
              updated_at: new Date().toISOString()
            })
            .eq('id', emailLog.id);
        }

        return new Response(
          JSON.stringify({ received: true, action: 'logged_delay' }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'email.sent':
      case 'email.opened':
      case 'email.clicked':
        // These are informational events, just acknowledge
        console.log(`Received ${event.type} event - no action required`);
        return new Response(
          JSON.stringify({ received: true, action: 'acknowledged' }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      default:
        console.log("Unknown event type:", event.type);
        return new Response(
          JSON.stringify({ received: true, action: 'ignored' }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

  } catch (error: any) {
    console.error("Error processing Resend webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
