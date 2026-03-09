import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

async function getSettings(supabase: any): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('settings').select('key, value');
  if (error) { console.error("Error fetching settings:", error); return {}; }
  const settings: Record<string, string> = {};
  if (data) data.forEach((s: { key: string; value: string | null }) => { if (s.value) settings[s.key] = s.value; });
  return settings;
}

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) cleaned = "91" + cleaned.substring(1);
  if (cleaned.length === 10) cleaned = "91" + cleaned;
  return cleaned;
}

function toTitleCase(name: string): string {
  return name.trim().toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { product_id, customer_name, customer_email, customer_phone, callback_origin } = await req.json();

    console.log("WhatsApp order request:", { product_id, customer_email, customer_phone });

    if (!product_id || !customer_email || !customer_phone || !customer_name) {
      throw new Error("Product ID, customer name, email, and phone are required");
    }

    // Rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimitId = `${customer_email}:${clientIP}`;
    const { data: isAllowed } = await supabase.rpc('check_rate_limit', {
      _identifier: rateLimitId, _endpoint: 'create-whatsapp-order', _max_requests: 5, _window_seconds: 60
    });
    if (isAllowed === false) {
      return new Response(JSON.stringify({ success: false, error: "Too many requests. Please wait." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429
      });
    }

    // Fetch product
    const { data: product, error: prodError } = await supabase
      .from('products')
      .select('id, name, price, category, description')
      .eq('id', product_id)
      .eq('is_active', true)
      .single();

    if (prodError || !product) {
      throw new Error("Product not found or inactive");
    }

    // Get settings
    const settings = await getSettings(supabase);
    const RAZORPAY_KEY_ID = settings['razorpay_key_id'] || Deno.env.get('RAZORPAY_KEY_ID') || "";
    const RAZORPAY_KEY_SECRET = settings['razorpay_key_secret'] || Deno.env.get('RAZORPAY_KEY_SECRET') || "";
    const wasimpleApiKey = settings['wasimple_api_key'] || '';
    const wasimplePhoneId = settings['wasimple_phone_id'] || '';
    const whatsappEnabled = settings['whatsapp_enabled'] !== 'false';

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error("Payment gateway not configured.");
    }

    // Generate order number
    const { data: orderNumber, error: onError } = await supabase.rpc('generate_order_number');
    if (onError) throw onError;

    // Create order
    const { data: order, error: orderError } = await supabase.from('orders').insert({
      order_number: orderNumber,
      customer_email,
      customer_phone,
      customer_name: customer_name || null,
      total_amount: product.price,
      whatsapp_optin: true,
      status: 'pending',
      currency: 'INR',
    }).select().single();

    if (orderError || !order) throw orderError || new Error("Failed to create order");

    // Create order item
    await supabase.from('order_items').insert({
      order_id: order.id,
      product_id: product.id,
      product_name: product.name,
      product_price: product.price,
      quantity: 1,
    });

    // Create Razorpay Payment Link
    const amountInPaise = Math.round(product.price * 100);
    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const baseUrl = callback_origin || origin || 'https://safalonlinesolutions.com';
    const callbackUrl = `${baseUrl}/order-success`;

    const payload: any = {
      amount: amountInPaise,
      currency: 'INR',
      accept_partial: false,
      description: `Order ${orderNumber} - ${product.name}`.substring(0, 200),
      reference_id: orderNumber,
      customer: { email: customer_email, contact: customer_phone, name: customer_name },
      notify: { sms: false, email: false },
      reminder_enable: false,
      callback_url: callbackUrl,
      callback_method: "get",
      notes: { internal_order_id: order.id, channel: "whatsapp" },
    };

    const rpResponse = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${auth}` },
      body: JSON.stringify(payload),
    });

    if (!rpResponse.ok) {
      const errorText = await rpResponse.text();
      throw new Error(`Razorpay API error: ${rpResponse.status} - ${errorText}`);
    }

    const paymentLink = await rpResponse.json();

    // Store payment link ID
    await supabase.from('orders').update({ razorpay_order_id: paymentLink.id }).eq('id', order.id);

    console.log("Payment link created:", paymentLink.short_url);

    // Send payment link via WaSimple
    let whatsappSent = false;
    if (whatsappEnabled && wasimpleApiKey && wasimplePhoneId) {
      const formattedPhone = formatPhoneNumber(customer_phone);
      const message = `Dear ${toTitleCase(customer_name)},\n\nThank you for your interest in ${product.name}!\n\nYour order ${orderNumber} has been created. Please complete the payment using the link below:\n\n🔗 Payment Link: ${paymentLink.short_url}\n\n💰 Amount: ₹${product.price}\n\nThis is a secure Razorpay payment link. You can pay using UPI, Cards, or Net Banking.\n\nIf you have any questions, feel free to reach out to us at support@safalonlinesolutions.com.\n\nWarm regards,\nTeam Safal Online Academy`;

      let retryCount = 0;
      while (retryCount <= 2 && !whatsappSent) {
        try {
          const url = `https://app.wasimple.in/api/v1/whatsapp/sendMessage?phoneId=${encodeURIComponent(wasimplePhoneId)}&apiKey=${encodeURIComponent(wasimpleApiKey)}`;

          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ to: `${formattedPhone}@s.whatsapp.net`, message }),
          });

          const result = await response.json();

          if (response.ok && !result.error) {
            whatsappSent = true;
            console.log("✅ WhatsApp payment link sent via WaSimple");
          } else {
            console.error(`❌ WaSimple send error:`, result.error?.message || result.message || JSON.stringify(result));
            retryCount++;
            if (retryCount <= 2) await new Promise(r => setTimeout(r, 2000 * retryCount));
          }
        } catch (e: any) {
          console.error(`❌ WaSimple fetch error: ${e.message}`);
          retryCount++;
          if (retryCount <= 2) await new Promise(r => setTimeout(r, 1000 * retryCount));
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      order_id: order.id,
      order_number: orderNumber,
      payment_url: paymentLink.short_url,
      whatsapp_sent: whatsappSent,
      product_name: product.name,
      amount: product.price,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in create-whatsapp-order:", error);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
    });
  }
});
