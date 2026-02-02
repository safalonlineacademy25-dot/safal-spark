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

interface ProcessRefundRequest {
  refundId: string;
}

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { refundId }: ProcessRefundRequest = await req.json();

    if (!refundId) {
      return new Response(
        JSON.stringify({ success: false, error: "Refund ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing refund:", refundId);

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get refund details
    const { data: refund, error: refundError } = await supabase
      .from('refunds')
      .select(`
        *,
        orders (
          id,
          order_number,
          customer_email,
          customer_phone,
          customer_name,
          total_amount,
          razorpay_payment_id
        )
      `)
      .eq('id', refundId)
      .single();

    if (refundError || !refund) {
      console.error("Refund lookup error:", refundError);
      return new Response(
        JSON.stringify({ success: false, error: "Refund not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (refund.status !== 'eligible') {
      return new Response(
        JSON.stringify({ success: false, error: `Refund is not eligible. Current status: ${refund.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const order = refund.orders;
    if (!order || !order.razorpay_payment_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Order or payment ID not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing refund for order:", order.order_number);

    // Update refund status to processing
    await supabase
      .from('refunds')
      .update({ status: 'processing' })
      .eq('id', refundId);

    // Get Razorpay credentials
    const settings = await getSettings(supabase);
    const RAZORPAY_KEY_ID = settings['razorpay_key_id'] || Deno.env.get('RAZORPAY_KEY_ID') || "";
    const RAZORPAY_KEY_SECRET = settings['razorpay_key_secret'] || Deno.env.get('RAZORPAY_KEY_SECRET') || "";

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      await supabase
        .from('refunds')
        .update({ 
          status: 'failed',
          error_message: 'Razorpay credentials not configured'
        })
        .eq('id', refundId);
      
      return new Response(
        JSON.stringify({ success: false, error: "Razorpay credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process refund via Razorpay API
    const amountInPaise = Math.round(Number(refund.amount) * 100);
    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    
    console.log("Initiating Razorpay refund for payment:", order.razorpay_payment_id);
    console.log("Refund amount (paise):", amountInPaise);

    const refundResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${order.razorpay_payment_id}/refund`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount: amountInPaise,
          speed: 'normal',
          notes: {
            reason: refund.reason,
            order_number: order.order_number,
            failed_email: refund.failed_email || '',
          },
        }),
      }
    );

    const refundResult = await refundResponse.json();
    console.log("Razorpay refund response:", refundResult);

    if (!refundResponse.ok) {
      const errorMessage = refundResult.error?.description || refundResult.message || 'Refund failed';
      console.error("Razorpay refund error:", errorMessage);
      
      await supabase
        .from('refunds')
        .update({ 
          status: 'failed',
          error_message: errorMessage
        })
        .eq('id', refundId);
      
      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Refund successful
    const razorpayRefundId = refundResult.id;
    console.log("Refund successful. Razorpay refund ID:", razorpayRefundId);

    // Update refund record
    await supabase
      .from('refunds')
      .update({ 
        status: 'completed',
        razorpay_refund_id: razorpayRefundId,
        processed_at: new Date().toISOString()
      })
      .eq('id', refundId);

    // Update order status
    await supabase
      .from('orders')
      .update({ 
        status: 'refunded',
        delivery_status: 'refunded'
      })
      .eq('id', order.id);

    // Send WhatsApp notification about refund
    let whatsappSent = false;
    
    const whatsappToken = settings['whatsapp_access_token'] || Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
    const whatsappPhoneId = settings['whatsapp_phone_number_id'] || Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";
    const whatsappEnabled = settings['whatsapp_enabled'] !== 'false';
    const refundTemplateName = settings['whatsapp_refund_template'] || "soa_refund_notification";

    if (whatsappEnabled && whatsappToken && whatsappPhoneId && !whatsappToken.includes("dummy")) {
      try {
        const formattedPhone = formatPhoneNumber(order.customer_phone);
        console.log("Sending WhatsApp refund notification to:", formattedPhone);

        // Template message with order_number and failed_email as body parameters
        const templateMessage = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "template",
          template: {
            name: refundTemplateName,
            language: {
              code: "en_US"
            },
            components: [
              {
                type: "body",
                parameters: [
                  {
                    type: "text",
                    text: order.order_number
                  },
                  {
                    type: "text",
                    text: refund.failed_email || order.customer_email
                  }
                ]
              }
            ]
          }
        };

        const whatsappResponse = await fetch(
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

        const whatsappResult = await whatsappResponse.json();
        console.log("WhatsApp refund notification response:", whatsappResult);

        if (whatsappResponse.ok && whatsappResult.messages?.[0]?.id) {
          whatsappSent = true;
          console.log("✅ WhatsApp refund notification sent successfully");
          
          // Update refund with WhatsApp status
          await supabase
            .from('refunds')
            .update({ whatsapp_sent: true })
            .eq('id', refundId);
        } else {
          console.warn("⚠️ WhatsApp notification failed:", whatsappResult.error?.message);
        }
      } catch (whatsappError: any) {
        console.error("❌ WhatsApp notification error:", whatsappError.message);
      }
    } else {
      console.log("WhatsApp disabled or not configured - skipping notification");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        razorpayRefundId,
        whatsappSent,
        message: `Refund of ₹${refund.amount} processed successfully`
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error processing refund:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
