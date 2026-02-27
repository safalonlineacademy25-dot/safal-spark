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

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { type, data } = await req.json();
    const settings = await getSettings(supabase);

    const botToken = settings['telegram_bot_token'];
    const chatId = settings['telegram_chat_id'];

    if (!botToken || !chatId) {
      console.log('Telegram not configured, skipping notification');
      return new Response(
        JSON.stringify({ success: false, reason: 'Telegram not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let message = '';

    if (type === 'new_order') {
      const { order_number, total_amount, customer_email, customer_name, items_count, currency } = data;
      message = `🛒 *New Order Received!*\n\n` +
        `📋 Order: \`${order_number}\`\n` +
        `💰 Amount: ${currency || 'INR'} ${total_amount}\n` +
        `👤 Customer: ${customer_name || 'N/A'}\n` +
        `📧 Email: ${customer_email}\n` +
        `📦 Items: ${items_count}`;
    } else if (type === 'daily_summary') {
      const { today_visits, weekly_visits, total_visits_30d, avg_daily, today_orders, today_revenue, date, cron_jobs, db_size_mb } = data;
      message = `📊 *Daily Summary — ${date}*\n\n` +
        `👁 *Visitor Stats*\n` +
        `• Today: ${today_visits}\n` +
        `• This Week: ${weekly_visits}\n` +
        `• 30-Day Total: ${total_visits_30d}\n` +
        `• Daily Avg: ${avg_daily}\n\n` +
        `🛒 *Today's Orders*\n` +
        `• Orders: ${today_orders}\n` +
        `• Revenue: INR ${today_revenue}`;

      // Append database size
      if (db_size_mb) {
        const usagePercent = ((Number(db_size_mb) / 500) * 100).toFixed(1);
        const warn = Number(usagePercent) > 80 ? ' ⚠️' : '';
        message += `\n\n💾 *Database*\n• Size: ${db_size_mb} MB / 500 MB (${usagePercent}%)${warn}`;
      }

      // Append cron job summary if available
      if (cron_jobs && Array.isArray(cron_jobs) && cron_jobs.length > 0) {
        message += `\n\n⚙️ *Maintenance Tasks*`;
        for (const job of cron_jobs) {
          const statusIcon = job.is_active ? '✅' : '❌';
          message += `\n${statusIcon} \`${job.job_name}\` — ${job.description}`;
        }
      }
    } else {
      message = data?.message || 'Notification from Safal Spark';
    }

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Telegram API error:', result);
      return new Response(
        JSON.stringify({ success: false, error: result.description }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending Telegram notification:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
