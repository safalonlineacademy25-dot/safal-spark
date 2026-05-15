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

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function getSettings(supabase: any) {
  const { data } = await supabase.from('settings').select('key, value');
  const out: Record<string, string> = {};
  (data || []).forEach((s: any) => { if (s.value) out[s.key] = s.value; });
  return out;
}

function bufToHex(b: ArrayBuffer) {
  return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
}
async function verifySig(message: string, signature: string, secret: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  const expected = bufToHex(sig);
  if (expected.length !== signature.length) return false;
  let r = 0;
  for (let i = 0; i < expected.length; i++) r |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return r === 0;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const settings = await getSettings(supabase);
    const SECRET = settings['razorpay_key_secret'] || Deno.env.get('RAZORPAY_KEY_SECRET') || '';
    const TEST_MODE = settings['razorpay_test_mode'] === 'true';

    const {
      razorpay_payment_id, razorpay_payment_link_id,
      razorpay_payment_link_reference_id, razorpay_payment_link_status,
      razorpay_signature,
    } = body;

    if (!razorpay_payment_id || !razorpay_payment_link_id) {
      throw new Error('Missing payment identifiers');
    }

    if (!TEST_MODE && SECRET) {
      const msg = `${razorpay_payment_link_id}|${razorpay_payment_link_reference_id}|${razorpay_payment_link_status}|${razorpay_payment_id}`;
      const ok = await verifySig(msg, razorpay_signature || '', SECRET);
      if (!ok) throw new Error('Invalid payment signature');
    }

    // Find order
    let { data: order } = await supabase
      .from('hard_copy_orders').select('*')
      .eq('razorpay_order_id', razorpay_payment_link_id).maybeSingle();
    if (!order && razorpay_payment_link_reference_id) {
      const r = await supabase.from('hard_copy_orders').select('*')
        .eq('order_number', razorpay_payment_link_reference_id).maybeSingle();
      order = r.data;
    }
    if (!order) throw new Error('Hard copy order not found');

    if (order.payment_status === 'paid') {
      return new Response(JSON.stringify({
        success: true, already_processed: true,
        order_number: order.order_number,
        message: 'Payment already confirmed. Your book will be shipped soon.',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: updated, error: uErr } = await supabase
      .from('hard_copy_orders')
      .update({
        payment_status: 'paid', status: 'paid',
        razorpay_payment_id, razorpay_signature: razorpay_signature || 'payment_link',
      })
      .eq('id', order.id).select().single();
    if (uErr) throw uErr;

    // Fire-and-forget: notify admin via Telegram
    const telegramPayload = {
      type: 'hardcopy_order_paid',
      data: {
        order_number: updated.order_number,
        product_name: updated.product_name,
        amount: updated.total_amount,
        customer_name: updated.customer_name,
        customer_phone: updated.customer_phone,
        customer_email: updated.customer_email,
        address: `${updated.address_line1}${updated.address_line2 ? ', ' + updated.address_line2 : ''}, ${updated.city}, ${updated.state} - ${updated.pincode}`,
      },
    };
    fetch(`${supabaseUrl}/functions/v1/send-telegram-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
      body: JSON.stringify(telegramPayload),
    }).catch(err => console.error('Telegram notify failed:', err));

    return new Response(JSON.stringify({
      success: true,
      order_number: updated.order_number,
      message: 'Payment confirmed! Your book will be shipped to your address shortly.',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('verify-hardcopy-payment error:', e);
    return new Response(JSON.stringify({ success: false, error: e?.message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
});
