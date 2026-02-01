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

interface DownloadEmailRequest {
  orderId: string;
  customerEmail: string;
  customerName?: string;
  products: Array<{
    name: string;
    downloadToken: string;
    isComboFile?: boolean;
    fileNumber?: number;
    totalFiles?: number;
  }>;
  // For combo packs - send multiple emails
  isComboPackEmail?: boolean;
  comboPackName?: string;
  emailIndex?: number;
  totalEmails?: number;
}

// Helper to delay execution
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      orderId, 
      customerEmail, 
      customerName, 
      products,
      isComboPackEmail,
      comboPackName,
      emailIndex,
      totalEmails
    }: DownloadEmailRequest = await req.json();

    console.log("Sending download email to:", customerEmail);
    console.log("Order ID:", orderId);
    console.log("Products:", products);
    console.log("Is combo pack email:", isComboPackEmail);

    // Create Supabase client and get settings
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const settings = await getSettings(supabase);
    
    // Get Resend API key from database, fallback to env, then to test key
    const resendApiKey = settings['resend_api_key'] || Deno.env.get("RESEND_API_KEY") || "re_test_dummy_key_123";
    const emailEnabled = settings['email_enabled'] !== 'false';
    
    console.log("Email enabled:", emailEnabled, "Using API key:", resendApiKey.substring(0, 10) + "...");

    // Generate download links
    const baseUrl = "https://hujuqkhbdptsdnbnkslo.supabase.co/functions/v1/download-file";
    const downloadLinks = products.map(p => ({
      name: p.name,
      url: `${baseUrl}?token=${p.downloadToken}`,
      isComboFile: p.isComboFile,
      fileNumber: p.fileNumber,
      totalFiles: p.totalFiles
    }));

    // Build email subject and HTML based on whether it's a combo pack series email
    let emailSubject: string;
    let emailHtml: string;

    if (isComboPackEmail && comboPackName) {
      // Combo pack series email
      emailSubject = `📦 ${comboPackName} - Part ${emailIndex} of ${totalEmails}`;
      
      const productLinksHtml = downloadLinks.map(link => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <strong>${link.name}</strong>
            <br />
            <a href="${link.url}" style="color: #2563eb; text-decoration: none; display: inline-block; margin-top: 8px; padding: 8px 16px; background-color: #2563eb; color: #ffffff; border-radius: 6px;">
              Download Now →
            </a>
          </td>
        </tr>
      `).join("");

      emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <div style="text-align: center; margin-bottom: 24px;">
                  <span style="display: inline-block; background-color: #dbeafe; color: #1d4ed8; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                    📦 Part ${emailIndex} of ${totalEmails}
                  </span>
                </div>
                
                <h1 style="color: #111827; margin: 0 0 24px 0; font-size: 24px; text-align: center;">
                  ${comboPackName}
                </h1>
                
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                  Hi ${customerName || "there"},
                </p>
                
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                  Here's <strong>Part ${emailIndex} of ${totalEmails}</strong> from your Combo Pack purchase! 
                  ${emailIndex && totalEmails && emailIndex < totalEmails 
                    ? `You will receive the remaining ${totalEmails - emailIndex} email(s) shortly.` 
                    : 'This is the final part of your Combo Pack!'}
                </p>
                
                <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin: 0 0 24px 0;">
                  <h2 style="color: #166534; font-size: 18px; margin: 0 0 16px 0;">
                    📄 Your Download
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
                © ${new Date().getFullYear()} Safal Online Academy Document. All rights reserved.
              </p>
            </div>
          </body>
        </html>
      `;
    } else {
      // Standard single email
      emailSubject = "Your Download is Ready! 🎉";
      
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

      emailHtml = `
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
                © ${new Date().getFullYear()} Safal Online Academy Document. All rights reserved.
              </p>
            </div>
          </body>
        </html>
      `;
    }

    // Check if email is disabled or using dummy key (for testing)
    if (!emailEnabled) {
      console.log("⚠️ Email delivery is disabled in settings");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email delivery disabled",
          preview: { to: customerEmail, downloadLinks }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (resendApiKey.includes("dummy") || resendApiKey.includes("test")) {
      console.log("⚠️ Using dummy API key - email not actually sent");
      console.log("Email would be sent to:", customerEmail);
      console.log("Subject:", emailSubject);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Test mode - email simulated",
          preview: {
            to: customerEmail,
            subject: emailSubject,
            downloadLinks
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send actual email via Resend
    const senderEmail = settings['sender_email'] || "support@safalonlinesolutions.com";
    const senderName = settings['sender_name'] || "Safal Online Academy";
    
    console.log("Sending email from:", `${senderName} <${senderEmail}>`);
    
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${senderName} <${senderEmail}>`,
        to: [customerEmail],
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    const result = await response.json();
    console.log("Resend API response:", result);

    if (!response.ok) {
      throw new Error(result.message || "Failed to send email");
    }

    // Update order delivery status (only for first email or non-combo)
    if (!isComboPackEmail || emailIndex === 1) {
      await supabase
        .from("orders")
        .update({ 
          delivery_status: "email_sent",
          delivery_attempts: 1 
        })
        .eq("id", orderId);
    }

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
