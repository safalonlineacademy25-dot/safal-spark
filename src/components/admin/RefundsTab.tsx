import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Loader2, RefreshCw, AlertCircle, CheckCircle, XCircle, MessageCircle, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import PaginationControls from './PaginationControls';
import { usePagination } from '@/hooks/usePagination';

interface RefundWithOrder {
  id: string;
  order_id: string;
  razorpay_payment_id: string;
  razorpay_refund_id: string | null;
  amount: number;
  currency: string;
  reason: string;
  failed_email: string | null;
  status: string;
  error_message: string | null;
  whatsapp_sent: boolean | null;
  created_at: string;
  processed_at: string | null;
  orders: {
    order_number: string;
    customer_email: string;
    customer_phone: string;
    customer_name: string | null;
    total_amount: number;
  } | null;
}

const RefundsTab = () => {
  const queryClient = useQueryClient();
  const [processingRefundId, setProcessingRefundId] = useState<string | null>(null);

  // Fetch refunds with order details
  const { data: refunds, isLoading, refetch, isError, error } = useQuery({
    queryKey: ['refunds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('refunds')
        .select(`
          *,
          orders (
            order_number,
            customer_email,
            customer_phone,
            customer_name,
            total_amount
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RefundWithOrder[];
    },
  });

  const pagination = usePagination({ data: refunds, itemsPerPage: 15 });

  const handleProcessRefund = async (refundId: string) => {
    setProcessingRefundId(refundId);
    try {
      const { data, error } = await supabase.functions.invoke('process-refund', {
        body: { refundId },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Refund processed successfully', {
          description: data.message || `Refund ID: ${data.razorpayRefundId}`,
        });
        
        if (data.whatsappSent) {
          toast.success('WhatsApp notification sent', {
            description: 'Customer has been notified about the refund',
          });
        }
        
        refetch();
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      } else {
        throw new Error(data?.error || 'Refund processing failed');
      }
    } catch (err: any) {
      console.error('Refund processing error:', err);
      toast.error('Failed to process refund', {
        description: err.message || 'Please try again',
      });
      refetch();
    } finally {
      setProcessingRefundId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'eligible':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Eligible</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Processing</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getReasonDisplay = (reason: string) => {
    switch (reason) {
      case 'email_delivery_failed':
        return (
          <div className="flex items-center gap-1 text-destructive">
            <Mail className="h-3.5 w-3.5" />
            <span>Email Delivery Failed</span>
          </div>
        );
      case 'customer_request':
        return 'Customer Request';
      default:
        return reason;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-destructive">Failed to load refunds</p>
          <p className="text-sm text-muted-foreground">{(error as Error)?.message}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  const eligibleRefunds = refunds?.filter(r => r.status === 'eligible') || [];
  const processedRefunds = refunds?.filter(r => r.status !== 'eligible') || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-6"
    >
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Eligible for Refund</p>
          <p className="text-2xl font-bold text-yellow-600">{eligibleRefunds.length}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Completed Refunds</p>
          <p className="text-2xl font-bold text-green-600">
            {refunds?.filter(r => r.status === 'completed').length || 0}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Failed Refunds</p>
          <p className="text-2xl font-bold text-destructive">
            {refunds?.filter(r => r.status === 'failed').length || 0}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Total Refunded</p>
          <p className="text-2xl font-bold text-foreground">
            ₹{refunds?.filter(r => r.status === 'completed').reduce((sum, r) => sum + Number(r.amount), 0).toLocaleString() || 0}
          </p>
        </div>
      </div>

      {/* Eligible Refunds Section */}
      {eligibleRefunds.length > 0 && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <h3 className="font-semibold text-foreground">Pending Refunds ({eligibleRefunds.length})</h3>
          </div>
          <div className="space-y-3">
            {eligibleRefunds.map((refund) => (
              <div key={refund.id} className="bg-card rounded-lg border border-border p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-medium">{refund.orders?.order_number}</span>
                    {getStatusBadge(refund.status)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {refund.orders?.customer_name || refund.orders?.customer_email}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {getReasonDisplay(refund.reason)}
                    {refund.failed_email && (
                      <span className="ml-2 text-destructive">({refund.failed_email})</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-lg">₹{Number(refund.amount).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    {refund.created_at && format(new Date(refund.created_at), 'MMM d, h:mm a')}
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="default" 
                      size="sm"
                      disabled={processingRefundId === refund.id}
                    >
                      {processingRefundId === refund.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Process Refund
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Refund</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to process this refund?
                        <br /><br />
                        <strong>Order:</strong> {refund.orders?.order_number}<br />
                        <strong>Amount:</strong> ₹{Number(refund.amount).toLocaleString()}<br />
                        <strong>Reason:</strong> {refund.reason.replace(/_/g, ' ')}<br />
                        {refund.failed_email && (
                          <>
                            <strong>Failed Email:</strong> {refund.failed_email}
                          </>
                        )}
                        <br /><br />
                        This action will refund the payment via Razorpay and send a WhatsApp notification to the customer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleProcessRefund(refund.id)}>
                        Proceed with Refund
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Refunds Table */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">All Refunds</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {!refunds || refunds.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
            <p className="text-lg font-medium">No refunds yet</p>
            <p className="text-sm">Refunds for failed email deliveries will appear here.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Order #</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Customer</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Reason</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">WhatsApp</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {pagination.paginatedData.map((refund) => (
                    <tr key={refund.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="p-4 text-sm font-medium text-foreground font-mono">
                        {refund.orders?.order_number || 'N/A'}
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-foreground">{refund.orders?.customer_name || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">{refund.orders?.customer_email}</div>
                      </td>
                      <td className="p-4 text-sm font-medium text-foreground">
                        ₹{Number(refund.amount).toLocaleString()}
                      </td>
                      <td className="p-4 text-sm">
                        {getReasonDisplay(refund.reason)}
                        {refund.failed_email && (
                          <div className="text-xs text-destructive truncate max-w-[150px]" title={refund.failed_email}>
                            {refund.failed_email}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        {getStatusBadge(refund.status)}
                        {refund.error_message && (
                          <div className="text-xs text-destructive mt-1 truncate max-w-[150px]" title={refund.error_message}>
                            {refund.error_message}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        {refund.whatsapp_sent ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <MessageCircle className="h-4 w-4" />
                            <span className="text-xs">Sent</span>
                          </div>
                        ) : refund.status === 'completed' ? (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <XCircle className="h-4 w-4" />
                            <span className="text-xs">Not sent</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {refund.created_at && format(new Date(refund.created_at), 'MMM d, yyyy')}
                        {refund.processed_at && (
                          <div className="text-xs text-green-600">
                            Processed: {format(new Date(refund.processed_at), 'MMM d, h:mm a')}
                          </div>
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

export default RefundsTab;
