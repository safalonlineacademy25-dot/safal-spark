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

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function getSettings(supabase: any): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('settings').select('key, value');
  if (error) {
    console.error('Error fetching settings:', error);
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

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  if (cleaned.startsWith('0')) cleaned = '91' + cleaned.slice(1);
  if (!cleaned.startsWith('91') && cleaned.length === 10) cleaned = '91' + cleaned;
  return cleaned;
}

function toTitleCase(name: string): string {
  return name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

async function sendTemplateMessage(params: {
  apiKey: string;
  phoneId: string;
  templateName: string;
  language: string;
  to: string;
  templateVariables: string[];
  fileUrl?: string;
}) {
  const waUrl = `https://app.wasimple.in/api/v1/whatsapp/sendMessage?phoneId=${encodeURIComponent(params.phoneId)}&apiKey=${encodeURIComponent(params.apiKey)}`;

  const waPayload: Record<string, unknown> = {
    templateName: params.templateName,
    language: params.language,
    to: params.to,
    templateVariables: params.templateVariables,
  };

  if (params.fileUrl) {
    waPayload.fileUrl = params.fileUrl;
  }

  const waResponse = await fetch(waUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
      'x-phone-id': params.phoneId,
    },
    body: JSON.stringify(waPayload),
  });

  const raw = await waResponse.text();
  let parsed: unknown = raw;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // keep raw text
  }

  return { ok: waResponse.ok, status: waResponse.status, result: parsed };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization required');
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) throw new Error('Invalid auth token');

    const { data: hasAccess } = await supabase.rpc('has_admin_access', { _user_id: user.id });
    if (!hasAccess) throw new Error('Admin access required');

    const body = await req.json();
    const { order_id } = body;
    if (!order_id) throw new Error('order_id is required');

    const settings = await getSettings(supabase);
    const whatsappEnabled = settings['whatsapp_enabled'] === 'true';
    const apiKey = settings['wasimple_api_key'];
    const phoneId = settings['wasimple_phone_id'];

    if (!whatsappEnabled || !apiKey || !phoneId) {
      throw new Error('WhatsApp is not configured. Please check WhatsApp settings.');
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderError || !order) throw new Error('Order not found');

    const customerName = toTitleCase(order.customer_name || order.customer_email.split('@')[0]);
    const customerPhone = formatPhoneNumber(order.customer_phone);

    const templateName = settings['whatsapp_payment_reminder_template'];
    if (!templateName) {
      throw new Error('Payment reminder template name not configured. Please set it in WhatsApp Settings.');
    }

    const language = settings['whatsapp_payment_reminder_language'] || settings['whatsapp_template_language'] || 'en';
    const mediaUrl = settings['whatsapp_payment_reminder_media_url'] || settings['whatsapp_download_media_url'] || '';

    console.log('Sending payment reminder WhatsApp template to:', customerPhone);
    console.log(
      'Reminder template payload config:',
      JSON.stringify({ templateName, language, hasMediaUrl: !!mediaUrl, variablesCount: 1 })
    );

    const sendResult = await sendTemplateMessage({
      apiKey,
      phoneId,
      templateName,
      language,
      to: customerPhone,
      templateVariables: [customerName],
      fileUrl: mediaUrl || undefined,
    });

    console.log('WaSimple response:', JSON.stringify(sendResult.result));

    if (!sendResult.ok) {
      throw new Error(`WhatsApp send failed (HTTP ${sendResult.status}): ${JSON.stringify(sendResult.result)}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Payment reminder sent to ${customerPhone}`,
        customer_name: customerName,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in send-payment-reminder:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
