import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Trash2, ShoppingBag, ArrowRight, Shield, MessageCircle, Mail, Loader2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store';
import { Checkbox } from '@/components/ui/checkbox';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { useActiveProducts } from '@/hooks/useProducts';

// Validation schema for checkout form
const checkoutSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters'),
  phone: z
    .string()
    .trim()
    .min(1, 'Phone number is required')
    .regex(/^[\+]?[0-9\s\-]{10,15}$/, 'Please enter a valid phone number (10-15 digits)')
    .max(20, 'Phone number must be less than 20 characters'),
});

// Convert Google Drive sharing links to direct image URLs
const getImageUrl = (url: string): string => {
  if (!url) return '';
  
  // Handle Google Drive sharing links
  if (url.includes('drive.google.com')) {
    // Extract file ID from various Google Drive URL formats
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || 
                        url.match(/id=([a-zA-Z0-9_-]+)/) ||
                        url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
    }
  }
  
  return url;
};

const Cart = () => {
  const { items, removeItem, clearCart, getTotal, addItem } = useCartStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: allProducts } = useActiveProducts();
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Handle QR code add parameter
  useEffect(() => {
    const productIdToAdd = searchParams.get('add');
    if (productIdToAdd && allProducts) {
      const product = allProducts.find(p => p.id === productIdToAdd);
      if (product) {
        // Check if already in cart
        const existingItem = items.find(item => item.product.id === productIdToAdd);
        if (!existingItem) {
          addItem(product);
          toast({
            title: 'Product added to cart',
            description: `${product.name} has been added to your cart.`,
          });
        }
      }
      // Remove the add parameter from URL
      searchParams.delete('add');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, allProducts, items, addItem, setSearchParams, toast]);

  const validateForm = (): boolean => {
    setEmailError('');
    setPhoneError('');
    
    const result = checkoutSchema.safeParse({ email, phone });
    
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      if (errors.email?.[0]) setEmailError(errors.email[0]);
      if (errors.phone?.[0]) setPhoneError(errors.phone[0]);
      return false;
    }
    
    return true;
  };

  const handleCheckout = async () => {
    if (!validateForm()) {
      toast({
        title: 'Please fix the errors',
        description: 'Check your email and phone number.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create order via edge function
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          items,
          customer_email: email,
          customer_phone: phone,
          whatsapp_optin: whatsappOptIn,
        },
      });

      if (orderError || !orderData?.success) {
        throw new Error(orderData?.error || orderError?.message || 'Failed to create order');
      }

      toast({
        title: 'Order created!',
        description: `Order ${orderData.order_number} - Simulating payment...`,
      });

      // For testing, simulate successful payment after a short delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verify payment (simulated for testing)
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
        body: {
          order_id: orderData.order_id,
          razorpay_payment_id: `pay_test_${Date.now()}`,
          razorpay_order_id: orderData.razorpay_order_id,
          razorpay_signature: 'test_signature',
        },
      });

      if (verifyError || !verifyData?.success) {
        throw new Error(verifyData?.error || verifyError?.message || 'Payment verification failed');
      }

      toast({
        title: 'Payment successful!',
        description: `Order ${verifyData.order_number} confirmed. Check admin dashboard to see the order.`,
      });

      // Clear cart after successful payment
      clearCart();
      
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: 'Checkout failed',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <>
        <Helmet>
          <title>Cart | Safal Online Academy</title>
        </Helmet>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center px-4">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <ShoppingBag className="h-10 w-10 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Your cart is empty</h1>
              <p className="text-muted-foreground mb-6">
                Looks like you haven't added any study materials yet.
              </p>
              <Link to="/products">
                <Button size="lg">
                  Browse Products
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`Cart (${items.length}) | Safal Online Academy`}</title>
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 section-padding">
          <div className="container-custom">
            <h1 className="text-3xl font-bold text-foreground mb-8">Shopping Cart</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {items.map((item, index) => (
                  <motion.div
                    key={item.product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-card rounded-xl border border-border p-4 md:p-6"
                  >
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center shrink-0 overflow-hidden">
                        {item.product.image_url ? (
                          <img 
                            src={getImageUrl(item.product.image_url)} 
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.parentElement!.innerHTML = `<span class="text-3xl">${
                                item.product.category === 'notes' ? '📚' : 
                                item.product.category === 'mock-papers' ? '📝' : '🎁'
                              }</span>`;
                            }}
                          />
                        ) : (
                          <span className="text-3xl">
                            {item.product.category === 'notes' && '📚'}
                            {item.product.category === 'mock-papers' && '📝'}
                            {item.product.category === 'combo' && '🎁'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground mb-1 truncate">
                          {item.product.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                          {item.product.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold price-text">
                            ₹{item.product.price}
                          </span>
                          {item.product.original_price && (
                            <span className="text-sm price-original">
                              ₹{item.product.original_price}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.product.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}

                <Button
                  variant="ghost"
                  onClick={clearCart}
                  className="text-muted-foreground"
                >
                  Clear Cart
                </Button>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-card rounded-xl border border-border p-6 sticky top-24">
                  <h2 className="text-xl font-bold text-foreground mb-6">Order Summary</h2>

                  {/* Contact Details */}
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) setEmailError('');
                        }}
                        placeholder="your@email.com"
                        className={`w-full px-4 py-2.5 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                          emailError ? 'border-destructive' : 'border-input'
                        }`}
                      />
                      {emailError && (
                        <p className="text-xs text-destructive mt-1">{emailError}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          if (phoneError) setPhoneError('');
                        }}
                        placeholder="+91 98765 43210"
                        className={`w-full px-4 py-2.5 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                          phoneError ? 'border-destructive' : 'border-input'
                        }`}
                      />
                      {phoneError && (
                        <p className="text-xs text-destructive mt-1">{phoneError}</p>
                      )}
                    </div>
                  </div>

                  {/* WhatsApp Opt-in */}
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 mb-6">
                    <Checkbox
                      id="whatsapp"
                      checked={whatsappOptIn}
                      onCheckedChange={(checked) => setWhatsappOptIn(checked as boolean)}
                    />
                    <label htmlFor="whatsapp" className="text-sm text-muted-foreground cursor-pointer">
                      I agree to receive my download link on WhatsApp
                    </label>
                  </div>

                  {/* Price Breakdown */}
                  <div className="space-y-3 mb-6 pb-6 border-b border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal ({items.length} items)</span>
                      <span className="text-foreground">₹{getTotal()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="text-secondary">-₹0</span>
                    </div>
                  </div>

                  <div className="flex justify-between mb-6">
                    <span className="text-lg font-semibold text-foreground">Total</span>
                    <span className="text-2xl font-bold price-text">₹{getTotal()}</span>
                  </div>

                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handleCheckout}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Pay with Razorpay
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  {/* Trust Badges */}
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4 text-secondary" />
                      <span>Secure payment via Razorpay</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4 text-primary" />
                      <span>Download link sent to email</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MessageCircle className="h-4 w-4 text-secondary" />
                      <span>WhatsApp delivery (if opted)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Cart;
