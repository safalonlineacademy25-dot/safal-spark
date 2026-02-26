import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Allowed origins for CORS
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

// Helper function to get settings from database
async function getSettings(supabase: any): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('settings')
    .select('key, value');
  
  if (error) {
    console.error("Error fetching settings:", error);
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

interface WhatsAppDownloadRequest {
  email: string;
  phone?: string; // Optional override for testing
}

function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, "");
  
  // If starts with 0, assume India and add 91
  if (cleaned.startsWith("0")) {
    cleaned = "91" + cleaned.substring(1);
  }
  
  // If doesn't have country code, assume India
  if (cleaned.length === 10) {
    cleaned = "91" + cleaned;
  }
  
  return cleaned;
}

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, phone: phoneOverride }: WhatsAppDownloadRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Looking up order for email:", email);

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Find the most recent paid order for this email
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
    console.log("Customer phone:", order.customer_phone);

    const settings = await getSettings(supabase);
    
    // Get WhatsApp Cloud API credentials from settings (same as send-promotion)
    const whatsappToken = settings['whatsapp_access_token'] || '';
    const whatsappPhoneId = settings['whatsapp_phone_number_id'] || '';
    const whatsappEnabled = settings['whatsapp_enabled'] !== 'false';
    // Template name from WhatsApp settings
    const templateName = settings['whatsapp_template_name'] || '';
    
    console.log("WhatsApp enabled:", whatsappEnabled);
    console.log("WhatsApp Phone ID:", whatsappPhoneId ? whatsappPhoneId.substring(0, 6) + "..." : "NOT SET");
    console.log("Template name:", templateName);

    const formattedPhone = formatPhoneNumber(phoneOverride || order.customer_phone);
    console.log("Formatted phone:", formattedPhone, phoneOverride ? "(overridden)" : "(from order)");

    // Check if WhatsApp is disabled
    if (!whatsappEnabled) {
      console.log("⚠️ WhatsApp delivery is disabled in settings");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "WhatsApp delivery disabled",
          preview: { to: formattedPhone }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate WhatsApp Cloud API credentials
    if (!whatsappToken || !whatsappPhoneId) {
      console.error("❌ WhatsApp Cloud API credentials not configured");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "WhatsApp Cloud API credentials not configured in admin settings",
          hint: "Please set WhatsApp Access Token and Phone Number ID in Admin > WhatsApp Settings"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!templateName) {
      console.error("❌ WhatsApp template name not configured");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "WhatsApp template name not configured in admin settings",
          hint: "Please set the WhatsApp Template Name in Admin > WhatsApp Settings"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending template message:", templateName);

    // Send WhatsApp template message via WhatsApp Cloud API with retry logic
    let whatsappSuccess = false;
    let whatsappError: string | null = null;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries && !whatsappSuccess) {
      try {
        console.log(`WhatsApp Cloud API send attempt ${retryCount + 1}/${maxRetries + 1}`);
        
        // Build proper WhatsApp Cloud API template payload (same format as send-promotion)
        const templateMessage = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "template",
          template: {
            name: templateName,
            language: { code: "en" },
          }
        };

        console.log("Sending template via WhatsApp Cloud API:", JSON.stringify(templateMessage));

        const response = await fetch(
          `https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${whatsappToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(templateMessage),
          }
        );

        const result = await response.json();
        console.log("WhatsApp Cloud API response status:", response.status);
        console.log("WhatsApp Cloud API response body:", JSON.stringify(result));

        if (response.ok) {
          whatsappSuccess = true;
          console.log("✅ WhatsApp template message sent successfully");
        } else {
          whatsappError = result.error?.message || `HTTP ${response.status}: ${JSON.stringify(result)}`;
          console.error(`❌ WhatsApp Cloud API error: ${whatsappError}`);
          retryCount++;
          if (retryCount <= maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
          }
        }
      } catch (fetchError: any) {
        whatsappError = `Network error: ${fetchError.message}`;
        console.error(`❌ WhatsApp fetch error: ${whatsappError}`);
        retryCount++;
        if (retryCount <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    }

    // Update order delivery status based on WhatsApp result
    const deliveryStatus = whatsappSuccess ? "sent" : "failed";
    const deliveryAttempts = retryCount + 1;

    await supabase
      .from("orders")
      .update({ 
        delivery_status: deliveryStatus,
        delivery_attempts: deliveryAttempts
      })
      .eq("id", order.id);

    if (whatsappSuccess) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          orderId: order.id,
          orderNumber: order.order_number,
          whatsappDelivered: true,
           provider: "whatsapp-cloud-api"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      console.warn(`⚠️ WhatsApp delivery failed after ${deliveryAttempts} attempts: ${whatsappError}`);
      console.log("📧 Customer should have received email with download link.");
      
      return new Response(
        JSON.stringify({ 
          success: true,
          orderId: order.id,
          orderNumber: order.order_number,
          whatsappDelivered: false,
          whatsappError: whatsappError,
          provider: "whatsapp-cloud-api",
          fallbackMessage: "Email delivery is the primary channel. Customer can download from email."
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error: any) {
    console.error("❌ Critical error in send-whatsapp-download:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        suggestion: "Please check order status and retry if needed."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
