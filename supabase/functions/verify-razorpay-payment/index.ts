import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://lovable.dev',
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

// Get Razorpay credentials from environment
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') || 'test_secret_key';
const IS_TEST_MODE = !Deno.env.get('RAZORPAY_KEY_SECRET');

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
  secret: string
): Promise<boolean> {
  // In test mode, accept test signatures
  if (IS_TEST_MODE) {
    console.log("⚠️ Test mode - skipping signature verification");
    return true;
  }
  
  try {
    // Create the expected signature using HMAC SHA256
    const message = `${razorpay_order_id}|${razorpay_payment_id}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(message);
    
    // Import key for HMAC
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    // Sign the message
    const signature = await crypto.subtle.sign("HMAC", key, messageData);
    const expectedSignature = arrayBufferToHex(signature);
    
    // Compare signatures using timing-safe comparison
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

// Helper function to send download email
async function sendDownloadEmail(
  orderId: string,
  customerEmail: string,
  customerName: string | null,
  products: Array<{ name: string; downloadToken: string }>
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("Sending download email to:", customerEmail);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/send-download-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        orderId,
        customerEmail,
        customerName,
        products,
      }),
    });

    const result = await response.json();
    console.log("Email delivery result:", result);
    return { success: result.success, error: result.error };
  } catch (error: any) {
    console.error("Error calling send-download-email:", error);
    return { success: false, error: error.message };
  }
}

// Helper function to send WhatsApp download
async function sendWhatsAppDownload(
  orderId: string,
  customerPhone: string,
  customerName: string | null,
  products: Array<{ name: string; downloadToken: string }>,
  whatsappOptin: boolean
): Promise<{ success: boolean; error?: string }> {
  // Only send if customer opted in
  if (!whatsappOptin) {
    console.log("Customer did not opt-in for WhatsApp, skipping");
    return { success: true, error: "Skipped - no opt-in" };
  }

  try {
    console.log("Sending WhatsApp download to:", customerPhone);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        orderId,
        customerPhone,
        customerName,
        products,
      }),
    });

    const result = await response.json();
    console.log("WhatsApp delivery result:", result);
    return { success: result.success, error: result.error };
  } catch (error: any) {
    console.error("Error calling send-whatsapp-download:", error);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, razorpay_payment_id, razorpay_order_id, razorpay_signature } = await req.json();
    
    console.log("Verifying payment:", { order_id, razorpay_payment_id, razorpay_order_id });

    // Validate required fields
    if (!order_id) {
      throw new Error("Order ID is required");
    }

    if (!razorpay_payment_id || !razorpay_order_id) {
      throw new Error("Payment ID and Order ID are required");
    }

    // Verify Razorpay signature (critical security check)
    if (!IS_TEST_MODE && !razorpay_signature) {
      throw new Error("Payment signature is required for verification");
    }

    const isValidSignature = await verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature || '',
      RAZORPAY_KEY_SECRET
    );

    if (!isValidSignature) {
      console.error("Invalid payment signature - potential fraud attempt");
      throw new Error("Invalid payment signature");
    }

    console.log("Signature verified successfully");

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Update order with payment details
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

    // Get order items with product names for download token generation
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('product_id, product_name')
      .eq('order_id', order_id);

    if (itemsError) {
      console.error("Error fetching order items:", itemsError);
    }

    // Generate download tokens for each product
    const productDownloads: Array<{ name: string; downloadToken: string }> = [];
    
    if (orderItems && orderItems.length > 0) {
      const tokens = orderItems.map((item: any) => {
        const token = crypto.randomUUID();
        productDownloads.push({
          name: item.product_name,
          downloadToken: token,
        });
        return {
          order_id: order_id,
          product_id: item.product_id,
          token: token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          download_count: 0,
        };
      });

      const { error: tokenError } = await supabase
        .from('download_tokens')
        .insert(tokens);

      if (tokenError) {
        console.error("Error creating download tokens:", tokenError);
      } else {
        console.log("Download tokens created:", tokens.length);
      }
    }

    // Send download links via email and WhatsApp
    let deliveryStatus = 'pending';
    const deliveryResults: { email?: any; whatsapp?: any } = {};

    if (productDownloads.length > 0) {
      // Send email (always attempt)
      const emailResult = await sendDownloadEmail(
        order_id,
        order.customer_email,
        order.customer_name,
        productDownloads
      );
      deliveryResults.email = emailResult;

      // Send WhatsApp (only if opted in)
      const whatsappResult = await sendWhatsAppDownload(
        order_id,
        order.customer_phone,
        order.customer_name,
        productDownloads,
        order.whatsapp_optin || false
      );
      deliveryResults.whatsapp = whatsappResult;

      // Determine overall delivery status (must be: pending, sent, failed)
      if (emailResult.success || (order.whatsapp_optin && whatsappResult.success)) {
        deliveryStatus = 'sent';
      } else {
        deliveryStatus = 'failed';
      }

      // Update order delivery status
      const { error: deliveryUpdateError } = await supabase
        .from('orders')
        .update({ 
          delivery_status: deliveryStatus,
          delivery_attempts: 1,
        })
        .eq('id', order_id);

      if (deliveryUpdateError) {
        console.error("Error updating delivery status:", deliveryUpdateError);
      }
    }

    console.log("Delivery status:", deliveryStatus, "Results:", deliveryResults);

    return new Response(
      JSON.stringify({
        success: true,
        order_number: order.order_number,
        status: order.status,
        delivery_status: deliveryStatus,
        delivery_results: deliveryResults,
        message: 'Payment verified and download links sent!',
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
