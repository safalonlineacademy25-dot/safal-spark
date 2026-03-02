import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://safalonlinesolutions.com',
  'https://hujuqkhbdptsdnbnkslo.supabase.co',
  'http://localhost:5173',
  'http://localhost:8080',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app') || origin.endsWith('.lovableproject.com')
  ) ? origin : ALLOWED_ORIGINS[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Helper function to get settings from database
async function getSettings(supabase: any): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('settings')
    .select('key, value');
  
  if (error) {
    console.error("Error fetching settings:", error);
    return {};
  }
  
  const settings: Record<string, string> = {};
  if (data) {
    data.forEach((s: { key: string; value: string | null }) => {
      if (s.value) settings[s.key] = s.value;
    });
  }
  return settings;
}

// Helper function to convert ArrayBuffer to hex string
function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Verify HMAC SHA256 signature
async function verifySignature(
  message: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(message);
    
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const sig = await crypto.subtle.sign("HMAC", key, messageData);
    const expectedSignature = arrayBufferToHex(sig);
    
    if (expectedSignature.length !== signature.length) {
      return false;
    }
    
    // Constant-time comparison
    let result = 0;
    for (let i = 0; i < expectedSignature.length; i++) {
      result |= expectedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    
    return result === 0;
  } catch (error) {
    console.error("Error verifying signature:", error);
    return false;
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const settings = await getSettings(supabase);
    const RAZORPAY_KEY_SECRET = settings['razorpay_key_secret'] || Deno.env.get('RAZORPAY_KEY_SECRET') || 'test_secret_key';
    const IS_TEST_MODE = settings['razorpay_test_mode'] === 'true' || !settings['razorpay_key_secret'];

    console.log("Verify payment request. Test mode:", IS_TEST_MODE);

    // Determine if this is a Payment Link callback or legacy modal verification
    const isPaymentLink = !!body.razorpay_payment_link_id;

    if (isPaymentLink) {
      // ===== Payment Link Callback Verification =====
      const {
        razorpay_payment_id,
        razorpay_payment_link_id,
        razorpay_payment_link_reference_id,
        razorpay_payment_link_status,
        razorpay_signature,
      } = body;

      console.log("Payment Link callback:", {
        razorpay_payment_id,
        razorpay_payment_link_id,
        razorpay_payment_link_reference_id,
        razorpay_payment_link_status,
      });

      if (!razorpay_payment_id || !razorpay_payment_link_id) {
        throw new Error("Payment ID and Payment Link ID are required");
      }

      // Verify signature for payment links:
      // message = payment_link_id|payment_link_reference_id|payment_link_status|razorpay_payment_id
      if (!IS_TEST_MODE) {
        if (!razorpay_signature) {
          throw new Error("Payment signature is required for verification");
        }

        const message = `${razorpay_payment_link_id}|${razorpay_payment_link_reference_id}|${razorpay_payment_link_status}|${razorpay_payment_id}`;
        const isValid = await verifySignature(message, razorpay_signature, RAZORPAY_KEY_SECRET);

        if (!isValid) {
          console.error("Invalid payment link signature - potential fraud attempt");
          throw new Error("Invalid payment signature");
        }
        console.log("Payment link signature verified successfully");
      } else {
        console.log("⚠️ Test mode - skipping signature verification");
      }

      // Find order by payment link ID (stored in razorpay_order_id) or by reference_id (order_number)
      let order = null;
      let findError = null;

      // Try by payment link ID first
      const { data: orderByLinkId, error: err1 } = await supabase
        .from('orders')
        .select('*')
        .eq('razorpay_order_id', razorpay_payment_link_id)
        .single();

      if (orderByLinkId) {
        order = orderByLinkId;
      } else {
        // Fallback: find by order number (reference_id)
        const { data: orderByRef, error: err2 } = await supabase
          .from('orders')
          .select('*')
          .eq('order_number', razorpay_payment_link_reference_id)
          .single();
        
        if (orderByRef) {
          order = orderByRef;
        } else {
          findError = err1 || err2;
        }
      }

      if (!order) {
        console.error("Order not found for payment link:", razorpay_payment_link_id, "ref:", razorpay_payment_link_reference_id);
        throw new Error("Order not found");
      }

      // Check if already processed (idempotency)
      if (order.status === 'paid' || order.status === 'completed') {
        console.log("Order already paid, returning success:", order.order_number);
        return new Response(
          JSON.stringify({
            success: true,
            order_number: order.order_number,
            status: order.status,
            message: 'Payment already verified. Download links have been sent.',
            already_processed: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update order status
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          razorpay_payment_id: razorpay_payment_id,
          razorpay_signature: razorpay_signature || 'payment_link',
          delivery_status: 'pending',
        })
        .eq('id', order.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating order:", updateError);
        throw updateError;
      }

      console.log("Payment verified via Payment Link. Order:", updatedOrder.order_number);

      // Fire-and-forget: trigger async delivery
      fetch(`${supabaseUrl}/functions/v1/process-order-delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ order_id: order.id }),
      }).catch(err => console.error('Failed to trigger order delivery:', err));

      return new Response(
        JSON.stringify({
          success: true,
          order_number: updatedOrder.order_number,
          status: updatedOrder.status,
          message: 'Payment verified! Download links will be sent shortly.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // ===== Legacy Modal Verification (backward compatibility) =====
      const { order_id, razorpay_payment_id, razorpay_order_id, razorpay_signature } = body;

      console.log("Legacy modal verification:", { order_id, razorpay_payment_id, razorpay_order_id });

      if (!order_id) {
        throw new Error("Order ID is required");
      }

      if (!razorpay_payment_id || !razorpay_order_id) {
        throw new Error("Payment ID and Order ID are required");
      }

      if (!IS_TEST_MODE) {
        if (!razorpay_signature) {
          throw new Error("Payment signature is required for verification");
        }

        const message = `${razorpay_order_id}|${razorpay_payment_id}`;
        const isValid = await verifySignature(message, razorpay_signature, RAZORPAY_KEY_SECRET);

        if (!isValid) {
          console.error("Invalid payment signature - potential fraud attempt");
          throw new Error("Invalid payment signature");
        }
        console.log("Signature verified successfully");
      } else {
        console.log("⚠️ Test mode - skipping signature verification");
      }

      const { data: order, error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          razorpay_payment_id: razorpay_payment_id,
          razorpay_signature: razorpay_signature || 'test_signature',
          delivery_status: 'pending',
        })
        .eq('id', order_id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating order:", updateError);
        throw updateError;
      }

      console.log("Payment verified (legacy), order updated:", order.id);

      // Fire-and-forget: trigger async delivery
      fetch(`${supabaseUrl}/functions/v1/process-order-delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ order_id }),
      }).catch(err => console.error('Failed to trigger order delivery:', err));

      return new Response(
        JSON.stringify({
          success: true,
          order_number: order.order_number,
          status: order.status,
          message: 'Payment verified! Download links will be sent shortly.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error("Error in verify-razorpay-payment:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
