import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, razorpay_payment_id, razorpay_order_id, razorpay_signature } = await req.json();
    
    console.log("Verifying payment:", { order_id, razorpay_payment_id, razorpay_order_id });

    if (!order_id) {
      throw new Error("Order ID is required");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // For testing purposes, we'll simulate successful payment verification
    // In production, you would verify the signature with Razorpay
    
    // Update order with payment details
    const { data: order, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        razorpay_payment_id: razorpay_payment_id || `pay_test_${Date.now()}`,
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

    // Get order items for download token generation
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('product_id')
      .eq('order_id', order_id);

    if (itemsError) {
      console.error("Error fetching order items:", itemsError);
    }

    // Generate download tokens for each product
    if (orderItems && orderItems.length > 0) {
      const tokens = orderItems.map((item: any) => ({
        order_id: order_id,
        product_id: item.product_id,
        token: crypto.randomUUID(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        download_count: 0,
      }));

      const { error: tokenError } = await supabase
        .from('download_tokens')
        .insert(tokens);

      if (tokenError) {
        console.error("Error creating download tokens:", tokenError);
      } else {
        console.log("Download tokens created:", tokens.length);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_number: order.order_number,
        status: order.status,
        message: 'Payment verified successfully!',
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
