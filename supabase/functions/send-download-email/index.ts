import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resendApiKey = Deno.env.get("RESEND_API_KEY") || "re_test_dummy_key_123";
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://lovable.dev',
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

interface DownloadEmailRequest {
  orderId: string;
  customerEmail: string;
  customerName?: string;
  products: Array<{
    name: string;
    downloadToken: string;
  }>;
}

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, customerEmail, customerName, products }: DownloadEmailRequest = await req.json();

    console.log("Sending download email to:", customerEmail);
    console.log("Order ID:", orderId);
    console.log("Products:", products);

    // Generate download links
    const baseUrl = "https://hujuqkhbdptsdnbnkslo.supabase.co/functions/v1/download-file";
    const downloadLinks = products.map(p => ({
      name: p.name,
      url: `${baseUrl}?token=${p.downloadToken}`
    }));

    // Build email HTML
    const productLinksHtml = downloadLinks.map(link => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
          <strong>${link.name}</strong>
          <br />
          <a href="${link.url}" style="color: #2563eb; text-decoration: none;">
            Download Now →
          </a>
        </td>
      </tr>
    `).join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h1 style="color: #111827; margin: 0 0 24px 0; font-size: 24px;">
                🎉 Your Download is Ready!
              </h1>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Hi ${customerName || "there"},
              </p>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Thank you for your purchase! Your digital products are ready for download.
              </p>
              
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 0 0 24px 0;">
                <h2 style="color: #111827; font-size: 18px; margin: 0 0 16px 0;">
                  Your Downloads
                </h2>
                <table style="width: 100%; border-collapse: collapse;">
                  ${productLinksHtml}
                </table>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0 0 16px 0;">
                <strong>Order ID:</strong> ${orderId}
              </p>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0;">
                Download links expire in 7 days and can be used up to 3 times. If you have any issues, please contact our support team.
              </p>
            </div>
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 24px 0 0 0;">
              © ${new Date().getFullYear()} SOA Resources. All rights reserved.
            </p>
          </div>
        </body>
      </html>
    `;

    // Check if using dummy key (for testing)
    if (resendApiKey.includes("dummy") || resendApiKey.includes("test")) {
      console.log("⚠️ Using dummy API key - email not actually sent");
      console.log("Email would be sent to:", customerEmail);
      console.log("Email HTML preview:", emailHtml.substring(0, 500) + "...");
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Test mode - email simulated",
          preview: {
            to: customerEmail,
            subject: "Your Download is Ready! 🎉",
            downloadLinks
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send actual email via Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SOA Resources <downloads@soaresources.com>",
        to: [customerEmail],
        subject: "Your Download is Ready! 🎉",
        html: emailHtml,
      }),
    });

    const result = await response.json();
    console.log("Resend API response:", result);

    if (!response.ok) {
      throw new Error(result.message || "Failed to send email");
    }

    // Update order delivery status
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await supabase
      .from("orders")
      .update({ 
        delivery_status: "email_sent",
        delivery_attempts: 1 
      })
      .eq("id", orderId);

    return new Response(
      JSON.stringify({ success: true, emailId: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error sending download email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
