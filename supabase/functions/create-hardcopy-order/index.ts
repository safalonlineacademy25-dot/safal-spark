import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  'https://safalonlinesolutions.com',
  'https://hujuqkhbdptsdnbnkslo.supabase.co',
  'http://localhost:5173',
  'http://localhost:8080',
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(a =>
    origin === a || origin.endsWith('.lovable.app') || origin.endsWith('.lovableproject.com')
  ) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

async function getSettings(supabase: any): Promise<Record<string, string>> {
  const { data } = await supabase.from('settings').select('key, value');
  const out: Record<string, string> = {};
  (data || []).forEach((s: any) => { if (s.value) out[s.key] = s.value; });
  return out;
}

async function createRazorpayPaymentLink(
  keyId: string, keySecret: string, amountPaise: number, description: string,
  referenceId: string, email: string, phone: string, name: string | null,
  callbackUrl: string, internalOrderId: string
) {
  const auth = btoa(`${keyId}:${keySecret}`);
  const payload: any = {
    amount: amountPaise, currency: 'INR', accept_partial: false,
    description, reference_id: referenceId,
    customer: { email, contact: phone, ...(name ? { name } : {}) },
    notify: { sms: false, email: false }, reminder_enable: false,
    callback_url: callbackUrl, callback_method: 'get',
    notes: { internal_order_id: internalOrderId, order_type: 'hardcopy' },
    options: { checkout: { prefill: { method: 'upi' } } },
  };
  const res = await fetch('https://api.razorpay.com/v1/payment_links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${auth}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Razorpay API error: ${res.status} - ${await res.text()}`);
  const r = await res.json();
  return { id: r.id as string, short_url: r.short_url as string };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    const body = await req.json();
    const {
      product_id, customer_name, customer_email, customer_phone, whatsapp_optin,
      address_line1, address_line2, city, state, pincode, landmark,
      callback_origin,
    } = body;

    if (!product_id) throw new Error('Product is required');
    if (!customer_name || !customer_email || !customer_phone) throw new Error('Name, email and phone are required');
    if (!address_line1 || !city || !state || !pincode) throw new Error('Complete shipping address is required');

    const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
    const cleanPhone = String(customer_phone).trim().replace(/\s/g, '');
    if (!phoneRegex.test(cleanPhone)) throw new Error('Invalid phone number');

    if (!/^\d{6}$/.test(String(pincode).trim())) throw new Error('Invalid 6-digit pincode');

    // Rate limit
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { data: allowed } = await supabase.rpc('check_rate_limit', {
      _identifier: `${customer_email}:${ip}`, _endpoint: 'create-hardcopy-order',
      _max_requests: 5, _window_seconds: 60,
    });
    if (allowed === false) {
      return new Response(JSON.stringify({ success: false, error: 'Too many requests. Please wait.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 });
    }

    // Fetch product
    const { data: product, error: pErr } = await supabase
      .from('hard_copy_products').select('*').eq('id', product_id).single();
    if (pErr || !product) throw new Error('Book not found');
    if (!product.is_active) throw new Error('Book is not available');

    const totalAmount = Number(product.price);
    const amountPaise = Math.round(totalAmount * 100);

    // Razorpay creds
    const settings = await getSettings(supabase);
    const KEY_ID = settings['razorpay_key_id'] || Deno.env.get('RAZORPAY_KEY_ID') || '';
    const KEY_SECRET = settings['razorpay_key_secret'] || Deno.env.get('RAZORPAY_KEY_SECRET') || '';
    if (!KEY_ID || !KEY_SECRET) throw new Error('Payment gateway not configured');

    // Order number
    const { data: orderNumber } = await supabase.rpc('generate_order_number');

    // Insert order
    const { data: order, error: oErr } = await supabase
      .from('hard_copy_orders')
      .insert({
        order_number: orderNumber,
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        quantity: 1,
        total_amount: totalAmount,
        currency: 'INR',
        customer_name, customer_email, customer_phone: cleanPhone,
        whatsapp_optin: whatsapp_optin ?? true,
        address_line1, address_line2: address_line2 || null,
        city, state, pincode: String(pincode).trim(),
        landmark: landmark || null,
        status: 'pending',
        payment_status: 'pending',
      })
      .select().single();
    if (oErr) throw oErr;

    const baseUrl = callback_origin || origin || 'https://safalonlinesolutions.com';
    const callbackUrl = `${baseUrl}/book-order-success`;

    const link = await createRazorpayPaymentLink(
      KEY_ID, KEY_SECRET, amountPaise,
      `Book Order ${orderNumber} - ${product.name}`.slice(0, 250),
      orderNumber, customer_email, cleanPhone, customer_name, callbackUrl, order.id
    );

    await supabase.from('hard_copy_orders').update({ razorpay_order_id: link.id }).eq('id', order.id);

    return new Response(JSON.stringify({
      success: true,
      order_id: order.id, order_number: orderNumber,
      payment_url: link.short_url, payment_link_id: link.id,
      amount: amountPaise,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('create-hardcopy-order error:', e);
    return new Response(JSON.stringify({ success: false, error: e?.message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  }
});
