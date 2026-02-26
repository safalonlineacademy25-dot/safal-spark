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

// Function to verify Razorpay signature using Web Crypto API
async function verifyRazorpaySignature(
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string,
  secret: string,
  isTestMode: boolean
): Promise<boolean> {
  if (isTestMode) {
    console.log("⚠️ Test mode - skipping signature verification");
    return true;
  }
  
  try {
    const message = `${razorpay_order_id}|${razorpay_payment_id}`;
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
    
    const signature = await crypto.subtle.sign("HMAC", key, messageData);
    const expectedSignature = arrayBufferToHex(signature);
    
    if (expectedSignature.length !== razorpay_signature.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < expectedSignature.length; i++) {
      result |= expectedSignature.charCodeAt(i) ^ razorpay_signature.charCodeAt(i);
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
    const { order_id, razorpay_payment_id, razorpay_order_id, razorpay_signature } = await req.json();
    
    console.log("Verifying payment:", { order_id, razorpay_payment_id, razorpay_order_id });

    if (!order_id) {
      throw new Error("Order ID is required");
    }

    if (!razorpay_payment_id || !razorpay_order_id) {
      throw new Error("Payment ID and Order ID are required");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const settings = await getSettings(supabase);
    const RAZORPAY_KEY_SECRET = settings['razorpay_key_secret'] || Deno.env.get('RAZORPAY_KEY_SECRET') || 'test_secret_key';
    const IS_TEST_MODE = settings['razorpay_test_mode'] === 'true' || !settings['razorpay_key_secret'];
    
    console.log("Using settings from database. Test mode:", IS_TEST_MODE);

    if (!IS_TEST_MODE && !razorpay_signature) {
      throw new Error("Payment signature is required for verification");
    }

    const isValidSignature = await verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature || '',
      RAZORPAY_KEY_SECRET,
      IS_TEST_MODE
    );

    if (!isValidSignature) {
      console.error("Invalid payment signature - potential fraud attempt");
      throw new Error("Invalid payment signature");
    }

    console.log("Signature verified successfully");
    
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

    console.log("Payment verified, order updated:", order.id, "Status:", order.status);

    // Fire-and-forget: trigger async delivery (emails, WhatsApp, Telegram)
    fetch(`${supabaseUrl}/functions/v1/process-order-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ order_id }),
    }).catch(err => console.error('Failed to trigger order delivery:', err));

    console.log("Payment verified, delivery triggered asynchronously for order:", order.id);

    return new Response(
      JSON.stringify({
        success: true,
        order_number: order.order_number,
        status: order.status,
        message: 'Payment verified! Download links will be sent shortly.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error("Error in verify-razorpay-payment:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
