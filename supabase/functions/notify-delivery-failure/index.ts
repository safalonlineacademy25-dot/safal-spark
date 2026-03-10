import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

interface NotifyRequest {
  order_id: string;
  error_reason?: string;
}

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id }: NotifyRequest = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ success: false, error: "order_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const settings = await getSettings(supabase);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, customer_phone, customer_name, customer_email, total_amount')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ success: false, error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const wasimpleApiKey = settings['wasimple_api_key'] || '';
    const wasimplePhoneId = settings['wasimple_phone_id'] || '';
    const whatsappEnabled = settings['whatsapp_enabled'] !== 'false';
    const templateName = settings['whatsapp_failure_template_name'] || '';

    if (!whatsappEnabled || !wasimpleApiKey || !wasimplePhoneId) {
      return new Response(
        JSON.stringify({ success: false, error: "WhatsApp not configured or disabled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!templateName) {
      return new Response(
        JSON.stringify({ success: false, error: "WhatsApp failure template name not configured in admin settings" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formattedPhone = formatPhoneNumber(order.customer_phone);
    const customerName = order.customer_name ? toTitleCase(order.customer_name) : 'Customer';

    console.log("Sending delivery failure notification via WaSimple template to:", formattedPhone);

    const url = `https://app.wasimple.in/api/v1/whatsapp/sendMessage?phoneId=${encodeURIComponent(wasimplePhoneId)}&apiKey=${encodeURIComponent(wasimpleApiKey)}`;

    const templateBody = {
      templateName: templateName,
      language: "en",
      to: formattedPhone,
      templateVariables: [customerName, order.customer_email],
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "accept": "application/json",
        "x-phone-id": wasimplePhoneId,
      },
      body: JSON.stringify(templateBody),
    });

    const result = await response.json();
    console.log("WaSimple API response:", response.status, JSON.stringify(result));

    if (response.ok && !result.error) {
      console.log("✅ Delivery failure WhatsApp template sent via WaSimple");
      return new Response(
        JSON.stringify({ success: true, message: "Customer notified via WhatsApp template" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const errMsg = result.error?.message || result.message || `HTTP ${response.status}`;
      console.error("❌ WaSimple notify failed:", errMsg);
      return new Response(
        JSON.stringify({ success: false, error: errMsg }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error: any) {
    console.error("❌ Critical error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
