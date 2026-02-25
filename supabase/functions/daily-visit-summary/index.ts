import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get today's date in IST (UTC+5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const todayStr = istNow.toISOString().split('T')[0];
    
    // Calculate date ranges
    const today = new Date(todayStr);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

    // Fetch visitor stats for last 30 days
    const { data: visitorStats, error: visitorError } = await supabase
      .from('visitor_stats')
      .select('visit_date, visit_count')
      .gte('visit_date', thirtyDaysAgo.toISOString().split('T')[0])
      .lte('visit_date', todayStr);

    if (visitorError) {
      console.error('Error fetching visitor stats:', visitorError);
    }

    const stats = visitorStats || [];
    const todayVisits = stats.find(s => s.visit_date === todayStr)?.visit_count || 0;
    const weeklyVisits = stats
      .filter(s => s.visit_date >= weekAgo.toISOString().split('T')[0])
      .reduce((sum, s) => sum + s.visit_count, 0);
    const totalVisits30d = stats.reduce((sum, s) => sum + s.visit_count, 0);
    const avgDaily = stats.length > 0 ? Math.round(totalVisits30d / stats.length) : 0;

    // Fetch today's orders
    const todayStart = `${todayStr}T00:00:00+05:30`;
    const todayEnd = `${todayStr}T23:59:59+05:30`;

    const { data: todayOrders, error: ordersError } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('status', 'paid')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd);

    if (ordersError) {
      console.error('Error fetching today orders:', ordersError);
    }

    const ordersList = todayOrders || [];
    const todayOrderCount = ordersList.length;
    const todayRevenue = ordersList.reduce((sum, o) => sum + Number(o.total_amount), 0);

    // Send Telegram notification
    const telegramPayload = {
      type: 'daily_summary',
      data: {
        today_visits: todayVisits,
        weekly_visits: weeklyVisits,
        total_visits_30d: totalVisits30d,
        avg_daily: avgDaily,
        today_orders: todayOrderCount,
        today_revenue: todayRevenue,
        date: todayStr,
      },
    };

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const telegramResponse = await fetch(
      `${supabaseUrl}/functions/v1/send-telegram-notification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify(telegramPayload),
      }
    );

    const telegramResult = await telegramResponse.json();
    console.log('Daily summary sent:', telegramResult);

    return new Response(
      JSON.stringify({ success: true, summary: telegramPayload.data, telegram: telegramResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in daily-visit-summary:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
