import { useState, useMemo } from 'react';
import { format, differenceInHours } from 'date-fns';
import { MessageCircle, AlertTriangle, CreditCard, Loader2, Send, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PaginationControls from './PaginationControls';
import { usePagination } from '@/hooks/usePagination';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { OrderWithItems } from '@/hooks/useOrders';

interface PaymentRemindersTabProps {
  orders: OrderWithItems[] | undefined;
  isLoading: boolean;
}

const PaymentRemindersTab = ({ orders, isLoading }: PaymentRemindersTabProps) => {
  const [sendingMap, setSendingMap] = useState<Record<string, boolean>>({});
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});

  const failedOrders = useMemo(() =>
    orders?.filter(o => o.status === 'pending' || o.status === 'failed')
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()) || [],
    [orders]
  );

  const pagination = usePagination({ data: failedOrders, itemsPerPage: 15 });

  const pendingCount = failedOrders.filter(o => o.status === 'pending').length;
  const failedCount = failedOrders.filter(o => o.status === 'failed').length;
  const recentCount = failedOrders.filter(o => {
    if (!o.created_at) return false;
    return differenceInHours(new Date(), new Date(o.created_at)) <= 24;
  }).length;

  const handleSendReminder = async (order: OrderWithItems) => {
    setSendingMap(prev => ({ ...prev, [order.id]: true }));
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        toast.error('Please login again');
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-payment-reminder', {
        body: { order_id: order.id },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to send reminder');

      setSentMap(prev => ({ ...prev, [order.id]: true }));
      toast.success('Reminder sent!', {
        description: `WhatsApp reminder sent to ${order.customer_phone}`,
      });
    } catch (err: any) {
      console.error('Send reminder error:', err);
      toast.error('Failed to send reminder', {
        description: err.message || 'Please check WhatsApp settings',
      });
    } finally {
      setSendingMap(prev => ({ ...prev, [order.id]: false }));
    }
  };

  const handleSendAll = async () => {
    const recentFailed = failedOrders.filter(o => {
      if (!o.created_at) return false;
      return differenceInHours(new Date(), new Date(o.created_at)) <= 24 && !sentMap[o.id];
    });

    if (recentFailed.length === 0) {
      toast.info('No recent orders to remind');
      return;
    }

    toast.info(`Sending reminders to ${recentFailed.length} customers...`);
    let sent = 0;
    let failed = 0;

    for (const order of recentFailed) {
      try {
        setSendingMap(prev => ({ ...prev, [order.id]: true }));
        const { data, error } = await supabase.functions.invoke('send-payment-reminder', {
          body: { order_id: order.id },
        });
        if (error || !data?.success) throw new Error(data?.error || 'Failed');
        setSentMap(prev => ({ ...prev, [order.id]: true }));
        sent++;
      } catch {
        failed++;
      } finally {
        setSendingMap(prev => ({ ...prev, [order.id]: false }));
      }
      // Small delay between sends
      await new Promise(r => setTimeout(r, 1500));
    }

    toast.success(`Reminders complete: ${sent} sent, ${failed} failed`);
  };

  const getTimeSince = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    const hours = differenceInHours(new Date(), new Date(dateStr));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Payment Reminders</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Send WhatsApp reminders to customers with incomplete payments
          </p>
        </div>
        <Button
          onClick={handleSendAll}
          disabled={recentCount === 0}
          className="gap-2"
        >
          <Send className="h-4 w-4" />
          Remind All (Last 24h)
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pending Payments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{failedCount}</p>
                <p className="text-xs text-muted-foreground">Failed Payments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{recentCount}</p>
                <p className="text-xs text-muted-foreground">Last 24 Hours</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-3 px-4">
          <p className="text-sm text-muted-foreground">
            💡 A direct text message will be sent to the customer reminding them to retry the payment. No template setup needed.
          </p>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-medium text-foreground">Incomplete Payment Orders</h3>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : failedOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-secondary" />
              </div>
              <p className="font-medium text-foreground mb-1">All payments successful!</p>
              <p className="text-sm">No pending or failed payments found 🎉</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Order #</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Customer</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Amount</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Time</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagination.paginatedData.map((order) => (
                      <tr
                        key={order.id}
                        className={`border-b border-border last:border-0 hover:bg-muted/30 ${
                          order.status === 'failed' ? 'bg-destructive/5' : 'bg-yellow-500/5'
                        }`}
                      >
                        <td className="p-4 text-sm font-medium text-foreground font-mono">
                          {order.order_number}
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-foreground">{order.customer_name || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">{order.customer_email}</div>
                          <div className="text-xs text-muted-foreground">{order.customer_phone}</div>
                        </td>
                        <td className="p-4 text-sm font-medium price-text">₹{order.total_amount}</td>
                        <td className="p-4">
                          <Badge
                            variant={order.status === 'pending' ? 'outline' : 'destructive'}
                            className={
                              order.status === 'pending'
                                ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30'
                                : ''
                            }
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {order.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          <div>{getTimeSince(order.created_at)}</div>
                          <div className="text-xs">
                            {order.created_at ? format(new Date(order.created_at), 'MMM d, h:mm a') : 'N/A'}
                          </div>
                        </td>
                        <td className="p-4">
                          {sentMap[order.id] ? (
                            <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/30">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Sent
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendReminder(order)}
                              disabled={sendingMap[order.id]}
                              className="gap-1.5"
                            >
                              {sendingMap[order.id] ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <MessageCircle className="h-3 w-3" />
                              )}
                              Remind
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                startIndex={pagination.startIndex}
                endIndex={pagination.endIndex}
                totalItems={pagination.totalItems}
                onPrevPage={pagination.prevPage}
                onNextPage={pagination.nextPage}
                onGoToPage={pagination.goToPage}
              />
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default PaymentRemindersTab;
