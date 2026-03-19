import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, subHours, subDays, differenceInMinutes } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  MessageCircle,
  Package,
  RefreshCw,
  TrendingUp,
  XCircle,
  Zap,
  Timer,
  BarChart3,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';

interface TimeRange {
  label: string;
  hours: number;
}

const TIME_RANGES: TimeRange[] = [
  { label: 'Last 1 Hour', hours: 1 },
  { label: 'Last 6 Hours', hours: 6 },
  { label: 'Last 24 Hours', hours: 24 },
  { label: 'Last 7 Days', hours: 168 },
];

interface OrderDeliverySummary {
  total: number;
  delivered: number;
  partial_failure: number;
  pending: number;
  failed: number;
}

interface EmailDeliverySummary {
  total: number;
  sent: number;
  failed: number;
  bounced: number;
  complained: number;
  delayed: number;
  pending: number;
}

interface RecentOrderActivity {
  id: string;
  order_number: string;
  customer_email: string;
  customer_name: string | null;
  status: string;
  delivery_status: string | null;
  total_amount: number;
  created_at: string;
  item_count: number;
}

const CampaignMonitorTab = () => {
  const queryClient = useQueryClient();
  const [selectedRange, setSelectedRange] = useState<TimeRange>(TIME_RANGES[2]); // Default: 24h
  const [autoRefresh, setAutoRefresh] = useState(true);

  const cutoff = subHours(new Date(), selectedRange.hours).toISOString();

  // Fetch order delivery summary
  const { data: orderSummary, isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['campaign-monitor-orders', selectedRange.hours],
    queryFn: async (): Promise<OrderDeliverySummary> => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, status, delivery_status')
        .gte('created_at', cutoff)
        .in('status', ['paid', 'completed']);

      if (error) throw error;

      const orders = data || [];
      return {
        total: orders.length,
        delivered: orders.filter(o => o.delivery_status === 'delivered').length,
        partial_failure: orders.filter(o => o.delivery_status === 'partial_failure').length,
        pending: orders.filter(o => o.delivery_status === 'pending' || !o.delivery_status).length,
        failed: orders.filter(o => o.delivery_status === 'failed').length,
      };
    },
    refetchInterval: autoRefresh ? 15000 : false,
  });

  // Fetch email delivery logs summary
  const { data: emailSummary, isLoading: emailsLoading, refetch: refetchEmails } = useQuery({
    queryKey: ['campaign-monitor-emails', selectedRange.hours],
    queryFn: async (): Promise<EmailDeliverySummary> => {
      const { data, error } = await supabase
        .from('email_delivery_logs')
        .select('id, delivery_status')
        .gte('created_at', cutoff);

      if (error) throw error;

      const logs = data || [];
      return {
        total: logs.length,
        sent: logs.filter(l => l.delivery_status === 'sent' || l.delivery_status === 'delivered').length,
        failed: logs.filter(l => l.delivery_status === 'failed').length,
        bounced: logs.filter(l => l.delivery_status === 'bounced').length,
        complained: logs.filter(l => l.delivery_status === 'complained').length,
        delayed: logs.filter(l => l.delivery_status === 'delayed').length,
        pending: logs.filter(l => l.delivery_status === 'pending').length,
      };
    },
    refetchInterval: autoRefresh ? 15000 : false,
  });

  // Fetch pending download tokens (queue depth)
  const { data: tokenStats, isLoading: tokensLoading } = useQuery({
    queryKey: ['campaign-monitor-tokens', selectedRange.hours],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('download_tokens')
        .select('id, download_count, expires_at, created_at')
        .gte('created_at', cutoff);

      if (error) throw error;

      const tokens = data || [];
      const now = new Date();
      return {
        total: tokens.length,
        used: tokens.filter(t => (t.download_count || 0) > 0).length,
        unused: tokens.filter(t => (t.download_count || 0) === 0).length,
        expired: tokens.filter(t => t.expires_at && new Date(t.expires_at) < now).length,
      };
    },
    refetchInterval: autoRefresh ? 15000 : false,
  });

  // Fetch recent order activity feed
  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['campaign-monitor-activity', selectedRange.hours],
    queryFn: async (): Promise<RecentOrderActivity[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_number, customer_email, customer_name,
          status, delivery_status, total_amount, created_at,
          order_items (id)
        `)
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return (data || []).map((o: any) => ({
        ...o,
        item_count: o.order_items?.length || 0,
      }));
    },
    refetchInterval: autoRefresh ? 15000 : false,
  });

  // WhatsApp delivery stats
  const { data: whatsappStats } = useQuery({
    queryKey: ['campaign-monitor-whatsapp', selectedRange.hours],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, whatsapp_optin, delivery_status')
        .gte('created_at', cutoff)
        .eq('whatsapp_optin', true)
        .in('status', ['paid', 'completed']);

      if (error) throw error;
      return {
        total: data?.length || 0,
        delivered: data?.filter(o => o.delivery_status === 'delivered').length || 0,
      };
    },
    refetchInterval: autoRefresh ? 15000 : false,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('campaign-monitor-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['campaign-monitor-orders'] });
        queryClient.invalidateQueries({ queryKey: ['campaign-monitor-activity'] });
        queryClient.invalidateQueries({ queryKey: ['campaign-monitor-whatsapp'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'email_delivery_logs' }, () => {
        queryClient.invalidateQueries({ queryKey: ['campaign-monitor-emails'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'download_tokens' }, () => {
        queryClient.invalidateQueries({ queryKey: ['campaign-monitor-tokens'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['campaign-monitor-orders'] });
    queryClient.invalidateQueries({ queryKey: ['campaign-monitor-emails'] });
    queryClient.invalidateQueries({ queryKey: ['campaign-monitor-tokens'] });
    queryClient.invalidateQueries({ queryKey: ['campaign-monitor-activity'] });
    queryClient.invalidateQueries({ queryKey: ['campaign-monitor-whatsapp'] });
  }, [queryClient]);

  const isLoading = ordersLoading || emailsLoading || tokensLoading || activityLoading;

  const deliveryRate = orderSummary && orderSummary.total > 0
    ? Math.round((orderSummary.delivered / orderSummary.total) * 100)
    : 0;

  const emailSuccessRate = emailSummary && emailSummary.total > 0
    ? Math.round((emailSummary.sent / emailSummary.total) * 100)
    : 0;

  const failureRate = emailSummary && emailSummary.total > 0
    ? Math.round(((emailSummary.failed + emailSummary.bounced) / emailSummary.total) * 100)
    : 0;

  const getDeliveryStatusColor = (status: string | null) => {
    switch (status) {
      case 'delivered': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      case 'partial_failure': return 'bg-amber-500/10 text-amber-600 border-amber-200';
      case 'pending': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'failed': return 'bg-red-500/10 text-red-600 border-red-200';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'delivered': return <CheckCircle2 className="h-3.5 w-3.5" />;
      case 'partial_failure': return <AlertTriangle className="h-3.5 w-3.5" />;
      case 'pending': return <Clock className="h-3.5 w-3.5" />;
      case 'failed': return <XCircle className="h-3.5 w-3.5" />;
      default: return <Clock className="h-3.5 w-3.5" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Campaign Monitor
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time delivery tracking for bulk orders
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Time range selector */}
          {TIME_RANGES.map((range) => (
            <Button
              key={range.hours}
              variant={selectedRange.hours === range.hours ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedRange(range)}
              className="text-xs"
            >
              {range.label}
            </Button>
          ))}
          <div className="flex items-center gap-1.5 ml-2">
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="gap-1.5 text-xs"
            >
              <Zap className="h-3.5 w-3.5" />
              {autoRefresh ? 'Live' : 'Paused'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {isLoading && !orderSummary ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Top-level Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Orders"
              value={orderSummary?.total || 0}
              icon={<Package className="h-5 w-5" />}
              color="text-primary"
              bgColor="bg-primary/10"
            />
            <StatCard
              label="Delivered"
              value={orderSummary?.delivered || 0}
              icon={<CheckCircle2 className="h-5 w-5" />}
              color="text-emerald-600"
              bgColor="bg-emerald-500/10"
              suffix={orderSummary && orderSummary.total > 0 ? `${deliveryRate}%` : undefined}
            />
            <StatCard
              label="Emails Sent"
              value={emailSummary?.sent || 0}
              icon={<Mail className="h-5 w-5" />}
              color="text-blue-600"
              bgColor="bg-blue-500/10"
              suffix={emailSummary && emailSummary.total > 0 ? `${emailSuccessRate}%` : undefined}
            />
            <StatCard
              label="Failures"
              value={(emailSummary?.failed || 0) + (emailSummary?.bounced || 0)}
              icon={<AlertTriangle className="h-5 w-5" />}
              color="text-red-600"
              bgColor="bg-red-500/10"
              suffix={failureRate > 0 ? `${failureRate}%` : undefined}
              alert={failureRate > 5}
            />
          </div>

          {/* Delivery Progress & Queue Depth */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Order Delivery Progress */}
            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Order Delivery Progress
              </h3>

              <div className="space-y-3">
                <ProgressRow
                  label="Delivered"
                  count={orderSummary?.delivered || 0}
                  total={orderSummary?.total || 0}
                  color="bg-emerald-500"
                />
                <ProgressRow
                  label="Pending"
                  count={orderSummary?.pending || 0}
                  total={orderSummary?.total || 0}
                  color="bg-blue-500"
                />
                <ProgressRow
                  label="Partial Failure"
                  count={orderSummary?.partial_failure || 0}
                  total={orderSummary?.total || 0}
                  color="bg-amber-500"
                />
                <ProgressRow
                  label="Failed"
                  count={orderSummary?.failed || 0}
                  total={orderSummary?.total || 0}
                  color="bg-red-500"
                />
              </div>

              {/* WhatsApp Summary */}
              {whatsappStats && whatsappStats.total > 0 && (
                <div className="pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp Opt-in Orders
                    </span>
                    <span className="font-medium text-foreground">
                      {whatsappStats.delivered}/{whatsappStats.total} delivered
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Email Delivery Breakdown */}
            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Email Delivery Breakdown
              </h3>

              <div className="space-y-3">
                <ProgressRow
                  label="Sent / Delivered"
                  count={emailSummary?.sent || 0}
                  total={emailSummary?.total || 0}
                  color="bg-emerald-500"
                />
                <ProgressRow
                  label="Pending"
                  count={emailSummary?.pending || 0}
                  total={emailSummary?.total || 0}
                  color="bg-blue-500"
                />
                <ProgressRow
                  label="Failed"
                  count={emailSummary?.failed || 0}
                  total={emailSummary?.total || 0}
                  color="bg-red-500"
                />
                <ProgressRow
                  label="Bounced"
                  count={emailSummary?.bounced || 0}
                  total={emailSummary?.total || 0}
                  color="bg-orange-500"
                />
                <ProgressRow
                  label="Delayed"
                  count={emailSummary?.delayed || 0}
                  total={emailSummary?.total || 0}
                  color="bg-yellow-500"
                />
              </div>
            </div>
          </div>

          {/* Download Token Queue */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <Timer className="h-4 w-4 text-primary" />
              Download Token Queue
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MiniStat label="Total Tokens" value={tokenStats?.total || 0} />
              <MiniStat label="Used (Downloaded)" value={tokenStats?.used || 0} color="text-emerald-600" />
              <MiniStat label="Unused (Waiting)" value={tokenStats?.unused || 0} color="text-blue-600" />
              <MiniStat label="Expired" value={tokenStats?.expired || 0} color="text-muted-foreground" />
            </div>
          </div>

          {/* Live Order Activity Feed */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-primary" />
              Recent Order Activity
              {autoRefresh && (
                <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 font-normal">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              )}
            </h3>

            {!recentActivity || recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No orders in the selected time range
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-medium text-muted-foreground">Order</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Customer</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Items</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Payment</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Delivery</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.map((order) => (
                      <tr key={order.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono text-xs">{order.order_number}</td>
                        <td className="p-3">
                          <div>
                            <p className="font-medium text-foreground text-xs">
                              {order.customer_name || 'N/A'}
                            </p>
                            <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                          </div>
                        </td>
                        <td className="p-3 text-center">{order.item_count}</td>
                        <td className="p-3 font-medium">₹{Number(order.total_amount).toLocaleString()}</td>
                        <td className="p-3">
                          <Badge variant={order.status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                            {order.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge className={`text-xs gap-1 ${getDeliveryStatusColor(order.delivery_status)}`}>
                            {getStatusIcon(order.delivery_status)}
                            {order.delivery_status || 'pending'}
                          </Badge>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                          {timeAgo(order.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
};

// Helper components
function StatCard({ label, value, icon, color, bgColor, suffix, alert }: {
  label: string; value: number; icon: React.ReactNode; color: string; bgColor: string;
  suffix?: string; alert?: boolean;
}) {
  return (
    <div className={`bg-card rounded-xl border p-4 ${alert ? 'border-red-300 ring-1 ring-red-200' : 'border-border'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`p-2 rounded-lg ${bgColor} ${color}`}>{icon}</span>
        {suffix && (
          <span className={`text-xs font-medium ${alert ? 'text-red-600' : 'text-muted-foreground'}`}>
            {suffix}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function ProgressRow({ label, count, total, color }: {
  label: string; count: number; total: number; color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{count} <span className="text-muted-foreground font-normal">/ {total}</span></span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center p-3 rounded-lg bg-muted/50">
      <p className={`text-xl font-bold ${color || 'text-foreground'}`}>{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const mins = differenceInMinutes(new Date(), new Date(dateStr));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default CampaignMonitorTab;
