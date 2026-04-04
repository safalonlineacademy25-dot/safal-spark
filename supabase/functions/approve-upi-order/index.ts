import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { upi_order_id } = await req.json();

    if (!upi_order_id) {
      throw new Error('upi_order_id is required');
    }

    // Get UPI order details
    const { data: upiOrder, error: fetchError } = await supabase
      .from('upi_orders')
      .select('*')
      .eq('id', upi_order_id)
      .single();

    if (fetchError || !upiOrder) {
      throw new Error('UPI order not found');
    }

    if (upiOrder.status !== 'pending') {
      throw new Error(`Order already ${upiOrder.status}`);
    }

    // Generate order number
    const { data: orderNumber, error: orderNumError } = await supabase.rpc('generate_order_number');
    if (orderNumError) throw orderNumError;

    // Create a proper order in the orders table
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_email: upiOrder.customer_email,
        customer_phone: upiOrder.customer_phone,
        customer_name: upiOrder.customer_name || null,
        total_amount: upiOrder.amount,
        whatsapp_optin: upiOrder.whatsapp_optin || false,
        status: 'paid',
        currency: 'INR',
        razorpay_payment_id: `UPI-${upi_order_id.substring(0, 8)}`,
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Error creating order:', orderError);
      throw new Error('Failed to create order');
    }

    // Create order item
    const { error: itemError } = await supabase
      .from('order_items')
      .insert({
        order_id: order.id,
        product_id: upiOrder.product_id,
        product_name: upiOrder.product_name,
        product_price: upiOrder.product_price,
        quantity: 1,
      });

    if (itemError) {
      console.error('Error creating order item:', itemError);
      throw new Error('Failed to create order item');
    }

    // Mark UPI order as approved
    await supabase
      .from('upi_orders')
      .update({ status: 'approved', admin_notes: `Order ${orderNumber} created` })
      .eq('id', upi_order_id);

    // Trigger the delivery pipeline (same as regular orders)
    try {
      const functionUrl = `${supabaseUrl}/functions/v1/process-order-delivery`;
      fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ order_id: order.id }),
      }).catch(err => console.error('Delivery trigger error:', err));
    } catch (e) {
      console.error('Failed to trigger delivery:', e);
    }

    // Send Telegram notification
    try {
      const telegramUrl = `${supabaseUrl}/functions/v1/send-telegram-notification`;
      fetch(telegramUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          message: `✅ *UPI Order Approved*\n\n📋 Order: ${orderNumber}\n👤 ${upiOrder.customer_name || 'N/A'}\n📧 ${upiOrder.customer_email}\n📦 ${upiOrder.product_name}\n💰 ₹${upiOrder.amount}\n🔢 Txn ID: ${upiOrder.transaction_id || 'N/A'}\n\n📨 Delivery pipeline triggered`,
        }),
      }).catch(err => console.error('Telegram error:', err));
    } catch (e) {
      console.error('Telegram notification error:', e);
    }

    return new Response(
      JSON.stringify({ success: true, order_id: order.id, order_number: orderNumber }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in approve-upi-order:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
