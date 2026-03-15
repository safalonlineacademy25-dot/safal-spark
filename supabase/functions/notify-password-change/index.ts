import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, targetEmail } = await req.json();

    // Get Resend API key from settings
    const { data: settings } = await supabaseClient
      .from('settings')
      .select('key, value')
      .in('key', ['resend_api_key', 'email_enabled', 'from_email']);

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: { key: string; value: string | null }) => {
      if (s.value) settingsMap[s.key] = s.value;
    });

    const resendApiKey = settingsMap['resend_api_key'];
    const emailEnabled = settingsMap['email_enabled'] !== 'false';
    const fromEmail = settingsMap['from_email'] || 'noreply@safalonlinesolutions.com';

    if (!resendApiKey || !emailEnabled) {
      console.log('Email not configured or disabled, skipping notification');
      return new Response(
        JSON.stringify({ success: true, message: 'Email notifications not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const recipientEmail = targetEmail || user.email;
    if (!recipientEmail) {
      return new Response(
        JSON.stringify({ error: 'No recipient email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    
    let subject: string;
    let htmlBody: string;

    if (action === 'admin_reset') {
      // Password was reset by a super admin
      subject = '🔐 Your Admin Password Has Been Reset - Safal Online Academy';
      htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e40af, #7c3aed); padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🔐 Password Reset Alert</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="color: #374151; font-size: 16px;">Hello,</p>
            <p style="color: #374151; font-size: 16px;">Your admin account password has been <strong>reset by a Super Admin</strong>.</p>
            <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>⚠️ If you did not request this change</strong>, please contact your Super Admin immediately.
              </p>
            </div>
            <p style="color: #6b7280; font-size: 14px;"><strong>Time:</strong> ${now} (IST)</p>
            <p style="color: #6b7280; font-size: 14px;"><strong>Action:</strong> Password reset by administrator</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              This is an automated security notification from Safal Online Academy.
            </p>
          </div>
        </div>
      `;
    } else {
      // Self-initiated password change/reset
      subject = '🔐 Your Password Was Changed - Safal Online Academy';
      htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e40af, #7c3aed); padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🔐 Password Changed</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="color: #374151; font-size: 16px;">Hello,</p>
            <p style="color: #374151; font-size: 16px;">Your admin account password has been <strong>successfully changed</strong>.</p>
            <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>⚠️ If you did not make this change</strong>, please reset your password immediately or contact a Super Admin.
              </p>
            </div>
            <p style="color: #6b7280; font-size: 14px;"><strong>Time:</strong> ${now} (IST)</p>
            <p style="color: #6b7280; font-size: 14px;"><strong>Account:</strong> ${recipientEmail}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              This is an automated security notification from Safal Online Academy.
            </p>
          </div>
        </div>
      `;
    }

    // Send email via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Safal Online Academy <${fromEmail}>`,
        to: [recipientEmail],
        subject,
        html: htmlBody,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error('Failed to send password change notification:', errText);
      return new Response(
        JSON.stringify({ success: false, error: 'Email send failed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Password change notification sent to ${recipientEmail} (action: ${action})`);

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in notify-password-change:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
