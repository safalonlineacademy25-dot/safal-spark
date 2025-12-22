import { useState } from 'react';
import { Eye, Loader2, Package, Mail, Phone, User, Calendar, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useOrderWithItems, Order } from '@/hooks/useOrders';
import { format } from 'date-fns';

interface OrderDetailsDialogProps {
  order: Order;
}

const OrderDetailsDialog = ({ order }: OrderDetailsDialogProps) => {
  const [open, setOpen] = useState(false);
  const { data: orderWithItems, isLoading } = useOrderWithItems(open ? order.id : null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
        return 'bg-secondary/10 text-secondary';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-600';
      case 'failed':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getDeliveryStatusColor = (status: string | null) => {
    switch (status) {
      case 'delivered':
        return 'bg-secondary/10 text-secondary';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-600';
      case 'failed':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Details - {order.order_number}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : orderWithItems ? (
          <div className="space-y-6">
            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(orderWithItems.status)}`}>
                Payment: {orderWithItems.status}
              </span>
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium capitalize ${getDeliveryStatusColor(orderWithItems.delivery_status)}`}>
                Delivery: {orderWithItems.delivery_status || 'pending'}
              </span>
            </div>

            {/* Customer Info */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-foreground">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Name:</span>
                  <span className="text-foreground">{orderWithItems.customer_name || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span className="text-foreground">{orderWithItems.customer_email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="text-foreground">{orderWithItems.customer_phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Date:</span>
                  <span className="text-foreground">
                    {orderWithItems.created_at ? format(new Date(orderWithItems.created_at), 'PPp') : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Razorpay Order ID:</span>
                  <p className="text-foreground font-mono text-xs mt-1">{orderWithItems.razorpay_order_id || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Razorpay Payment ID:</span>
                  <p className="text-foreground font-mono text-xs mt-1">{orderWithItems.razorpay_payment_id || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Order Items</h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Product</th>
                      <th className="text-center p-3 text-xs font-medium text-muted-foreground">Qty</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Price</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderWithItems.order_items.map((item) => (
                      <tr key={item.id} className="border-t border-border">
                        <td className="p-3 text-sm text-foreground">{item.product_name}</td>
                        <td className="p-3 text-sm text-center text-muted-foreground">{item.quantity || 1}</td>
                        <td className="p-3 text-sm text-right text-muted-foreground">₹{item.product_price}</td>
                        <td className="p-3 text-sm text-right font-medium text-foreground">
                          ₹{(item.product_price * (item.quantity || 1)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-muted/30">
                      <td colSpan={3} className="p-3 text-sm font-semibold text-foreground text-right">
                        Total Amount:
                      </td>
                      <td className="p-3 text-sm font-bold text-right price-text">
                        ₹{orderWithItems.total_amount}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* WhatsApp Opt-in */}
            <div className="text-sm text-muted-foreground">
              WhatsApp Updates: {orderWithItems.whatsapp_optin ? '✅ Opted In' : '❌ Not Opted In'}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Order not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsDialog;
