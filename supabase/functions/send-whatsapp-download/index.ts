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

interface WhatsAppDownloadRequest {
  email: string;
  phone?: string;
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

async function sendWaSimpleMessage(apiKey: string, phoneId: string, to: string, message: string): Promise<{ success: boolean; error?: string }> {
  const url = `https://app.wasimple.in/api/v1/whatsapp/sendMessage?phoneId=${encodeURIComponent(phoneId)}&apiKey=${encodeURIComponent(apiKey)}`;
  const chatId = to.includes('@') ? to : `${to}@s.whatsapp.net`;
  
  console.log("WaSimple request body:", JSON.stringify({ to: chatId, message: message.substring(0, 50) + "..." }));
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: chatId, message }),
  });

  const result = await response.json();
  console.log("WaSimple API response:", response.status, JSON.stringify(result));

  if (response.ok && !result.error) {
    return { success: true };
  }
  return { success: false, error: result.error?.message || result.message || `HTTP ${response.status}` };
}

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const settings = await getSettings(supabase);
    
    const wasimpleApiKey = settings['wasimple_api_key'] || '';
    const wasimplePhoneId = settings['wasimple_phone_id'] || '';

    const { email, phone: phoneOverride }: WhatsAppDownloadRequest = body;

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Looking up order for email:", email);
    
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_phone,
        customer_name,
        customer_email,
        status,
        order_items (
          product_id,
          product_name
        )
      `)
      .eq('customer_email', email)
      .in('status', ['paid', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (orderError || !order) {
      console.error("Order lookup error:", orderError);
      return new Response(
        JSON.stringify({ success: false, error: "No paid order found for this email" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Found order:", order.order_number);

    const whatsappEnabled = settings['whatsapp_enabled'] !== 'false';
    
    console.log("WhatsApp enabled:", whatsappEnabled);
    console.log("WaSimple Phone ID:", wasimplePhoneId ? wasimplePhoneId.substring(0, 6) + "..." : "NOT SET");

    const formattedPhone = formatPhoneNumber(phoneOverride || order.customer_phone);
    console.log("Formatted phone:", formattedPhone, phoneOverride ? "(overridden)" : "(from order)");

    if (!whatsappEnabled) {
      console.log("⚠️ WhatsApp delivery is disabled in settings");
      return new Response(
        JSON.stringify({ success: true, message: "WhatsApp delivery disabled", preview: { to: formattedPhone } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!wasimpleApiKey || !wasimplePhoneId) {
      console.error("❌ WaSimple API credentials not configured");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "WaSimple API credentials not configured in admin settings",
          hint: "Please set WaSimple API Key and Phone ID in Admin > WhatsApp Settings"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerName = order.customer_name ? toTitleCase(order.customer_name) : 'Customer';

    // Build plain text message
    const message = `Dear ${customerName},\n\nThank you for choosing Safal Online Academy!\n\nYour purchased product links have been successfully sent to your registered email address: ${order.customer_email}\n\nPlease check your inbox (and spam/junk folder) for the download links. If you face any issues, feel free to reach out to us at support@safalonlinesolutions.com.\n\nWarm regards,\nTeam Safal Online Academy`;

    console.log("Sending WhatsApp message via WaSimple to:", formattedPhone);

    let whatsappSuccess = false;
    let whatsappError: string | null = null;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries && !whatsappSuccess) {
      try {
        console.log(`WaSimple send attempt ${retryCount + 1}/${maxRetries + 1}`);
        const result = await sendWaSimpleMessage(wasimpleApiKey, wasimplePhoneId, formattedPhone, message);
        
        if (result.success) {
          whatsappSuccess = true;
          console.log("✅ WhatsApp download notification sent successfully via WaSimple");
        } else {
          whatsappError = result.error || 'Unknown error';
          console.error(`❌ WaSimple error: ${whatsappError}`);
          retryCount++;
          if (retryCount <= maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
          }
        }
      } catch (fetchError: any) {
        whatsappError = `Network error: ${fetchError.message}`;
        console.error(`❌ WaSimple fetch error: ${whatsappError}`);
        retryCount++;
        if (retryCount <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    }

    // Update order delivery status
    const deliveryStatus = whatsappSuccess ? "sent" : "failed";
    await supabase
      .from("orders")
      .update({ delivery_status: deliveryStatus, delivery_attempts: retryCount + 1 })
      .eq("id", order.id);

    if (whatsappSuccess) {
      return new Response(
        JSON.stringify({ 
          success: true, orderId: order.id, orderNumber: order.order_number,
          whatsappDelivered: true, provider: "wasimple", messageType: "text"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      console.warn(`⚠️ WhatsApp delivery failed after ${retryCount + 1} attempts: ${whatsappError}`);
      return new Response(
        JSON.stringify({ 
          success: true, orderId: order.id, orderNumber: order.order_number,
          whatsappDelivered: false, whatsappError, provider: "wasimple",
          fallbackMessage: "Email delivery is the primary channel. Customer can download from email."
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error: any) {
    console.error("❌ Critical error in send-whatsapp-download:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message, suggestion: "Please check order status and retry if needed." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
