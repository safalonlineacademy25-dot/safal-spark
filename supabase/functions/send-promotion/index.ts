import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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

// Hardcoded defaults for promotion
const DEFAULT_PROMOTION_TITLE = "Special Offer from Safal Resources";
const DEFAULT_CTA_LINK = "https://safalonlinesolutions.com";
const DEFAULT_TEMPLATE_NAME = "promotional_message";

interface PromotionRequest {
  templateName?: string;
  promotionMessage: string;
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
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // === AUTHENTICATION CHECK ===
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("send-promotion: No authorization header");
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use anon key client to verify the user's JWT
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser();

    if (userError || !user) {
      console.error("send-promotion: Invalid user token", userError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for admin check and data operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user has admin access
    const { data: hasAccess, error: accessError } = await supabase.rpc('has_admin_access', {
      _user_id: user.id,
    });

    if (accessError || !hasAccess) {
      console.error("send-promotion: User lacks admin access", accessError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`send-promotion: Authorized admin user ${user.id}`);

    const { templateName, promotionMessage }: PromotionRequest = await req.json();

    if (!promotionMessage || !promotionMessage.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Promotion message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use provided template name or fallback to default
    const finalTemplateName = templateName?.trim() || DEFAULT_TEMPLATE_NAME;
    // Use hardcoded defaults for other fields
    const promotionTitle = DEFAULT_PROMOTION_TITLE;
    const ctaLink = DEFAULT_CTA_LINK;

    console.log("🎉 Starting promotional broadcast");
    console.log("Template:", finalTemplateName);
    console.log("Title:", promotionTitle);
    console.log("Message:", promotionMessage);
    console.log("CTA Link:", ctaLink);

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

    // Get all customers who opted in for WhatsApp
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('phone, name, email')
      .eq('whatsapp_optin', true);

    if (customersError) {
      console.error("Error fetching customers:", customersError);
      throw new Error("Failed to fetch eligible customers");
    }

    // Deduplicate by phone number
    const uniquePhones = new Map<string, { phone: string; name: string; email: string }>();
    customers?.forEach((customer: any) => {
      const formattedPhone = formatPhoneNumber(customer.phone);
      if (!uniquePhones.has(formattedPhone)) {
        uniquePhones.set(formattedPhone, {
          phone: formattedPhone,
          name: customer.name || 'Customer',
          email: customer.email
        });
      }
    });

    const recipients = Array.from(uniquePhones.values());
    console.log(`Found ${recipients.length} customers opted in for promotions`);

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No customers opted in for promotional messages",
          sent: 0,
          failed: 0
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send promotion to each customer
    const results = { sent: 0, failed: 0, errors: [] as string[] };
    
    for (const recipient of recipients) {
      try {
        // Template: promotional_message
        // Variables: {{1}} = customer_name, {{2}} = promotion_title, {{3}} = promotion_message, {{4}} = cta_link
        const templateParameters = [
          { type: "text", text: recipient.name },
          { type: "text", text: promotionTitle },
          { type: "text", text: promotionMessage.trim() },
          { type: "text", text: ctaLink }
        ];

        const templateMessage = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipient.phone,
          type: "template",
          template: {
            name: finalTemplateName,
            language: { code: "en" },
            components: [
              {
                type: "body",
                parameters: templateParameters
              }
            ]
          }
        };

        console.log(`Sending promotion to ${recipient.phone}...`);

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
          console.log(`✅ Promotion sent to ${recipient.phone}`);
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

    console.log(`🎉 Promotion complete: ${results.sent} sent, ${results.failed} failed`);

    // Log the promotion to database
    try {
      await supabase.from('promotion_logs').insert({
        promotion_title: promotionTitle,
        promotion_message: promotionMessage.trim(),
        cta_link: ctaLink,
        template_name: finalTemplateName,
        recipients_count: recipients.length,
        sent_count: results.sent,
        failed_count: results.failed,
        errors: results.errors.slice(0, 20),
        created_by: user.id,
      });
      console.log("✅ Promotion logged to database");
    } catch (logError: any) {
      console.error("Failed to log promotion:", logError.message);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Promotion complete`,
        sent: results.sent,
        failed: results.failed,
        totalRecipients: recipients.length,
        errors: results.errors.slice(0, 10)
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Promotion error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "An error occurred while processing the promotion" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
