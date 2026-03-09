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

interface BroadcastRequest {
  category: string;
  productName: string;
  productDescription?: string;
  templateName: string;
  productId?: string;
  productLink?: string;
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
    // === AUTHENTICATION CHECK ===
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

    console.log(`broadcast-whatsapp: Authorized admin user ${user.id}`);

    const { category, productName, productDescription, templateName, productId, productLink }: BroadcastRequest = await req.json();

    console.log("📢 Starting WhatsApp broadcast");
    console.log("Category:", category);
    console.log("Product:", productName);

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
        JSON.stringify({ success: true, message: "No eligible customers found for this category", sent: 0, failed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = { sent: 0, failed: 0, errors: [] as string[] };
    const waSimpleUrl = `https://app.wasimple.in/api/v1/whatsapp/sendMessage?phoneId=${encodeURIComponent(wasimplePhoneId)}&apiKey=${encodeURIComponent(wasimpleApiKey)}`;
    
    for (const recipient of recipients) {
      try {
        const message = `Dear ${recipient.name},\n\nWe have an exciting update for you from Safal Online Academy!\n\nNew Product: ${productName}\nCategory: ${category}\n\n${productDescription || 'Check it out now!'}\n\n${productLink ? `🔗 Link: ${productLink}` : 'Visit our website for more details.'}\n\nWarm regards,\nTeam Safal Online Academy`;

        console.log(`Sending to ${recipient.phone}...`);

        const response = await fetch(waSimpleUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: recipient.phone, message }),
        });

        const result = await response.json();

        if (!response.ok || result.error) {
          console.error(`Failed for ${recipient.phone}:`, result.error?.message || result.message);
          results.failed++;
          results.errors.push(`${recipient.phone}: ${result.error?.message || result.message || 'Unknown error'}`);
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
        template_name: templateName || 'wasimple_text',
        recipients_count: recipients.length,
        sent_count: results.sent,
        failed_count: results.failed,
        errors: results.errors.slice(0, 20),
        product_link: productLink || null,
        created_by: user.id,
      });
    } catch (logError: any) {
      console.error("Failed to log broadcast:", logError.message);
    }

    return new Response(
      JSON.stringify({ success: true, message: `Broadcast complete`, sent: results.sent, failed: results.failed, totalRecipients: recipients.length, errors: results.errors.slice(0, 10) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Broadcast error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "An error occurred while processing the broadcast" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
