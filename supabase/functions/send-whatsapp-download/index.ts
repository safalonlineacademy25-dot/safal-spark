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
  orderId: string;
  customerPhone: string;
  customerName?: string;
  products: Array<{
    name: string;
    downloadToken: string;
  }>;
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
    const { orderId, customerPhone, customerName, products }: WhatsAppDownloadRequest = await req.json();

    console.log("Sending WhatsApp download to:", customerPhone);
    console.log("Order ID:", orderId);
    console.log("Products:", products);

    // Create Supabase client and get settings
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const settings = await getSettings(supabase);
    
    // Get WhatsApp credentials from database, fallback to env, then to test values
    const whatsappToken = settings['whatsapp_access_token'] || Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "dummy_whatsapp_token_123";
    const whatsappPhoneId = settings['whatsapp_phone_number_id'] || Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "dummy_phone_id";
    const whatsappEnabled = settings['whatsapp_enabled'] !== 'false';
    // Template name - must be registered and approved in Meta Business Manager
    const templateName = settings['whatsapp_template_name'] || "soa_download_ready";
    
    console.log("WhatsApp enabled:", whatsappEnabled, "Phone ID:", whatsappPhoneId.substring(0, 5) + "...");
    console.log("Using template:", templateName);

    const formattedPhone = formatPhoneNumber(customerPhone);
    console.log("Formatted phone:", formattedPhone);

    // Generate download links
    const baseUrl = "https://hujuqkhbdptsdnbnkslo.supabase.co/functions/v1/download-file";
    const downloadLinks = products.map(p => ({
      name: p.name,
      url: `${baseUrl}?token=${p.downloadToken}`
    }));

    // Build product list for template (max 3 products shown, rest summarized)
    const productNames = products.map(p => p.name);
    const productsDisplay = productNames.length <= 3 
      ? productNames.join(", ")
      : `${productNames.slice(0, 2).join(", ")} and ${productNames.length - 2} more`;
    
    // First download link (primary CTA)
    const primaryDownloadUrl = downloadLinks[0]?.url || "";

    // Check if WhatsApp is disabled
    if (!whatsappEnabled) {
      console.log("⚠️ WhatsApp delivery is disabled in settings");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "WhatsApp delivery disabled",
          preview: { to: formattedPhone, downloadLinks }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if using dummy token (for testing)
    if (whatsappToken.includes("dummy") || whatsappToken.includes("test")) {
      console.log("⚠️ Using dummy token - WhatsApp not actually sent");
      console.log("Template would be sent to:", formattedPhone);
      console.log("Template parameters:", { customerName, productsDisplay, orderId, primaryDownloadUrl });
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Test mode - WhatsApp simulated",
          preview: {
            to: formattedPhone,
            template: templateName,
            parameters: { customerName, productsDisplay, orderId, primaryDownloadUrl },
            downloadLinks
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build template message body for Meta WhatsApp Cloud API
    // Template: soa_download_ready
    // Variables: {{1}} = customer_name, {{2}} = product_names, {{3}} = order_id
    // Button: {{1}} = download_url
    const templateMessage = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedPhone,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: "en_US"
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: customerName || "Customer"
              },
              {
                type: "text",
                text: productsDisplay
              },
              {
                type: "text",
                text: orderId
              }
            ]
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [
            {
                type: "text",
                text: products[0]?.downloadToken || ""
              }
            ]
          }
        ]
      }
    };

    console.log("Sending template message:", JSON.stringify(templateMessage, null, 2));

    // Send WhatsApp template message via Meta Cloud API
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
    console.log("WhatsApp API response:", JSON.stringify(result, null, 2));

    if (!response.ok) {
      const errorMsg = result.error?.message || "Failed to send WhatsApp message";
      const errorCode = result.error?.code;
      
      // Provide helpful error messages for common issues
      if (errorCode === 132000) {
        console.error("Template not found or not approved. Please check template name in Meta Business Manager.");
      } else if (errorCode === 131047) {
        console.error("Template parameters mismatch. Check that parameters match your approved template structure.");
      }
      
      throw new Error(`${errorMsg} (code: ${errorCode})`);
    }

    // Update order delivery status
    await supabase
      .from("orders")
      .update({ 
        delivery_status: "sent",
        delivery_attempts: 1 
      })
      .eq("id", orderId);

    console.log("✅ WhatsApp template message sent successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.messages?.[0]?.id,
        template: templateName 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error sending WhatsApp download:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
