import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const url = new URL(req.url);
  const token = url.searchParams.get('token');

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
        .card { background: white; border-radius: 16px; padding: 40px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .icon { width: 64px; height: 64px; border-radius: 50%; background: ${color}20; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 32px; }
        h1 { color: #1a1a2e; font-size: 22px; margin-bottom: 10px; }
        p { color: #666; font-size: 15px; line-height: 1.6; }
        .details { background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: left; }
        .details div { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
        .details .label { color: #888; }
        .details .value { font-weight: 600; color: #333; }
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

  if (!token) {
    return htmlResponse('Invalid Link', `
      <div class="icon" style="background: #fee2e2;">⚠️</div>
      <h1>Invalid Link</h1>
      <p>This approval link is invalid or missing a token.</p>
    `, '#ef4444');
  }

  try {
    // Look up the token
    const { data: tokenData, error: tokenError } = await supabase
      .from('upi_approval_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return htmlResponse('Invalid Token', `
        <div class="icon" style="background: #fee2e2;">❌</div>
        <h1>Invalid or Expired Link</h1>
        <p>This approval link is invalid, expired, or has already been used.</p>
      `, '#ef4444');
    }

    // Check if already used
    if (tokenData.used) {
      return htmlResponse('Already Processed', `
        <div class="icon" style="background: #fef3c7;">⚡</div>
        <h1>Already Processed</h1>
        <p>This order has already been ${tokenData.action === 'approve' ? 'approved' : 'rejected'}. No further action needed.</p>
      `, '#f59e0b');
    }

    // Check if expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return htmlResponse('Link Expired', `
        <div class="icon" style="background: #fee2e2;">⏰</div>
        <h1>Link Expired</h1>
        <p>This approval link has expired (24-hour limit). Please use the admin dashboard to process this order.</p>
      `, '#ef4444');
    }

    // Get UPI order details
    const { data: upiOrder, error: orderError } = await supabase
      .from('upi_orders')
      .select('*')
      .eq('id', tokenData.upi_order_id)
      .single();

    if (orderError || !upiOrder) {
      return htmlResponse('Order Not Found', `
        <div class="icon" style="background: #fee2e2;">❌</div>
        <h1>Order Not Found</h1>
        <p>The UPI order associated with this link could not be found.</p>
      `, '#ef4444');
    }

    // Check if order already processed
    if (upiOrder.status !== 'pending') {
      // Mark token as used
      await supabase.from('upi_approval_tokens').update({ used: true }).eq('id', tokenData.id);
      return htmlResponse('Already Processed', `
        <div class="icon" style="background: #fef3c7;">⚡</div>
        <h1>Already Processed</h1>
        <p>This order has already been <strong>${upiOrder.status}</strong>. No further action needed.</p>
        <div class="details">
          <div><span class="label">Product</span><span class="value">${upiOrder.product_name}</span></div>
          <div><span class="label">Customer</span><span class="value">${upiOrder.customer_name || upiOrder.customer_email}</span></div>
          <div><span class="label">Amount</span><span class="value">₹${upiOrder.amount}</span></div>
        </div>
      `, '#f59e0b');
    }

    // Mark ALL tokens for this order as used
    await supabase
      .from('upi_approval_tokens')
      .update({ used: true })
      .eq('upi_order_id', tokenData.upi_order_id);

    if (tokenData.action === 'approve') {
      // Call approve-upi-order edge function
      const approveResponse = await fetch(`${supabaseUrl}/functions/v1/approve-upi-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ upi_order_id: tokenData.upi_order_id }),
      });

      const approveResult = await approveResponse.json();

      if (!approveResult.success) {
        throw new Error(approveResult.error || 'Failed to approve order');
      }

      return htmlResponse('Order Approved', `
        <div class="icon" style="background: #dcfce7;">✅</div>
        <h1>Order Approved!</h1>
        <p>The order has been approved and delivery has been triggered automatically.</p>
        <div class="details">
          <div><span class="label">Order #</span><span class="value">${approveResult.order_number}</span></div>
          <div><span class="label">Product</span><span class="value">${upiOrder.product_name}</span></div>
          <div><span class="label">Customer</span><span class="value">${upiOrder.customer_name || upiOrder.customer_email}</span></div>
          <div><span class="label">Amount</span><span class="value">₹${upiOrder.amount}</span></div>
          <div><span class="label">Txn ID</span><span class="value">${upiOrder.transaction_id || 'N/A'}</span></div>
        </div>
        <p style="margin-top: 15px; font-size: 13px; color: #16a34a;">📧 Download links will be sent to the customer shortly.</p>
      `, '#16a34a');

    } else {
      // Reject the order
      await supabase
        .from('upi_orders')
        .update({ status: 'rejected', admin_notes: 'Rejected via email approval link' })
        .eq('id', tokenData.upi_order_id);

      // Send Telegram notification
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-telegram-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            message: `❌ *UPI Order Rejected (via Email)*\n\n👤 ${upiOrder.customer_name || 'N/A'}\n📧 ${upiOrder.customer_email}\n📦 ${upiOrder.product_name}\n💰 ₹${upiOrder.amount}\n🔢 Txn ID: ${upiOrder.transaction_id || 'N/A'}`,
          }),
        });
      } catch (e) {
        console.error('Telegram notification error:', e);
      }

      return htmlResponse('Order Rejected', `
        <div class="icon" style="background: #fee2e2;">❌</div>
        <h1>Order Rejected</h1>
        <p>The UPI order has been rejected.</p>
        <div class="details">
          <div><span class="label">Product</span><span class="value">${upiOrder.product_name}</span></div>
          <div><span class="label">Customer</span><span class="value">${upiOrder.customer_name || upiOrder.customer_email}</span></div>
          <div><span class="label">Amount</span><span class="value">₹${upiOrder.amount}</span></div>
        </div>
      `, '#ef4444');
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in handle-upi-approval:', error);
    return htmlResponse('Error', `
      <div class="icon" style="background: #fee2e2;">⚠️</div>
      <h1>Something Went Wrong</h1>
      <p>${errorMessage}</p>
      <p style="margin-top: 10px; font-size: 13px;">Please try using the admin dashboard instead.</p>
    `, '#ef4444');
  }
});
