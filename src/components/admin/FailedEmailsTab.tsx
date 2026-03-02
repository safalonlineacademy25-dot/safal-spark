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
    status: string;
    total_amount: number;
    delivery_status: string | null;
  } | null;
  products: {
    name: string;
    category: string;
  } | null;
}

const FailedEmailsTab = () => {
  const queryClient = useQueryClient();
  const [resendingOrderId, setResendingOrderId] = useState<string | null>(null);

  const { data: failedEmails, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['failed-emails'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_delivery_logs')
        .select(`
          *,
          orders (order_number, customer_name, customer_phone, status, total_amount, delivery_status),
          products (name, category)
        `)
        .in('delivery_status', ['failed', 'bounced', 'complained', 'delayed', 'pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FailedEmailLog[];
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
      // Delete expired tokens first
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
          await supabase
            .from('download_tokens')
            .delete()
            .eq('order_id', orderId);
        }
      }

      const { data, error } = await supabase.functions.invoke('process-order-delivery', {
        body: { order_id: orderId },
      });

      if (error) throw error;

      toast.success('Email resent successfully', {
        description: data?.emails_sent > 1
          ? `${data.emails_sent} emails sent`
          : 'Download link sent',
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
                  {pagination.paginatedData.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="p-4 text-sm font-medium text-foreground font-mono">
                        {log.orders?.order_number || '—'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-primary" />
                          <span className="text-sm text-foreground">{log.recipient_email}</span>
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
                        {log.orders && (log.orders.status === 'paid' || log.orders.status === 'completed') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResendEmail(log.order_id)}
                            disabled={resendingOrderId === log.order_id}
                            className="gap-1.5"
                          >
                            {resendingOrderId === log.order_id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                            Resend
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
    </motion.div>
  );
};

export default FailedEmailsTab;
