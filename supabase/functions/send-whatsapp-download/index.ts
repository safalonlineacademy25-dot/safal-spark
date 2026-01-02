import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const whatsappToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "dummy_whatsapp_token_123";
const whatsappPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "dummy_phone_id";
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, customerPhone, customerName, products }: WhatsAppDownloadRequest = await req.json();

    console.log("Sending WhatsApp download to:", customerPhone);
    console.log("Order ID:", orderId);
    console.log("Products:", products);

    const formattedPhone = formatPhoneNumber(customerPhone);
    console.log("Formatted phone:", formattedPhone);

    // Generate download links
    const baseUrl = "https://hujuqkhbdptsdnbnkslo.supabase.co/functions/v1/download-file";
    const downloadLinks = products.map(p => ({
      name: p.name,
      url: `${baseUrl}?token=${p.downloadToken}`
    }));

    // Build WhatsApp message
    const productsList = downloadLinks.map((link, i) => 
      `${i + 1}. *${link.name}*\n   📥 ${link.url}`
    ).join("\n\n");

    const messageText = `🎉 *Your Download is Ready!*

Hi ${customerName || "there"}! 👋

Thank you for your purchase from SOA Resources. Your digital products are ready:

${productsList}

📋 *Order ID:* ${orderId}

⏰ Links expire in 7 days (3 downloads max).

Need help? Reply to this message!

_SOA Resources - Quality CA Study Materials_`;

    // Check if using dummy token (for testing)
    if (whatsappToken.includes("dummy") || whatsappToken.includes("test")) {
      console.log("⚠️ Using dummy token - WhatsApp not actually sent");
      console.log("Message would be sent to:", formattedPhone);
      console.log("Message preview:", messageText);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Test mode - WhatsApp simulated",
          preview: {
            to: formattedPhone,
            body: messageText,
            downloadLinks
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send actual WhatsApp message via Meta Cloud API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${whatsappToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "text",
          text: {
            preview_url: true,
            body: messageText,
          },
        }),
      }
    );

    const result = await response.json();
    console.log("WhatsApp API response:", result);

    if (!response.ok) {
      throw new Error(result.error?.message || "Failed to send WhatsApp message");
    }

    // Update order delivery status
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await supabase
      .from("orders")
      .update({ 
        delivery_status: "whatsapp_sent",
        delivery_attempts: 1 
      })
      .eq("id", orderId);

    return new Response(
      JSON.stringify({ success: true, messageId: result.messages?.[0]?.id }),
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
