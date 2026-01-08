import { useState, useEffect } from 'react';
import { Send, Loader2, Users, Megaphone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  original_price: number | null;
  badge: string | null;
}

interface WhatsAppBroadcastDialogProps {
  trigger?: React.ReactNode;
}

export default function WhatsAppBroadcastDialog({ trigger }: WhatsAppBroadcastDialogProps) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [category, setCategory] = useState('');
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [templateName, setTemplateName] = useState('new_product_alert');
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  // Fetch products from database when dialog opens
  useEffect(() => {
    if (open) {
      fetchProducts();
    }
  }, [open]);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category, description, price, original_price, badge')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  };

  // Fetch recipient count for a category
  const fetchRecipientCount = async (selectedCategory: string) => {
    if (!selectedCategory) {
      setRecipientCount(null);
      return;
    }
    
    setLoadingCount(true);
    try {
      // Get unique customers who purchased from this category and opted in for WhatsApp
      const { data, error } = await supabase
        .from('orders')
        .select('customer_phone')
        .eq('status', 'paid')
        .eq('whatsapp_optin', true);
      
      if (error) throw error;
      
      // Get order items for these orders to filter by category
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('order_id, product_id');
      
      if (itemsError) throw itemsError;
      
      // Get products in the selected category
      const { data: categoryProducts, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('category', selectedCategory);
      
      if (productsError) throw productsError;
      
      const categoryProductIds = new Set(categoryProducts?.map(p => p.id) || []);
      const orderIdsWithCategory = new Set(
        orderItems?.filter(item => item.product_id && categoryProductIds.has(item.product_id))
          .map(item => item.order_id) || []
      );
      
      // Count unique phone numbers from orders in this category
      const uniquePhones = new Set(
        data?.filter(order => orderIdsWithCategory.has(order.customer_phone))
          .map(order => order.customer_phone) || []
      );
      
      // Actually filter orders properly
      const { data: filteredOrders, error: filteredError } = await supabase
        .from('orders')
        .select('id, customer_phone')
        .eq('status', 'paid')
        .eq('whatsapp_optin', true);
      
      if (filteredError) throw filteredError;
      
      const validOrderIds = new Set(filteredOrders?.map(o => o.id) || []);
      const ordersInCategory = orderItems?.filter(
        item => item.product_id && categoryProductIds.has(item.product_id) && validOrderIds.has(item.order_id)
      ).map(item => item.order_id) || [];
      
      const phonesInCategory = new Set(
        filteredOrders?.filter(o => ordersInCategory.includes(o.id))
          .map(o => o.customer_phone) || []
      );
      
      setRecipientCount(phonesInCategory.size);
    } catch (error) {
      console.error('Error fetching recipient count:', error);
      setRecipientCount(null);
    } finally {
      setLoadingCount(false);
    }
  };

  // Auto-populate fields when a product is selected
  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    const product = products.find((p) => p.id === productId);
    if (product) {
      setProductName(product.name);
      setCategory(product.category);
      setProductDescription(product.description || '');
      fetchRecipientCount(product.category);
    }
  };

  // Group products by category for the dropdown
  const productsByCategory = products.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  const handleBroadcast = async () => {
    if (!category) {
      toast.error('Please select a product');
      return;
    }
    if (!productName.trim()) {
      toast.error('Please enter a product name');
      return;
    }
    if (!templateName.trim()) {
      toast.error('Please enter the template name');
      return;
    }

    setSending(true);
    try {
      // Generate the product link (same format as QR codes)
      const productLink = `${window.location.origin}/cart?add=${selectedProductId}`;
      
      const { data, error } = await supabase.functions.invoke('broadcast-whatsapp', {
        body: {
          category,
          productName: productName.trim(),
          productDescription: productDescription.trim() || undefined,
          templateName: templateName.trim(),
          productId: selectedProductId,
          productLink,
        },
      });

      if (error) throw error;

      if (data.sent === 0 && data.failed === 0) {
        toast.info('No eligible customers found', {
          description: `No customers have purchased from "${category}" with WhatsApp opt-in.`,
        });
      } else {
        toast.success('Broadcast complete!', {
          description: `Sent: ${data.sent}, Failed: ${data.failed}`,
        });
      }

      if (data.errors && data.errors.length > 0) {
        console.error('Broadcast errors:', data.errors);
      }

      setOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Broadcast error:', error);
      toast.error('Broadcast failed', {
        description: error.message || 'Please try again',
      });
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setSelectedProductId('');
    setCategory('');
    setProductName('');
    setProductDescription('');
    setRecipientCount(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Megaphone className="h-4 w-4" />
            Broadcast
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Megaphone className="h-5 w-5 text-primary" />
            WhatsApp Broadcast
          </DialogTitle>
          <DialogDescription>
            Select a product to broadcast to customers who purchased from that category.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Product Selection Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="product-select">Select Product</Label>
              <Select value={selectedProductId} onValueChange={handleProductSelect}>
                <SelectTrigger id="product-select">
                  <SelectValue placeholder={loadingProducts ? 'Loading products...' : 'Select a product'} />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50 max-h-60">
                  {Object.entries(productsByCategory).map(([cat, prods]) => (
                    <div key={cat}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                        {cat}
                      </div>
                      {prods.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <div className="flex items-center gap-2">
                            <span>{product.name}</span>
                            {product.badge && (
                              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                {product.badge}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Products are grouped by category.
              </p>
            </div>

            {/* Category (Auto-filled) */}
            <div className="space-y-2">
              <Label htmlFor="category">Target Category</Label>
              <Input
                id="category"
                value={category}
                readOnly
                className="bg-muted"
                placeholder="Auto-filled from product"
              />
              <p className="text-xs text-muted-foreground">
                Customers from this category will receive the message.
              </p>
            </div>

            {/* Template Name */}
            <div className="space-y-2">
              <Label htmlFor="template-name">WhatsApp Template Name</Label>
              <Input
                id="template-name"
                placeholder="new_product_alert"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Must be approved in Meta Business Manager.
              </p>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Product Name (Auto-filled but editable) */}
            <div className="space-y-2">
              <Label htmlFor="product-name">Product Name</Label>
              <Input
                id="product-name"
                placeholder="Select a product above"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>

            {/* Product Description (Auto-filled but editable) */}
            <div className="space-y-2">
              <Label htmlFor="product-description">Short Description</Label>
              <Textarea
                id="product-description"
                placeholder="Auto-filled from product or enter custom description"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Recipient Count Box */}
            <div className={`rounded-lg p-3 text-sm ${recipientCount !== null && recipientCount > 0 ? 'bg-green-500/10 border border-green-500/20' : 'bg-muted'}`}>
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Recipients</p>
                  {loadingCount ? (
                    <p className="text-muted-foreground text-xs mt-1 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Counting recipients...
                    </p>
                  ) : recipientCount !== null ? (
                    <p className={`text-xs mt-1 ${recipientCount > 0 ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-amber-600 dark:text-amber-400'}`}>
                      {recipientCount > 0 
                        ? `${recipientCount} customer${recipientCount !== 1 ? 's' : ''} will receive this broadcast`
                        : 'No eligible customers found for this category'}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-xs mt-1">
                      Select a product to see recipient count.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Template Info */}
            <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Template Parameters:</p>
              <code className="text-[10px] leading-relaxed block">
                {'{{1}}'} customer_name<br />
                {'{{2}}'} product_name<br />
                {'{{3}}'} category<br />
                {'{{4}}'} description<br />
                {'{{5}}'} product_link (QR code URL)
              </code>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleBroadcast} disabled={sending || !selectedProductId} className="gap-2">
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Broadcast
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
