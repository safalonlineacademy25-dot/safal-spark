import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Loader2, Truck, CheckCircle2, Clock, MapPin, User, Phone, Mail, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HCOrder {
  id: string; order_number: string; product_name: string; product_price: number;
  total_amount: number; customer_name: string; customer_email: string; customer_phone: string;
  whatsapp_optin: boolean | null;
  address_line1: string; address_line2: string | null; city: string; state: string;
  pincode: string; landmark: string | null;
  payment_status: string; status: string;
  courier_name: string | null; tracking_id: string | null;
  shipped_at: string | null; delivered_at: string | null; admin_notes: string | null;
  created_at: string;
}

const statusBadge = (s: string) => {
  const map: Record<string, { cls: string; icon: any; label: string }> = {
    pending: { cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock, label: 'Pending Payment' },
    paid: { cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: Package, label: 'Paid - Pack & Ship' },
    shipped: { cls: 'bg-purple-50 text-purple-700 border-purple-200', icon: Truck, label: 'Shipped' },
    delivered: { cls: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle2, label: 'Delivered' },
    cancelled: { cls: 'bg-red-50 text-red-700 border-red-200', icon: Clock, label: 'Cancelled' },
  };
  const m = map[s] || { cls: '', icon: Clock, label: s };
  const Icon = m.icon;
  return <Badge variant="outline" className={m.cls}><Icon className="h-3 w-3 mr-1" />{m.label}</Badge>;
};

const HardCopyOrdersTab = () => {
  const [orders, setOrders] = useState<HCOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [shipDialog, setShipDialog] = useState<HCOrder | null>(null);
  const [shipForm, setShipForm] = useState({ courier_name: '', tracking_id: '', admin_notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('hard_copy_orders' as any).select('*').order('created_at', { ascending: false });
    if (error) toast.error('Failed to load orders');
    else setOrders((data as unknown as HCOrder[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    const ch = supabase.channel('hc-orders').on('postgres_changes', { event: '*', schema: 'public', table: 'hard_copy_orders' }, fetchOrders).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleShip = async () => {
    if (!shipDialog) return;
    if (!shipForm.courier_name.trim() || !shipForm.tracking_id.trim()) {
      toast.error('Courier name and tracking ID are required');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('ship-hardcopy-order', {
        body: { order_id: shipDialog.id, ...shipForm },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed');
      toast.success(`Order marked as shipped${data.whatsappSent ? ' (WhatsApp sent)' : data.whatsappError ? ' (WhatsApp not sent)' : ''}`);
      setShipDialog(null);
      setShipForm({ courier_name: '', tracking_id: '', admin_notes: '' });
      fetchOrders();
    } catch (e: any) {
      toast.error('Could not mark as shipped', { description: e?.message });
    } finally {
      setSubmitting(false);
    }
  };

  const markDelivered = async (o: HCOrder) => {
    const { error } = await supabase.from('hard_copy_orders' as any)
      .update({ status: 'delivered', delivered_at: new Date().toISOString() }).eq('id', o.id);
    if (error) toast.error('Failed', { description: error.message });
    else { toast.success('Marked delivered'); fetchOrders(); }
  };

  const pending = orders.filter(o => o.payment_status === 'paid' && (o.status === 'paid' || o.status === 'processing'));
  const shipped = orders.filter(o => o.status === 'shipped');
  const others = orders.filter(o => !pending.includes(o) && !shipped.includes(o));

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const renderOrder = (o: HCOrder) => (
    <Card key={o.id}>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {statusBadge(o.status)}
              <span className="text-xs font-mono text-muted-foreground">{o.order_number}</span>
              <span className="text-xs text-muted-foreground">{format(new Date(o.created_at), 'dd MMM yyyy, hh:mm a')}</span>
            </div>
            <p className="font-semibold">{o.product_name} <span className="text-muted-foreground font-normal">— ₹{o.total_amount}</span></p>
          </div>
          <div className="flex gap-2">
            {o.payment_status === 'paid' && (o.status === 'paid' || o.status === 'processing') && (
              <Button size="sm" onClick={() => { setShipDialog(o); setShipForm({ courier_name: '', tracking_id: '', admin_notes: '' }); }}>
                <Truck className="h-4 w-4 mr-1" /> Mark Shipped
              </Button>
            )}
            {o.status === 'shipped' && (
              <Button size="sm" variant="outline" onClick={() => markDelivered(o)}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Mark Delivered
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-muted-foreground" />{o.customer_name}</span>
          <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{o.customer_phone}</span>
          <span className="flex items-center gap-1.5 sm:col-span-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{o.customer_email}</span>
        </div>
        <div className="flex items-start gap-2 text-sm bg-muted/40 rounded-lg p-3">
          <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div>
            {o.address_line1}{o.address_line2 ? `, ${o.address_line2}` : ''}<br />
            {o.city}, {o.state} - <span className="font-semibold">{o.pincode}</span>
            {o.landmark && <><br /><span className="text-muted-foreground text-xs">Landmark: {o.landmark}</span></>}
          </div>
        </div>
        {o.courier_name && (
          <div className="text-sm bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3 flex items-center gap-2 flex-wrap">
            <Truck className="h-4 w-4 text-purple-600" />
            <span><strong>{o.courier_name}</strong> · Tracking: <span className="font-mono">{o.tracking_id}</span></span>
            {o.shipped_at && <span className="text-xs text-muted-foreground">on {format(new Date(o.shipped_at), 'dd MMM, hh:mm a')}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Book / Hard Copy Orders</h2>
        <p className="text-sm text-muted-foreground">Pack and ship paid orders to customer addresses. Add courier + tracking ID to notify the customer on WhatsApp.</p>
      </div>

      <section>
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Package className="h-5 w-5 text-blue-600" /> Ready to Ship ({pending.length})</h3>
        {pending.length === 0 ? <Card><CardContent className="py-6 text-center text-muted-foreground">No paid orders awaiting shipment.</CardContent></Card>
          : <div className="grid gap-3">{pending.map(renderOrder)}</div>}
      </section>

      {shipped.length > 0 && (
        <section>
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Truck className="h-5 w-5 text-purple-600" /> Shipped ({shipped.length})</h3>
          <div className="grid gap-3">{shipped.map(renderOrder)}</div>
        </section>
      )}

      {others.length > 0 && (
        <section>
          <h3 className="font-semibold mb-3">Other Orders ({others.length})</h3>
          <div className="grid gap-3">{others.slice(0, 30).map(renderOrder)}</div>
        </section>
      )}

      <Dialog open={!!shipDialog} onOpenChange={() => setShipDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark Order as Shipped</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Order <span className="font-mono">{shipDialog?.order_number}</span> · {shipDialog?.product_name}</p>
            <div className="space-y-2"><Label>Courier Name *</Label><Input value={shipForm.courier_name} onChange={e => setShipForm({ ...shipForm, courier_name: e.target.value })} placeholder="e.g. DTDC, India Post, Delhivery" /></div>
            <div className="space-y-2"><Label>Tracking ID *</Label><Input value={shipForm.tracking_id} onChange={e => setShipForm({ ...shipForm, tracking_id: e.target.value })} placeholder="Tracking / AWB number" /></div>
            <div className="space-y-2"><Label>Internal Notes</Label><Textarea rows={2} value={shipForm.admin_notes} onChange={e => setShipForm({ ...shipForm, admin_notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShipDialog(null)}>Cancel</Button>
            <Button onClick={handleShip} disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Confirm & Notify Customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HardCopyOrdersTab;
