import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Mail,
  AlertTriangle,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ShieldAlert,
  MessageCircle,
  IndianRupee,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PaginationControls from '@/components/admin/PaginationControls';
import { usePagination } from '@/hooks/usePagination';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FailedEmailLog {
  id: string;
  order_id: string;
  product_id: string | null;
  recipient_email: string;
  delivery_status: string;
  error_message: string | null;
  email_type: string;
  part_number: number | null;
  total_parts: number | null;
  resend_email_id: string | null;
  created_at: string;
  updated_at: string;
  orders: {
    order_number: string;
    customer_name: string | null;
    customer_phone: string;
    customer_email: string;
    status: string;
    total_amount: number;
    delivery_status: string | null;
    razorpay_payment_id: string | null;
  } | null;
  products: {
    name: string;
    category: string;
  } | null;
}

const FailedEmailsTab = () => {
  const queryClient = useQueryClient();
  const [resendingOrderId, setResendingOrderId] = useState<string | null>(null);
  const [notifyingOrderId, setNotifyingOrderId] = useState<string | null>(null);
  const [refundingLogId, setRefundingLogId] = useState<string | null>(null);

  const { data: failedEmails, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['failed-emails'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_delivery_logs')
        .select(`
          *,
          orders (order_number, customer_name, customer_phone, customer_email, status, total_amount, delivery_status, razorpay_payment_id),
          products (name, category)
        `)
        .in('delivery_status', ['failed', 'bounced', 'complained', 'delayed', 'pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FailedEmailLog[];
    },
    refetchOnWindowFocus: true,
  });

  // Check which orders already have refunds
  const { data: existingRefunds } = useQuery({
    queryKey: ['refund-order-ids'],
    queryFn: async () => {
      const { data } = await supabase
        .from('refunds')
        .select('order_id')
        .in('status', ['eligible', 'processing', 'completed']);
      return new Set((data || []).map(r => r.order_id));
    },
  });

  // Combo delivery progress - fetch ALL combo email logs (not just failed)
  const { data: comboProgress } = useQuery({
    queryKey: ['combo-delivery-progress'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_delivery_logs')
        .select(`
          order_id, part_number, total_parts, delivery_status, recipient_email, created_at,
          orders (order_number, customer_email, customer_phone, total_amount, delivery_status)
        `)
        .eq('email_type', 'combo_part')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by order_id, deduplicate by part_number (keep latest)
      const orderMap = new Map<string, {
        order_number: string;
        customer_email: string;
        customer_phone: string;
        total_amount: number;
        order_delivery_status: string | null;
        total_parts: number;
        parts: Map<number, { status: string; created_at: string }>;
      }>();

      for (const log of (data || [])) {
        const orderId = log.order_id;
        if (!orderMap.has(orderId)) {
          orderMap.set(orderId, {
            order_number: (log.orders as any)?.order_number || '—',
            customer_email: (log.orders as any)?.customer_email || '',
            customer_phone: (log.orders as any)?.customer_phone || '',
            total_amount: (log.orders as any)?.total_amount || 0,
            order_delivery_status: (log.orders as any)?.delivery_status || null,
            total_parts: log.total_parts || 0,
            parts: new Map(),
          });
        }
        const order = orderMap.get(orderId)!;
        if (log.total_parts && log.total_parts > order.total_parts) {
          order.total_parts = log.total_parts;
        }
        const partNum = log.part_number || 0;
        // Keep latest status per part
        if (!order.parts.has(partNum) || new Date(log.created_at) > new Date(order.parts.get(partNum)!.created_at)) {
          order.parts.set(partNum, { status: log.delivery_status, created_at: log.created_at });
        }
      }

      return Array.from(orderMap.entries()).map(([orderId, info]) => {
        const deliveredCount = Array.from(info.parts.values()).filter(p => p.status === 'delivered' || p.status === 'sent').length;
        const failedCount = Array.from(info.parts.values()).filter(p => ['failed', 'bounced', 'complained'].includes(p.status)).length;
        const pendingCount = Array.from(info.parts.values()).filter(p => ['pending', 'delayed'].includes(p.status)).length;
        return {
          orderId,
          ...info,
          deliveredCount,
          failedCount,
          pendingCount,
          isComplete: deliveredCount === info.total_parts && info.total_parts > 0,
          hasIssues: failedCount > 0 || pendingCount > 0,
        };
      });
    },
    refetchOnWindowFocus: true,
  });

  const pagination = usePagination({ data: failedEmails, itemsPerPage: 15 });

  // Stats
  const failedCount = failedEmails?.filter(e => e.delivery_status === 'failed').length || 0;
  const bouncedCount = failedEmails?.filter(e => e.delivery_status === 'bounced').length || 0;
  const delayedCount = failedEmails?.filter(e => e.delivery_status === 'delayed').length || 0;
  const complainedCount = failedEmails?.filter(e => e.delivery_status === 'complained').length || 0;
  const pendingCount = failedEmails?.filter(e => e.delivery_status === 'pending').length || 0;

  const handleResendEmail = async (orderId: string) => {
    setResendingOrderId(orderId);
    try {
      const now = new Date();
      const { data: existingTokens } = await supabase
        .from('download_tokens')
        .select('id, expires_at')
        .eq('order_id', orderId);

      if (existingTokens && existingTokens.length > 0) {
        const expiredTokens = existingTokens.filter((t: any) =>
          t.expires_at && new Date(t.expires_at) <= now
        );
        if (expiredTokens.length > 0) {
          await supabase.from('download_tokens').delete().eq('order_id', orderId);
        }
      }

      const { data, error } = await supabase.functions.invoke('process-order-delivery', {
        body: { order_id: orderId },
      });

      if (error) throw error;

      toast.success('Email resent successfully', {
        description: data?.emails_sent > 1 ? `${data.emails_sent} emails sent` : 'Download link sent',
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (err: any) {
      console.error('Resend email error:', err);
      toast.error('Failed to resend email', { description: err.message });
    } finally {
      setResendingOrderId(null);
    }
  };

  const handleWhatsAppNotify = async (log: FailedEmailLog) => {
    if (!log.orders) return;
    setNotifyingOrderId(log.order_id);
    try {
      const { data, error } = await supabase.functions.invoke('notify-delivery-failure', {
        body: {
          order_id: log.order_id,
          error_reason: log.error_message || `Email delivery ${log.delivery_status} for ${log.recipient_email}`,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('WhatsApp notification sent', {
          description: `Customer notified on ${log.orders.customer_phone}`,
        });
      } else {
        toast.error('WhatsApp notification failed', { description: data?.error });
      }
    } catch (err: any) {
      console.error('WhatsApp notify error:', err);
      toast.error('Failed to send WhatsApp', { description: err.message });
    } finally {
      setNotifyingOrderId(null);
    }
  };

  const handleMarkForRefund = async (log: FailedEmailLog) => {
    if (!log.orders || !log.orders.razorpay_payment_id) {
      toast.error('Cannot create refund', { description: 'No payment ID found for this order' });
      return;
    }
    if (existingRefunds?.has(log.order_id)) {
      toast.info('Refund already exists for this order');
      return;
    }
    setRefundingLogId(log.id);
    try {
      const { error } = await supabase.from('refunds').insert({
        order_id: log.order_id,
        amount: log.orders.total_amount,
        razorpay_payment_id: log.orders.razorpay_payment_id,
        reason: 'email_delivery_failed',
        failed_email: log.recipient_email,
        status: 'eligible',
      });

      if (error) throw error;

      toast.success('Marked for refund', {
        description: `Order ${log.orders.order_number} is now eligible for refund`,
      });
      queryClient.invalidateQueries({ queryKey: ['refund-order-ids'] });
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
    } catch (err: any) {
      console.error('Mark refund error:', err);
      toast.error('Failed to create refund entry', { description: err.message });
    } finally {
      setRefundingLogId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
            <XCircle className="h-3 w-3" /> Failed
          </span>
        );
      case 'bounced':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
            <ShieldAlert className="h-3 w-3" /> Bounced
          </span>
        );
      case 'complained':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-600">
            <AlertTriangle className="h-3 w-3" /> Complained
          </span>
        );
      case 'delayed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-600">
            <Clock className="h-3 w-3" /> Delayed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-600">
            <Clock className="h-3 w-3" /> Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            {status}
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-16 space-y-4">
        <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
        <p className="text-destructive font-medium">Failed to load email logs</p>
        <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
        <Button variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Failed / Pending Email Deliveries</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-destructive/10">
              <XCircle className="h-4 w-4 text-destructive" />
            </div>
            <span className="text-xs text-muted-foreground">Failed</span>
          </div>
          <p className="text-xl font-bold text-foreground">{failedCount}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-destructive/10">
              <ShieldAlert className="h-4 w-4 text-destructive" />
            </div>
            <span className="text-xs text-muted-foreground">Bounced</span>
          </div>
          <p className="text-xl font-bold text-foreground">{bouncedCount}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-orange-500/10">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </div>
            <span className="text-xs text-muted-foreground">Complained</span>
          </div>
          <p className="text-xl font-bold text-foreground">{complainedCount}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-yellow-500/10">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
            <span className="text-xs text-muted-foreground">Delayed</span>
          </div>
          <p className="text-xl font-bold text-foreground">{delayedCount}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-yellow-500/10">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
            <span className="text-xs text-muted-foreground">Pending</span>
          </div>
          <p className="text-xl font-bold text-foreground">{pendingCount}</p>
        </div>
      </div>

      {/* Combo Delivery Progress */}
      {comboProgress && comboProgress.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border bg-primary/5 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h3 className="font-medium text-foreground">
              Combo Pack Delivery Progress ({comboProgress.length} orders)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Order #</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Customer</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Progress</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Parts Status</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Overall</th>
                </tr>
              </thead>
              <tbody>
                {comboProgress.slice(0, 20).map((combo) => {
                  const progressPct = combo.total_parts > 0 ? Math.round((combo.deliveredCount / combo.total_parts) * 100) : 0;
                  return (
                    <tr key={combo.orderId} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="p-3 text-sm font-mono font-medium text-foreground">
                        {combo.order_number}
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-foreground">{combo.customer_email}</div>
                        <div className="text-xs text-muted-foreground">📱 {combo.customer_phone}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-[80px]">
                            <div
                              className={`h-full rounded-full transition-all ${
                                combo.isComplete ? 'bg-emerald-500' : combo.hasIssues ? 'bg-orange-500' : 'bg-primary'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-foreground whitespace-nowrap">
                            {combo.deliveredCount}/{combo.total_parts}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {Array.from({ length: combo.total_parts }, (_, i) => {
                            const part = combo.parts.get(i + 1);
                            const status = part?.status || 'missing';
                            return (
                              <span
                                key={i}
                                title={`Part ${i + 1}: ${status}`}
                                className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold ${
                                  status === 'delivered' || status === 'sent'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : status === 'failed' || status === 'bounced'
                                    ? 'bg-destructive/10 text-destructive'
                                    : status === 'pending' || status === 'delayed'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {i + 1}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="p-3">
                        {combo.isComplete ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            <CheckCircle className="h-3 w-3" /> Complete
                          </span>
                        ) : combo.hasIssues ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                            <AlertTriangle className="h-3 w-3" /> Issues
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                            <Clock className="h-3 w-3" /> In Progress
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-xl border border-destructive/20 overflow-hidden">
        <div className="p-4 border-b border-border bg-destructive/5 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h3 className="font-medium text-foreground">
            Email Issues ({failedEmails?.length || 0} entries)
          </h3>
        </div>

        {!failedEmails || failedEmails.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-secondary" />
            </div>
            <p className="font-medium text-foreground mb-1">All emails delivered!</p>
            <p className="text-sm">No failed or pending emails found. 🎉</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Order #</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Recipient</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Product</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Part</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Error</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagination.paginatedData.map((log) => {
                    const hasRefund = existingRefunds?.has(log.order_id);
                    return (
                      <tr
                        key={log.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30"
                      >
                        <td className="p-4 text-sm font-medium text-foreground font-mono">
                          {log.orders?.order_number || '—'}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-primary" />
                              <span className="text-sm text-foreground">{log.recipient_email}</span>
                            </div>
                            {log.orders?.customer_phone && (
                              <span className="text-xs text-muted-foreground ml-6">📱 {log.orders.customer_phone}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {log.products?.name || '—'}
                          {log.products?.category === 'combo-pack' && (
                            <Badge variant="outline" className="ml-1.5 text-[10px]">Combo</Badge>
                          )}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {log.part_number && log.total_parts
                            ? `${log.part_number}/${log.total_parts}`
                            : '—'}
                        </td>
                        <td className="p-4">{getStatusBadge(log.delivery_status)}</td>
                        <td className="p-4">
                          {log.error_message ? (
                            <span className="text-xs text-destructive max-w-[200px] block truncate" title={log.error_message}>
                              {log.error_message}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.created_at), 'MMM d, h:mm a')}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1.5">
                            {/* Resend Email */}
                            {log.orders && (log.orders.status === 'paid' || log.orders.status === 'completed') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResendEmail(log.order_id)}
                                disabled={resendingOrderId === log.order_id}
                                className="gap-1.5 text-xs h-7"
                              >
                                {resendingOrderId === log.order_id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3 w-3" />
                                )}
                                Resend
                              </Button>
                            )}

                            {/* WhatsApp Notify */}
                            {log.orders && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleWhatsAppNotify(log)}
                                disabled={notifyingOrderId === log.order_id}
                                className="gap-1.5 text-xs h-7 border-green-500/30 text-green-700 hover:bg-green-50 hover:text-green-800"
                              >
                                {notifyingOrderId === log.order_id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <MessageCircle className="h-3 w-3" />
                                )}
                                WhatsApp
                              </Button>
                            )}

                            {/* Mark for Refund */}
                            {log.orders && log.orders.razorpay_payment_id && !hasRefund && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkForRefund(log)}
                                disabled={refundingLogId === log.id}
                                className="gap-1.5 text-xs h-7 border-orange-500/30 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
                              >
                                {refundingLogId === log.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <IndianRupee className="h-3 w-3" />
                                )}
                                Refund
                              </Button>
                            )}

                            {hasRefund && (
                              <span className="text-[10px] text-orange-600 font-medium">Refund created</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
    </motion.div>
  );
};

export default FailedEmailsTab;
