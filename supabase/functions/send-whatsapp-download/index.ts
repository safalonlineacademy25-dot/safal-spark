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
    
    // Get MatrixCloud WhatsApp API credentials from settings
    const matrixInstanceId = settings['matrix_instance_id'] || '';
    const matrixAccessToken = settings['matrix_access_token'] || '';
    const whatsappEnabled = settings['whatsapp_enabled'] !== 'false';
    // Template name from WhatsApp settings
    const templateName = settings['whatsapp_template_name'] || '';
    
    console.log("WhatsApp enabled:", whatsappEnabled);
    console.log("Matrix Instance ID:", matrixInstanceId ? matrixInstanceId.substring(0, 6) + "..." : "NOT SET");
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

    // Validate MatrixCloud credentials
    if (!matrixInstanceId || !matrixAccessToken) {
      console.error("❌ MatrixCloud credentials not configured");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "MatrixCloud WhatsApp credentials not configured in admin settings",
          hint: "Please set Matrix Instance ID and Access Token in Admin > WhatsApp Settings"
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

    console.log("Sending template message via MatrixCloud:", templateName);

    // Send WhatsApp message via MatrixCloud API with retry logic
    // NOTE: The exact template parameters may need adjustment per MatrixCloud team guidance
    let whatsappSuccess = false;
    let whatsappError: string | null = null;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries && !whatsappSuccess) {
      try {
        console.log(`MatrixCloud send attempt ${retryCount + 1}/${maxRetries + 1}`);
        
        // Build the MatrixCloud API URL for template message
        const matrixUrl = new URL('https://matrixcloudapi.com/api/send');
        matrixUrl.searchParams.set('number', formattedPhone);
        matrixUrl.searchParams.set('instance_id', matrixInstanceId);
        matrixUrl.searchParams.set('access_token', matrixAccessToken);
        matrixUrl.searchParams.set('type', 'template');
        matrixUrl.searchParams.set('template_name', templateName);
        matrixUrl.searchParams.set('message', templateName);

        console.log("MatrixCloud API URL:", matrixUrl.toString().replace(matrixAccessToken, '***'));

        const response = await fetch(matrixUrl.toString(), {
          method: "POST",
        });

        const resultText = await response.text();
        console.log("MatrixCloud API response status:", response.status);
        console.log("MatrixCloud API response body:", resultText);

        let result: any;
        try {
          result = JSON.parse(resultText);
        } catch {
          result = { raw: resultText };
        }

        if (response.ok && result.status !== 'error' && result.status !== false) {
          whatsappSuccess = true;
          console.log("✅ WhatsApp message sent successfully via MatrixCloud");
        } else {
          whatsappError = result.message || result.error || `HTTP ${response.status}: ${resultText}`;
          console.error(`❌ MatrixCloud error: ${whatsappError}`);
          retryCount++;
          if (retryCount <= maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
          }
        }
      } catch (fetchError: any) {
        whatsappError = `Network error: ${fetchError.message}`;
        console.error(`❌ MatrixCloud fetch error: ${whatsappError}`);
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
           provider: "matrixcloud"
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
          provider: "matrixcloud",
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
