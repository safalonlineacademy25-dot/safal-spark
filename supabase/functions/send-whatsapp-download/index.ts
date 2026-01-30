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
    const { email }: WhatsAppDownloadRequest = await req.json();

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
    
    // Get WhatsApp credentials from database, fallback to env, then to test values
    const whatsappToken = settings['whatsapp_access_token'] || Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "dummy_whatsapp_token_123";
    const whatsappPhoneId = settings['whatsapp_phone_number_id'] || Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "dummy_phone_id";
    const whatsappEnabled = settings['whatsapp_enabled'] !== 'false';
    // Template name - must be registered and approved in Meta Business Manager
    const templateName = settings['whatsapp_template_name'] || "soa_download_ready";
    
    console.log("WhatsApp enabled:", whatsappEnabled, "Phone ID:", whatsappPhoneId.substring(0, 5) + "...");
    console.log("Using template:", templateName);

    const formattedPhone = formatPhoneNumber(order.customer_phone);
    console.log("Formatted phone:", formattedPhone);

    // Get or create download tokens for each product
    const products: Array<{ name: string; downloadToken: string }> = [];
    
    for (const item of order.order_items || []) {
      if (!item.product_id) continue;
      
      // Check for existing valid token
      const { data: existingToken } = await supabase
        .from('download_tokens')
        .select('token')
        .eq('order_id', order.id)
        .eq('product_id', item.product_id)
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .single();

      let token: string;
      
      if (existingToken) {
        token = existingToken.token;
      } else {
        // Create new token
        token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry
        
        await supabase.from('download_tokens').insert({
          order_id: order.id,
          product_id: item.product_id,
          token,
          expires_at: expiresAt.toISOString(),
        });
      }
      
      products.push({
        name: item.product_name,
        downloadToken: token,
      });
    }

    console.log("Products with tokens:", products);

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
      console.log("Template parameters:", { customerName: order.customer_name, productsDisplay, orderId: order.order_number, primaryDownloadUrl });
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Test mode - WhatsApp simulated",
          preview: {
            to: formattedPhone,
            template: templateName,
            parameters: { customerName: order.customer_name, productsDisplay, orderId: order.order_number, primaryDownloadUrl },
            downloadLinks
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build template message body for Meta WhatsApp Cloud API
    // Template: soa_live_normaldeliverymsg
    // Message: "Dear customer, we have send the document to your email id-{{1}}. Please download from your mail."
    // Variables: {{1}} = customer email
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
                text: email
              }
            ]
          }
        ]
      }
    };

    console.log("Sending template message:", JSON.stringify(templateMessage, null, 2));

    // Send WhatsApp template message via Meta Cloud API with retry logic
    let whatsappSuccess = false;
    let whatsappError: string | null = null;
    let messageId: string | null = null;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries && !whatsappSuccess) {
      try {
        console.log(`WhatsApp send attempt ${retryCount + 1}/${maxRetries + 1}`);
        
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

        if (response.ok && result.messages?.[0]?.id) {
          whatsappSuccess = true;
          messageId = result.messages[0].id;
          console.log("✅ WhatsApp template message sent successfully");
        } else {
          const errorCode = result.error?.code;
          const errorMessage = result.error?.message || "Unknown error";
          
          // Handle specific error codes
          if (errorCode === 133010) {
            // Account not registered on WhatsApp - don't retry
            whatsappError = "Recipient phone number is not registered on WhatsApp";
            console.warn(`⚠️ ${whatsappError}. Skipping WhatsApp delivery.`);
            break;
          } else if (errorCode === 132000) {
            // Template not found - don't retry
            whatsappError = "WhatsApp template not found or not approved";
            console.error(`❌ ${whatsappError}. Please check template name in Meta Business Manager.`);
            break;
          } else if (errorCode === 131047) {
            // Parameter mismatch - don't retry
            whatsappError = "Template parameters mismatch";
            console.error(`❌ ${whatsappError}. Check that parameters match your approved template structure.`);
            break;
          } else if (errorCode === 131031 || errorCode === 131053) {
            // Rate limited or temporarily unavailable - retry
            whatsappError = `WhatsApp API temporarily unavailable (${errorCode})`;
            console.warn(`⚠️ ${whatsappError}. Will retry...`);
            retryCount++;
            if (retryCount <= maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
            }
          } else {
            // Other errors
            whatsappError = `${errorMessage} (code: ${errorCode})`;
            console.error(`❌ WhatsApp error: ${whatsappError}`);
            retryCount++;
            if (retryCount <= maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
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

    // Always return success for the overall flow (email was already sent)
    // WhatsApp is a secondary notification channel
    if (whatsappSuccess) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          messageId,
          template: templateName,
          orderId: order.id,
          orderNumber: order.order_number,
          whatsappDelivered: true
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // WhatsApp failed but we don't fail the overall request
      // Email delivery is the primary channel
      console.warn(`⚠️ WhatsApp delivery failed after ${deliveryAttempts} attempts: ${whatsappError}`);
      console.log("📧 Customer should have received email with download link.");
      
      return new Response(
        JSON.stringify({ 
          success: true,
          orderId: order.id,
          orderNumber: order.order_number,
          whatsappDelivered: false,
          whatsappError: whatsappError,
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
