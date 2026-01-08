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

  // Auto-populate fields when a product is selected
  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    const product = products.find((p) => p.id === productId);
    if (product) {
      setProductName(product.name);
      setCategory(product.category);
      setProductDescription(product.description || '');
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
      const { data, error } = await supabase.functions.invoke('broadcast-whatsapp', {
        body: {
          category,
          productName: productName.trim(),
          productDescription: productDescription.trim() || undefined,
          templateName: templateName.trim(),
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

            {/* Info Box */}
            <div className="rounded-lg bg-muted p-3 text-sm">
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div>
                  <p className="font-medium">Who will receive this?</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Only customers who have purchased from the selected category 
                    AND opted in for WhatsApp notifications.
                  </p>
                </div>
              </div>
            </div>

            {/* Template Info */}
            <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Template Parameters:</p>
              <code className="text-[10px]">
                {'{{1}}'} customer_name, {'{{2}}'} product_name, {'{{3}}'} category, {'{{4}}'} description
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
