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

function formatPhone(phone: string) {
  let c = phone.replace(/\D/g, '');
  if (c.startsWith('0')) c = '91' + c.substring(1);
  if (c.length === 10) c = '91' + c;
  return c;
}

async function sendWaSimpleTemplate(
  apiKey: string, phoneId: string, to: string, templateName: string, variables: string[]
) {
  const url = `https://app.wasimple.in/api/v1/whatsapp/sendMessage?phoneId=${encodeURIComponent(phoneId)}&apiKey=${encodeURIComponent(apiKey)}`;
  const body = { templateName, language: 'en', to, templateVariables: variables };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json', 'x-phone-id': phoneId },
    body: JSON.stringify(body),
  });
  const r = await res.json().catch(() => ({}));
  if (res.ok && !r.error) return { success: true };
  return { success: false, error: r?.error?.message || r?.message || `HTTP ${res.status}` };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.replace('Bearer ', '');
    if (!token) throw new Error('Unauthorized');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Verify admin
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) throw new Error('Unauthorized');
    const { data: hasAccess } = await supabase.rpc('has_admin_access', { _user_id: userData.user.id });
    if (!hasAccess) throw new Error('Admin access required');

    const { order_id, courier_name, tracking_id, admin_notes } = await req.json();
    if (!order_id || !courier_name || !tracking_id) {
      throw new Error('order_id, courier_name and tracking_id are required');
    }

    const { data: order, error: oErr } = await supabase
      .from('hard_copy_orders').select('*').eq('id', order_id).single();
    if (oErr || !order) throw new Error('Order not found');

    const { data: updated, error: uErr } = await supabase
      .from('hard_copy_orders')
      .update({
        status: 'shipped',
        courier_name, tracking_id,
        shipped_at: new Date().toISOString(),
        admin_notes: admin_notes || order.admin_notes,
      })
      .eq('id', order.id).select().single();
    if (uErr) throw uErr;

    // WhatsApp notify customer (best-effort)
    let whatsappSent = false;
    let whatsappError: string | null = null;
    if (updated.whatsapp_optin) {
      const settings = await getSettings(supabase);
      const apiKey = settings['wasimple_api_key'] || '';
      const phoneId = settings['wasimple_phone_id'] || '';
      const templateName = settings['whatsapp_hardcopy_shipped_template'] || '';
      if (apiKey && phoneId && templateName) {
        const r = await sendWaSimpleTemplate(
          apiKey, phoneId, formatPhone(updated.customer_phone),
          templateName,
          [updated.customer_name || 'Customer', updated.product_name, courier_name, tracking_id]
        );
        whatsappSent = r.success;
        whatsappError = r.error || null;
        if (!r.success) console.warn('WA shipped notify failed:', r.error);
      } else {
        whatsappError = 'WhatsApp template not configured (whatsapp_hardcopy_shipped_template)';
      }
    }

    // Telegram notify admin
    fetch(`${supabaseUrl}/functions/v1/send-telegram-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseServiceKey}` },
      body: JSON.stringify({
        type: 'hardcopy_order_shipped',
        data: {
          order_number: updated.order_number,
          product_name: updated.product_name,
          customer_name: updated.customer_name,
          courier_name, tracking_id,
        },
      }),
    }).catch(err => console.error('Telegram notify failed:', err));

    return new Response(JSON.stringify({
      success: true, order_number: updated.order_number, whatsappSent, whatsappError,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('ship-hardcopy-order error:', e);
    return new Response(JSON.stringify({ success: false, error: e?.message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
});
