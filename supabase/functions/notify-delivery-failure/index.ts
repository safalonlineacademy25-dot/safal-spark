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
    const { order_id, error_reason }: NotifyRequest = await req.json();

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

    const whatsappToken = settings['whatsapp_access_token'] || '';
    const whatsappPhoneId = settings['whatsapp_phone_number_id'] || '';
    const whatsappEnabled = settings['whatsapp_enabled'] !== 'false';

    if (!whatsappEnabled || !whatsappToken || !whatsappPhoneId) {
      return new Response(
        JSON.stringify({ success: false, error: "WhatsApp not configured or disabled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formattedPhone = formatPhoneNumber(order.customer_phone);

    const reasonText = error_reason ? `\n\n*Reason:* ${error_reason}` : '';

    const notifyMessage = `Dear ${order.customer_name || 'Customer'},\n\nThis is regarding your order *${order.order_number}* from *Safal Online Academy*.\n\nWe were unable to deliver the product download links to your email address: *${order.customer_email}*${reasonText}\n\nPlease verify your email address and reply to this message with the correct email ID. We will resend the download links promptly.\n\nAlternatively, if you wish to request a refund, please let us know.\n\nFor any queries, reach us at support@safalonlinesolutions.com\n\nWarm regards,\nTeam Safal Online Academy`;

    console.log("Sending delivery failure notification via WhatsApp Cloud API to:", formattedPhone);

    // Send plain text message via WhatsApp Cloud API
    const messagePayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedPhone,
      type: "text",
      text: { body: notifyMessage }
    };

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${whatsappToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messagePayload),
      }
    );

    const result = await response.json();
    console.log("WhatsApp Cloud API response:", response.status, JSON.stringify(result));

    if (response.ok && result.messages?.length > 0) {
      console.log("✅ Delivery failure WhatsApp notification sent");
      return new Response(
        JSON.stringify({ success: true, message: "Customer notified via WhatsApp" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const errMsg = result.error?.message || `HTTP ${response.status}`;
      console.error("❌ WhatsApp notify failed:", errMsg);
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
