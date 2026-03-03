import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, CheckCircle, AlertCircle, User, Mail, Phone, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  is_active: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  'competitive-exam': 'Competitive Exam Notes',
  'mock-papers': 'Mock Papers',
  'pune-university': 'Pune University Notes',
  'engineering': 'Engineering Notes',
  'iit': 'IIT Notes',
  'mumbai-university': 'Mumbai University Notes',
  'audio-notes': 'Audio Notes',
  'combo-pack': 'Combo Packs',
  'others': 'Others',
};

const ManualDownloadTab = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category, price, is_active')
        .eq('is_active', true)
        .order('category')
        .order('name');
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      toast.error('Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  };

  const productsByCategory = products.reduce<Record<string, Product[]>>((acc, p) => {
    const cat = p.category || 'others';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const validateForm = (): string | null => {
    if (!customerName.trim()) return 'Customer name is required';
    if (!customerEmail.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) return 'Invalid email address';
    if (!customerPhone.trim()) return 'Phone number is required';
    if (!/^\+?\d{10,15}$/.test(customerPhone.trim().replace(/[\s-]/g, ''))) return 'Invalid phone number';
    if (!selectedProductId) return 'Please select a product';
    return null;
  };

  const handleSend = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSending(true);
    setLastResult(null);

    try {
      const product = products.find(p => p.id === selectedProductId);
      if (!product) throw new Error('Selected product not found');

      const orderNumber = `MANUAL-${Date.now()}`;
      const now = new Date().toISOString();

      // 1. Create a customer record (upsert)
      const { error: custError } = await supabase
        .from('customers')
        .upsert({
          email: customerEmail.trim().toLowerCase(),
          phone: customerPhone.trim(),
          name: customerName.trim(),
          whatsapp_optin: true,
        }, { onConflict: 'email' });

      if (custError) {
        console.error('Customer upsert error:', custError);
        // Non-fatal, continue
      }

      // 2. Create an order record with status 'paid' (bypassing payment)
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim().toLowerCase(),
          customer_phone: customerPhone.trim(),
          total_amount: product.price,
          status: 'paid',
          delivery_status: 'pending',
          whatsapp_optin: true,
          currency: 'INR',
        })
        .select('id')
        .single();

      if (orderError) throw orderError;

      // 3. Create order item
      const { error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          product_id: product.id,
          product_name: product.name,
          product_price: product.price,
          quantity: 1,
        });

      if (itemError) throw itemError;

      // 4. Trigger the delivery pipeline (email + whatsapp)
      const { data: deliveryData, error: deliveryError } = await supabase.functions.invoke('process-order-delivery', {
        body: { order_id: order.id },
      });

      if (deliveryError) throw deliveryError;

      const emailsSent = deliveryData?.emails_sent || 0;
      const whatsappSent = deliveryData?.whatsapp_sent || false;

      setLastResult({
        success: true,
        message: `Download link sent successfully! ${emailsSent} email(s) sent${whatsappSent ? ' + WhatsApp notification' : ''}.`,
      });

      toast.success('Download link sent!', {
        description: `Email sent to ${customerEmail.trim()} for "${product.name}"`,
      });

      // Reset form
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setSelectedProductId('');
    } catch (error: any) {
      console.error('Manual download send error:', error);
      setLastResult({
        success: false,
        message: error.message || 'Failed to send download link',
      });
      toast.error('Failed to send download link', {
        description: error.message || 'Please try again',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold text-foreground">Send Download Link</h2>
        <p className="text-muted-foreground mt-1">
          Manually send product download links to a customer (bypasses payment flow)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Customer & Product Details</CardTitle>
            <CardDescription>Enter customer information and select the product to deliver</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Customer Name
                </Label>
                <Input
                  id="customerName"
                  placeholder="Enter customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  disabled={sending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerEmail" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email Address
                </Label>
                <Input
                  id="customerEmail"
                  type="email"
                  placeholder="customer@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  disabled={sending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerPhone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Phone Number
                </Label>
                <Input
                  id="customerPhone"
                  placeholder="+91 9876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  disabled={sending}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  Select Product
                </Label>
                <Select
                  value={selectedProductId}
                  onValueChange={setSelectedProductId}
                  disabled={sending || loadingProducts}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingProducts ? 'Loading products...' : 'Choose a product'} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(productsByCategory).map(([category, prods]) => (
                      <SelectGroup key={category}>
                        <SelectLabel>{CATEGORY_LABELS[category] || category}</SelectLabel>
                        {prods.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} — ₹{product.price}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedProduct && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                <Package className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">{selectedProduct.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {CATEGORY_LABELS[selectedProduct.category] || selectedProduct.category} · ₹{selectedProduct.price}
                  </p>
                </div>
                <Badge variant="secondary" className="ml-auto">
                  {selectedProduct.category === 'combo-pack' ? 'Combo Pack' : 'Standard'}
                </Badge>
              </div>
            )}

            <Button
              onClick={handleSend}
              disabled={sending}
              className="w-full md:w-auto"
              size="lg"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Download Link
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Info Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
                <p>Enter customer details and select a product</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
                <p>A paid order is created automatically (no payment required)</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</span>
                <p>Download link email is sent to the customer</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">4</span>
                <p>WhatsApp notification is also sent if enabled</p>
              </div>
            </div>

            <div className="pt-3 border-t">
              <p className="font-medium text-foreground mb-1">Note:</p>
              <p>This bypasses the Razorpay payment flow. The order will appear in your Orders list with a "MANUAL-" prefix.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Result */}
      {lastResult && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={lastResult.success ? 'border-green-500/50' : 'border-destructive/50'}>
            <CardContent className="flex items-center gap-3 py-4">
              {lastResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              )}
              <p className={lastResult.success ? 'text-green-700' : 'text-destructive'}>
                {lastResult.message}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ManualDownloadTab;
