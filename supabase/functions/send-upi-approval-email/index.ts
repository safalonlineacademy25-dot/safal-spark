import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getSettings = async (supabase: any): Promise<Record<string, string>> => {
  const { data, error } = await supabase.from('settings').select('key, value');
  if (error) throw error;
  const map: Record<string, string> = {};
  data?.forEach((s: { key: string; value: string | null }) => {
    if (s.value) map[s.key] = s.value;
  });
  return map;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { upi_order_id, customer_name, customer_email, customer_phone, product_name, amount, transaction_id } = await req.json();

    if (!upi_order_id) throw new Error('upi_order_id is required');

    const settings = await getSettings(supabase);
    const resendApiKey = settings['resend_api_key'];
    const approvalEmail = settings['upi_approval_email'];

    if (!resendApiKey) {
      console.log('Resend API key not configured, skipping approval email');
      return new Response(JSON.stringify({ success: false, reason: 'Resend not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!approvalEmail) {
      console.log('UPI approval email not configured, skipping');
      return new Response(JSON.stringify({ success: false, reason: 'Approval email not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate secure tokens for approve and reject
    const approveToken = crypto.randomUUID() + '-' + crypto.randomUUID();
    const rejectToken = crypto.randomUUID() + '-' + crypto.randomUUID();

    // Store tokens in DB
    const { error: tokenError } = await supabase
      .from('upi_approval_tokens')
      .insert([
        { upi_order_id, token: approveToken, action: 'approve' },
        { upi_order_id, token: rejectToken, action: 'reject' },
      ]);

    if (tokenError) {
      console.error('Error creating tokens:', tokenError);
      throw new Error('Failed to create approval tokens');
    }

    // Build approval/rejection URLs
    const approveUrl = `${supabaseUrl}/functions/v1/handle-upi-approval?token=${approveToken}`;
    const rejectUrl = `${supabaseUrl}/functions/v1/handle-upi-approval?token=${rejectToken}`;

    // Send email via Resend
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
      <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <h2 style="color: #1a1a2e; margin-bottom: 5px;">🔔 UPI Payment - Approval Required</h2>
        <p style="color: #666; font-size: 14px; margin-top: 0;">A new UPI payment is waiting for your verification.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #888; width: 140px;">Customer</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 600;">${customer_name || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #888;">Email</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${customer_email}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #888;">Phone</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${customer_phone || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #888;">Product</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 600;">${product_name}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #888;">Amount</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 600; color: #16a34a;">₹${amount}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #888;">Transaction ID</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-family: monospace; font-weight: 600;">${transaction_id || 'N/A'}</td>
          </tr>
        </table>

        <p style="color: #666; font-size: 14px;">Please verify the transaction ID in your UPI app and take action:</p>

        <div style="text-align: center; margin: 25px 0;">
          <a href="${approveUrl}" style="display: inline-block; background: #16a34a; color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; margin-right: 15px;">✅ Approve</a>
          <a href="${rejectUrl}" style="display: inline-block; background: #dc2626; color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">❌ Reject</a>
        </div>

        <p style="color: #999; font-size: 12px; margin-top: 20px; text-align: center;">
          These links expire in 24 hours. Each link can only be used once.
        </p>
      </div>
    </body>
    </html>`;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Safal Spark <noreply@safalonlinesolutions.com>',
        to: [approvalEmail],
        subject: `🔔 UPI Approval: ₹${amount} - ${product_name} (${customer_name || customer_email})`,
        html: emailHtml,
      }),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendResult);
      throw new Error(`Failed to send email: ${resendResult.message || 'Unknown error'}`);
    }

    console.log('Approval email sent successfully:', resendResult.id);

    return new Response(
      JSON.stringify({ success: true, email_id: resendResult.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in send-upi-approval-email:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
