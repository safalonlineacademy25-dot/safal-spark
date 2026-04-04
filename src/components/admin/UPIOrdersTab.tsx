import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  Image as ImageIcon,
  ExternalLink,
  User,
  Mail,
  Phone,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UPIOrder {
  id: string;
  customer_name: string | null;
  customer_email: string;
  customer_phone: string;
  product_id: string | null;
  product_name: string;
  product_price: number;
  amount: number;
  screenshot_url: string | null;
  status: string;
  admin_notes: string | null;
  whatsapp_optin: boolean | null;
  created_at: string;
  updated_at: string;
}

const UPIOrdersTab = () => {
  const [orders, setOrders] = useState<UPIOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<UPIOrder | null>(null);
  const [screenshotDialog, setScreenshotDialog] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<UPIOrder | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('upi_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch UPI orders');
      console.error(error);
    } else {
      setOrders((data as UPIOrder[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();

    // Real-time subscription
    const channel = supabase
      .channel('upi-orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'upi_orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleApprove = async (order: UPIOrder) => {
    setProcessingId(order.id);
    try {
      const { data, error } = await supabase.functions.invoke('approve-upi-order', {
        body: { upi_order_id: order.id },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Approval failed');

      toast.success('Order approved! Download links being sent.');
      fetchOrders();
    } catch (error: any) {
      toast.error('Approval failed', { description: error.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    setProcessingId(rejectDialog.id);
    try {
      const { error } = await supabase
        .from('upi_orders')
        .update({ status: 'rejected', admin_notes: adminNotes || 'Payment not verified' })
        .eq('id', rejectDialog.id);

      if (error) throw error;

      toast.success('Order rejected');
      setRejectDialog(null);
      setAdminNotes('');
      fetchOrders();
    } catch (error: any) {
      toast.error('Failed to reject', { description: error.message });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const processedOrders = orders.filter(o => o.status !== 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Pending Orders */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500" />
          Pending Verification ({pendingOrders.length})
        </h3>
        {pendingOrders.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No pending UPI orders</CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {pendingOrders.map((order) => (
              <Card key={order.id} className="border-amber-200/50">
                <CardContent className="pt-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(order.status)}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2 text-sm">
                        <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-muted-foreground" />{order.customer_name || 'N/A'}</span>
                        <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{order.customer_email}</span>
                        <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{order.customer_phone}</span>
                        <span className="flex items-center gap-1.5"><Package className="h-3.5 w-3.5 text-muted-foreground" />{order.product_name}</span>
                      </div>
                      <p className="text-lg font-bold text-foreground mt-1">₹{order.amount}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {order.screenshot_url && (
                        <Button variant="outline" size="sm" onClick={() => setScreenshotDialog(order.screenshot_url!)}>
                          <ImageIcon className="h-4 w-4 mr-1" /> View Screenshot
                        </Button>
                      )}
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApprove(order)}
                        disabled={!!processingId}
                      >
                        {processingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => { setRejectDialog(order); setAdminNotes(''); }}
                        disabled={!!processingId}
                      >
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Processed Orders */}
      {processedOrders.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Processed Orders ({processedOrders.length})</h3>
          <div className="grid gap-3">
            {processedOrders.slice(0, 20).map((order) => (
              <Card key={order.id} className="opacity-80">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getStatusBadge(order.status)}
                      <span className="text-sm truncate">{order.customer_name || order.customer_email}</span>
                      <span className="text-sm text-muted-foreground">—</span>
                      <span className="text-sm truncate">{order.product_name}</span>
                      <span className="text-sm font-semibold">₹{order.amount}</span>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(order.created_at), 'dd MMM, hh:mm a')}
                    </span>
                  </div>
                  {order.admin_notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic">Note: {order.admin_notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Screenshot Dialog */}
      <Dialog open={!!screenshotDialog} onOpenChange={() => setScreenshotDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Screenshot</DialogTitle>
          </DialogHeader>
          {screenshotDialog && (
            <div className="flex flex-col items-center gap-3">
              <img src={screenshotDialog} alt="Payment screenshot" className="max-h-[60vh] w-auto rounded-lg border" />
              <a href={screenshotDialog} target="_blank" rel="noopener noreferrer" className="text-sm text-primary flex items-center gap-1">
                <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <AlertDialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject UPI Order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reject the payment from {rejectDialog?.customer_name || rejectDialog?.customer_email}. 
              No download links will be sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for rejection (optional)"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Reject Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default UPIOrdersTab;
