import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const wantsHtmlResponse = (req: Request) =>
  req.method === 'GET' || (req.headers.get('accept') ?? '').includes('text/html');

const htmlResponse = (title: string, message: string, color: string) => {
  return new Response(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${title} - Safal Spark</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f0f2f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
        .card { background: white; border-radius: 16px; padding: 40px; max-width: 520px; width: 100%; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .icon { width: 64px; height: 64px; border-radius: 50%; background: ${color}20; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 32px; }
        h1 { color: #1a1a2e; font-size: 22px; margin-bottom: 10px; }
        p { color: #666; font-size: 15px; line-height: 1.6; }
        .details { background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: left; }
        .details div { display: flex; justify-content: space-between; gap: 16px; padding: 6px 0; font-size: 14px; }
        .details .label { color: #888; }
        .details .value { font-weight: 600; color: #333; text-align: right; word-break: break-word; }
      </style>
    </head>
    <body>
      <div class="card">
        ${message}
      </div>
    </body>
    </html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const shouldReturnHtml = wantsHtmlResponse(req);

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (req.method === 'GET' && token) {
      return Response.redirect(`${supabaseUrl}/functions/v1/handle-upi-approval?token=${encodeURIComponent(token)}`, 302);
    }

    let upi_order_id: string | null = null;

    if (req.method === 'GET') {
      upi_order_id = url.searchParams.get('upi_order_id');
    } else {
      const body = await req.json().catch(() => null);
      upi_order_id = body?.upi_order_id ?? null;
    }

    if (!upi_order_id) {
      if (shouldReturnHtml) {
        return htmlResponse('Invalid Link', `
          <div class="icon" style="background: #fee2e2;">⚠️</div>
          <h1>Invalid Approval Link</h1>
          <p>This approval link is missing the order details. Please use the latest approval email or the admin dashboard.</p>
        `, '#ef4444');
      }

      throw new Error('upi_order_id is required');
    }

    // Get UPI order details
    const { data: upiOrder, error: fetchError } = await supabase
      .from('upi_orders')
      .select('*')
      .eq('id', upi_order_id)
      .single();

    if (fetchError || !upiOrder) {
      if (shouldReturnHtml) {
        return htmlResponse('Order Not Found', `
          <div class="icon" style="background: #fee2e2;">❌</div>
          <h1>Order Not Found</h1>
          <p>The UPI order linked to this approval request could not be found.</p>
        `, '#ef4444');
      }

      throw new Error('UPI order not found');
    }

    if (upiOrder.status !== 'pending') {
      if (shouldReturnHtml) {
        return htmlResponse('Already Processed', `
          <div class="icon" style="background: #fef3c7;">⚡</div>
          <h1>Already Processed</h1>
          <p>This order has already been <strong>${upiOrder.status}</strong>. No further action is needed.</p>
          <div class="details">
            <div><span class="label">Product</span><span class="value">${upiOrder.product_name}</span></div>
            <div><span class="label">Customer</span><span class="value">${upiOrder.customer_name || upiOrder.customer_email}</span></div>
            <div><span class="label">Amount</span><span class="value">₹${upiOrder.amount}</span></div>
          </div>
        `, '#f59e0b');
      }

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
          type: 'upi_order_approved',
          data: {
            order_number: orderNumber,
            customer_name: upiOrder.customer_name,
            customer_email: upiOrder.customer_email,
            product_name: upiOrder.product_name,
            amount: upiOrder.amount,
            transaction_id: upiOrder.transaction_id,
          },
        }),
      }).catch(err => console.error('Telegram error:', err));
    } catch (e) {
      console.error('Telegram notification error:', e);
    }

    if (shouldReturnHtml) {
      return htmlResponse('Order Approved', `
        <div class="icon" style="background: #dcfce7;">✅</div>
        <h1>Order Approved Successfully</h1>
        <p>The UPI payment has been approved and the customer delivery process has started.</p>
        <div class="details">
          <div><span class="label">Order #</span><span class="value">${orderNumber}</span></div>
          <div><span class="label">Product</span><span class="value">${upiOrder.product_name}</span></div>
          <div><span class="label">Customer</span><span class="value">${upiOrder.customer_name || upiOrder.customer_email}</span></div>
          <div><span class="label">Amount</span><span class="value">₹${upiOrder.amount}</span></div>
          <div><span class="label">Txn ID</span><span class="value">${upiOrder.transaction_id || 'N/A'}</span></div>
        </div>
        <p style="margin-top: 15px; font-size: 13px; color: #16a34a;">📧 Download links will be sent to the customer automatically.</p>
      `, '#16a34a');
    }

    return new Response(
      JSON.stringify({ success: true, order_id: order.id, order_number: orderNumber }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in approve-upi-order:', error);

    if (shouldReturnHtml) {
      return htmlResponse('Error', `
        <div class="icon" style="background: #fee2e2;">⚠️</div>
        <h1>Something Went Wrong</h1>
        <p>${errorMessage}</p>
        <p style="margin-top: 10px; font-size: 13px;">Please try again from the latest email or use the admin dashboard.</p>
      `, '#ef4444');
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
