import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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

interface PromotionRequest {
  templateName?: string;
  promotionMessage?: string;
}

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) cleaned = "91" + cleaned.substring(1);
  if (cleaned.length === 10) cleaned = "91" + cleaned;
  return cleaned;
}

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: hasAccess, error: accessError } = await supabase.rpc('has_admin_access', {
      _user_id: user.id,
    });

    if (accessError || !hasAccess) {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { templateName }: PromotionRequest = await req.json();

    if (!templateName || !templateName.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Template name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("🎉 Starting promotional broadcast via WaSimple template");
    console.log("Template:", templateName);

    const settings = await getSettings(supabase);
    
    const wasimpleApiKey = settings['wasimple_api_key'] || '';
    const wasimplePhoneId = settings['wasimple_phone_id'] || '';
    const whatsappEnabled = settings['whatsapp_enabled'] !== 'false';

    if (!whatsappEnabled) {
      return new Response(
        JSON.stringify({ success: false, error: "WhatsApp is disabled in settings" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!wasimpleApiKey || !wasimplePhoneId) {
      return new Response(
        JSON.stringify({ success: false, error: "WaSimple credentials not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all customers who opted in for WhatsApp
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('phone, name, email')
      .eq('whatsapp_optin', true);

    if (customersError) {
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
        JSON.stringify({ success: true, message: "No customers opted in for promotional messages", sent: 0, failed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = { sent: 0, failed: 0, errors: [] as string[] };
    const waSimpleUrl = `https://app.wasimple.in/api/v1/whatsapp/sendMessage?phoneId=${encodeURIComponent(wasimplePhoneId)}&apiKey=${encodeURIComponent(wasimpleApiKey)}`;
    
    for (const recipient of recipients) {
      try {
        const templateBody = {
          messaging_product: "whatsapp",
          to: recipient.phone,
          type: "template",
          template: {
            name: templateName.trim(),
            language: { code: "en" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: recipient.name },
                  { type: "text", text: recipient.email },
                ],
              },
            ],
          },
        };

        console.log(`Sending promotion template to ${recipient.phone}...`);

        const response = await fetch(waSimpleUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(templateBody),
        });

        const result = await response.json();

        if (!response.ok || result.error) {
          console.error(`Failed for ${recipient.phone}:`, result.error?.message || result.message);
          results.failed++;
          results.errors.push(`${recipient.phone}: ${result.error?.message || result.message || 'Unknown error'}`);
        } else {
          console.log(`✅ Promotion sent to ${recipient.phone}`);
          results.sent++;
        }

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
        promotion_title: `Template: ${templateName.trim()}`,
        promotion_message: null,
        cta_link: null,
        template_name: templateName.trim(),
        recipients_count: recipients.length,
        sent_count: results.sent,
        failed_count: results.failed,
        errors: results.errors.slice(0, 20),
        created_by: user.id,
      });
    } catch (logError: any) {
      console.error("Failed to log promotion:", logError.message);
    }

    return new Response(
      JSON.stringify({ success: true, message: `Promotion complete`, sent: results.sent, failed: results.failed, totalRecipients: recipients.length, errors: results.errors.slice(0, 10) }),
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
