import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { FileDown, FileText, Truck, RefreshCw, Loader2 } from 'lucide-react';

function toTitleCase(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

interface HCOrder {
  id: string;
  order_number: string;
  product_name: string;
  quantity: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
  landmark: string | null;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
}

const STATUS_OPTIONS = ['all', 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function CourierExportTab() {
  const [orders, setOrders] = useState<HCOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('paid');
  const [paymentFilter, setPaymentFilter] = useState<string>('paid');
  const [search, setSearch] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('hard_copy_orders' as any)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Failed to load orders');
    } else {
      setOrders((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (paymentFilter !== 'all' && o.payment_status !== paymentFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !o.order_number?.toLowerCase().includes(q) &&
          !o.customer_name?.toLowerCase().includes(q) &&
          !o.customer_phone?.includes(q) &&
          !o.city?.toLowerCase().includes(q) &&
          !o.pincode?.includes(q)
        ) return false;
      }
      return true;
    });
  }, [orders, statusFilter, paymentFilter, search]);

  const allSelected = filtered.length > 0 && filtered.every((o) => selected.has(o.id));
  const toggleAll = () => {
    if (allSelected) {
      const next = new Set(selected);
      filtered.forEach((o) => next.delete(o.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      filtered.forEach((o) => next.add(o.id));
      setSelected(next);
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const getExportRows = () => {
    const ids = selected.size > 0 ? selected : new Set(filtered.map((o) => o.id));
    return orders.filter((o) => ids.has(o.id));
  };

  const escapeCsv = (val: any) => {
    const s = val == null ? '' : String(val);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const exportCSV = () => {
    const rows = getExportRows();
    if (rows.length === 0) {
      toast.error('No orders to export');
      return;
    }
    const headers = [
      'Order Number', 'Order Date', 'Customer Name', 'Phone', 'Email',
      'Address Line 1', 'Address Line 2', 'Landmark', 'City', 'State', 'Pincode',
      'Product', 'Quantity', 'Amount (INR)', 'Status',
    ];
    const lines = [headers.join(',')];
    rows.forEach((o) => {
      lines.push([
        o.order_number,
        format(new Date(o.created_at), 'yyyy-MM-dd'),
        toTitleCase(o.customer_name),
        o.customer_phone,
        o.customer_email,
        toTitleCase(o.address_line1),
        toTitleCase(o.address_line2),
        toTitleCase(o.landmark),
        toTitleCase(o.city),
        toTitleCase(o.state),
        o.pincode,
        o.product_name,
        o.quantity,
        o.total_amount,
        o.status,
      ].map(escapeCsv).join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `courier-shipments-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} shipment(s) to CSV`);
  };

  const printLabels = () => {
    const rows = getExportRows();
    if (rows.length === 0) {
      toast.error('No orders to print');
      return;
    }
    const labels = rows.map((o) => `
      <div class="label">
        <div class="hdr">
          <div class="from">
            <div class="muted">FROM:</div>
            <div class="bold">Safal Online Solutions</div>
            <div>support@safalonlinesolutions.com</div>
          </div>
          <div class="order">#${o.order_number}</div>
        </div>
        <div class="to">
          <div class="muted">DELIVER TO:</div>
          <div class="name">${toTitleCase(o.customer_name)}</div>
          <div>${toTitleCase(o.address_line1)}</div>
          ${o.address_line2 ? `<div>${toTitleCase(o.address_line2)}</div>` : ''}
          ${o.landmark ? `<div>Landmark: ${toTitleCase(o.landmark)}</div>` : ''}
          <div>${toTitleCase(o.city)}, ${toTitleCase(o.state)} - <strong>${o.pincode}</strong></div>
          <div class="phone">📞 ${o.customer_phone}</div>
        </div>
        <div class="ftr">
          <div>${o.product_name} × ${o.quantity}</div>
          <div>${format(new Date(o.created_at), 'dd MMM yyyy')}</div>
        </div>
      </div>
    `).join('');

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Courier Labels</title>
      <style>
        @page { size: A4; margin: 10mm; }
        body { font-family: Arial, sans-serif; margin: 0; color: #111; }
        .label { border: 2px solid #111; padding: 14px; margin-bottom: 10px; page-break-inside: avoid; border-radius: 4px; }
        .hdr { display: flex; justify-content: space-between; border-bottom: 1px dashed #555; padding-bottom: 8px; margin-bottom: 10px; font-size: 11px; }
        .order { font-weight: 700; font-size: 14px; }
        .muted { color: #555; font-size: 10px; letter-spacing: 0.5px; }
        .bold { font-weight: 700; }
        .to { font-size: 14px; line-height: 1.5; }
        .to .name { font-size: 18px; font-weight: 700; margin: 4px 0; }
        .to .phone { margin-top: 6px; font-weight: 600; }
        .ftr { display: flex; justify-content: space-between; border-top: 1px dashed #555; padding-top: 8px; margin-top: 10px; font-size: 11px; color: #333; }
        @media print { .label { page-break-after: auto; } }
      </style></head><body>${labels}<script>window.onload=()=>window.print()</script></body></html>`;

    const w = window.open('', '_blank');
    if (!w) { toast.error('Popup blocked - allow popups to print labels'); return; }
    w.document.write(html);
    w.document.close();
    toast.success(`Generated ${rows.length} shipping label(s)`);
  };

  const selectedCount = selected.size;
  const exportCount = selectedCount > 0 ? selectedCount : filtered.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="h-6 w-6 text-primary" /> Courier Shipments
        </h2>
        <p className="text-sm text-muted-foreground">
          Export hard-copy book orders with customer name & address for your courier vendor. Send the CSV or print ready-to-paste shipping labels.
        </p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Order Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Payment</Label>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Search (order #, name, phone, city, pincode)</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {filtered.length} order(s) match · {selectedCount} selected
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={printLabels} disabled={filtered.length === 0}>
              <FileText className="h-4 w-4 mr-2" /> Print Labels ({exportCount})
            </Button>
            <Button size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
              <FileDown className="h-4 w-4 mr-2" /> Export CSV ({exportCount})
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No orders match the current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Checkbox checked={selected.has(o.id)} onCheckedChange={() => toggleOne(o.id)} />
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-semibold">{o.order_number}</div>
                      <div className="text-muted-foreground">{format(new Date(o.created_at), 'dd MMM')}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium">{toTitleCase(o.customer_name)}</div>
                      <div className="text-muted-foreground">{o.customer_phone}</div>
                    </TableCell>
                    <TableCell className="text-xs max-w-[280px]">
                      <div>{toTitleCase(o.address_line1)}{o.address_line2 ? `, ${toTitleCase(o.address_line2)}` : ''}</div>
                      <div className="text-muted-foreground">{toTitleCase(o.city)}, {toTitleCase(o.state)} - {o.pincode}</div>
                    </TableCell>
                    <TableCell className="text-xs">{o.product_name} × {o.quantity}</TableCell>
                    <TableCell>
                      <Badge variant={o.status === 'shipped' || o.status === 'delivered' ? 'default' : 'secondary'} className="text-xs">
                        {o.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
