import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

interface BroadcastRequest {
  category: string;
  productName: string;
  productDescription?: string;
  templateName: string;
}

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "91" + cleaned.substring(1);
  }
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
    const { category, productName, productDescription, templateName }: BroadcastRequest = await req.json();

    console.log("📢 Starting WhatsApp broadcast");
    console.log("Category:", category);
    console.log("Product:", productName);
    console.log("Template:", templateName);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const settings = await getSettings(supabase);
    
    const whatsappToken = settings['whatsapp_access_token'] || Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const whatsappPhoneId = settings['whatsapp_phone_number_id'] || Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const whatsappEnabled = settings['whatsapp_enabled'] !== 'false';

    if (!whatsappEnabled) {
      return new Response(
        JSON.stringify({ success: false, error: "WhatsApp is disabled in settings" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!whatsappToken || !whatsappPhoneId) {
      return new Response(
        JSON.stringify({ success: false, error: "WhatsApp credentials not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get customers who purchased products in this category and opted in for WhatsApp
    const { data: eligibleCustomers, error: customersError } = await supabase
      .from('orders')
      .select(`
        customer_phone,
        customer_name,
        customer_email,
        order_items!inner(
          products!inner(category)
        )
      `)
      .eq('status', 'paid')
      .eq('whatsapp_optin', true)
      .eq('order_items.products.category', category);

    if (customersError) {
      console.error("Error fetching customers:", customersError);
      throw new Error("Failed to fetch eligible customers");
    }

    // Deduplicate by phone number
    const uniquePhones = new Map<string, { phone: string; name: string; email: string }>();
    eligibleCustomers?.forEach((order: any) => {
      const formattedPhone = formatPhoneNumber(order.customer_phone);
      if (!uniquePhones.has(formattedPhone)) {
        uniquePhones.set(formattedPhone, {
          phone: formattedPhone,
          name: order.customer_name || 'Customer',
          email: order.customer_email
        });
      }
    });

    const recipients = Array.from(uniquePhones.values());
    console.log(`Found ${recipients.length} unique customers for category "${category}"`);

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No eligible customers found for this category",
          sent: 0,
          failed: 0
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send broadcast to each customer
    const results = { sent: 0, failed: 0, errors: [] as string[] };
    
    for (const recipient of recipients) {
      try {
        // Template: new_product_alert
        // Variables: {{1}} = customer_name, {{2}} = product_name, {{3}} = category, {{4}} = description
        const templateMessage = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipient.phone,
          type: "template",
          template: {
            name: templateName,
            language: { code: "en" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: recipient.name },
                  { type: "text", text: productName },
                  { type: "text", text: category },
                  { type: "text", text: productDescription || "Check it out now!" }
                ]
              }
            ]
          }
        };

        console.log(`Sending to ${recipient.phone}...`);

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

        if (!response.ok) {
          console.error(`Failed for ${recipient.phone}:`, result.error?.message);
          results.failed++;
          results.errors.push(`${recipient.phone}: ${result.error?.message || 'Unknown error'}`);
        } else {
          console.log(`✅ Sent to ${recipient.phone}`);
          results.sent++;
        }

        // Rate limiting - wait 100ms between messages
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (err: any) {
        console.error(`Error sending to ${recipient.phone}:`, err.message);
        results.failed++;
        results.errors.push(`${recipient.phone}: ${err.message}`);
      }
    }

    console.log(`📢 Broadcast complete: ${results.sent} sent, ${results.failed} failed`);

    // Log the broadcast to database
    try {
      await supabase.from('broadcast_logs').insert({
        category,
        product_name: productName,
        product_description: productDescription || null,
        template_name: templateName,
        recipients_count: recipients.length,
        sent_count: results.sent,
        failed_count: results.failed,
        errors: results.errors.slice(0, 20),
      });
      console.log("✅ Broadcast logged to database");
    } catch (logError: any) {
      console.error("Failed to log broadcast:", logError.message);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Broadcast complete`,
        sent: results.sent,
        failed: results.failed,
        totalRecipients: recipients.length,
        errors: results.errors.slice(0, 10) // Return first 10 errors only
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Broadcast error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
