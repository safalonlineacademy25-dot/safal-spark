import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Trash2, ShoppingBag, ArrowRight, Shield, MessageCircle, Mail, Loader2, AlertCircle } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { useActiveProducts } from '@/hooks/useProducts';

// Convert Google Drive sharing links to direct image URLs
const getImageUrl = (url: string): string => {
  if (!url) return '';
  
  // Handle Google Drive sharing links
  if (url.includes('drive.google.com')) {
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
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if WhatsApp delivery is enabled in admin settings
  useEffect(() => {
    const fetchWhatsappSetting = async () => {
      const { data, error } = await supabase
        .rpc('get_public_setting', { setting_key: 'whatsapp_enabled' });
      
      if (error) {
        console.log('[Cart] Could not fetch whatsapp setting:', error.message);
        setWhatsappEnabled(false);
        setWhatsappOptIn(false);
        return;
      }
      
      const isEnabled = data === 'true';
      setWhatsappEnabled(isEnabled);
      if (!isEnabled) {
        setWhatsappOptIn(false);
      }
    };
    fetchWhatsappSetting();
  }, []);

  // Scroll to top on mount and reset processing state on unmount
  useEffect(() => {
    window.scrollTo(0, 0);
    return () => {
      setIsProcessing(false);
    };
  }, []);

  // Handle QR code add parameter
  useEffect(() => {
    const addParam = searchParams.get('add');
    if (addParam && allProducts) {
      const productIds = addParam.split(',').map(id => id.trim()).filter(Boolean);
      const productsToAdd = productIds
        .map(id => allProducts.find(p => p.id === id))
        .filter((p): p is NonNullable<typeof p> => !!p);

      if (productsToAdd.length > 0) {
        clearCart();
        for (const product of productsToAdd) {
          addItem(product);
        }
      }
      searchParams.delete('add');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, allProducts, addItem, clearCart, setSearchParams, toast]);

  const validateForm = (): boolean => {
    let hasErrors = false;

    const nameResult = z.string().trim().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').safeParse(customerName);
    if (!nameResult.success) {
      setNameError(nameResult.error.errors[0]?.message || 'Name is required');
      hasErrors = true;
    } else {
      setNameError('');
    }
    
    const emailResult = z.string().trim().min(1, 'Email address is required').email('Please enter a valid email address').max(255, 'Email must be less than 255 characters').safeParse(email);
    if (!emailResult.success) {
      setEmailError(emailResult.error.errors[0]?.message || 'Email address is required');
      hasErrors = true;
    } else {
      setEmailError('');
    }
    
    const phoneResult = z.string().trim().min(1, 'Phone number is required').min(10, 'Phone number must be at least 10 digits').max(15, 'Phone number must be less than 15 digits').regex(/^\+?[0-9]{10,15}$/, 'Please enter a valid phone number (digits only, 10-15 characters)').safeParse(phone);
    if (!phoneResult.success) {
      setPhoneError(phoneResult.error.errors[0]?.message || 'Phone number is required');
      hasErrors = true;
    } else {
      setPhoneError('');
    }
    
    return !hasErrors;
  };

  const handleCheckout = async () => {
    console.log('[Cart] handleCheckout called', { email, phone, itemCount: items.length, isProcessing });
    
    if (isProcessing) {
      console.log('[Cart] Already processing, ignoring click');
      return;
    }
    
    if (!validateForm()) {
      console.log('[Cart] Form validation failed');
      return;
    }
    
    console.log('[Cart] Form validation passed, creating payment link...');

    setIsProcessing(true);
    
    // Safety timeout
    const timeoutId = setTimeout(() => {
      console.log('[Cart] Checkout timeout - resetting processing state');
      setIsProcessing(false);
      toast({
        title: 'Request timed out',
        description: 'The payment request took too long. Please try again.',
        variant: 'destructive',
      });
    }, 30000);

    try {
      console.log('[Cart] Calling create-razorpay-order edge function...');
      
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          items,
          customer_email: email,
          customer_phone: phone,
          customer_name: customerName.trim() || null,
          whatsapp_optin: whatsappOptIn,
          callback_origin: window.location.origin,
        },
      });
      
      console.log('[Cart] Edge function response:', { orderData, orderError });

      clearTimeout(timeoutId);

      if (orderError || !orderData?.success) {
        throw new Error(orderData?.error || orderError?.message || 'Failed to create order');
      }

      if (!orderData.payment_url) {
        throw new Error('Payment link not generated. Please contact support.');
      }

      console.log('[Cart] Redirecting to Razorpay Payment Link:', orderData.payment_url);

      // Save cart context before redirect so OrderSuccess can display info
      try {
        sessionStorage.setItem('pending_order', JSON.stringify({
          order_number: orderData.order_number,
          email,
          phone,
          name: customerName.trim(),
        }));
      } catch (e) {
        // sessionStorage might not be available
      }

      // Clear cart before redirect
      clearCart();

      // Redirect to Razorpay's hosted payment page
      window.location.href = orderData.payment_url;

    } catch (error: any) {
      clearTimeout(timeoutId);
      
      console.error('[Cart] Checkout error:', error);
      
      let errorTitle = 'Checkout failed';
      let errorMessage = 'Something went wrong. Please try again.';
      
      const errorText = error.message?.toLowerCase() || '';
      
      if (errorText.includes('razorpay') || errorText.includes('payment gateway') || errorText.includes('api key') || errorText.includes('credentials')) {
        errorTitle = 'Payment gateway not available';
        errorMessage = 'The payment system is currently being configured. Please try again later or contact support.';
      } else if (errorText.includes('rate limit') || errorText.includes('too many')) {
        errorTitle = 'Too many attempts';
        errorMessage = 'Please wait a moment before trying again.';
      } else if (errorText.includes('network') || errorText.includes('fetch') || errorText.includes('failed to fetch')) {
        errorTitle = 'Connection error';
        errorMessage = 'Please check your internet connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: 'destructive',
      });
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
          <main className="flex-1 flex items-center justify-center pb-20">
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
        {/* Add bottom padding on mobile to account for fixed payment bar */}
        <main className="flex-1 py-4 px-4 md:py-6 md:px-6 pb-44 md:pb-6">
          <div className="container-custom">
            <h1 className="text-xl font-bold text-foreground mb-4">Shopping Cart</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-3">
                {items.map((item, index) => (
                  <motion.div
                    key={item.product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-card rounded-lg border border-border p-3"
                  >
                    <div className="flex gap-3">
                      <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center shrink-0 overflow-hidden">
                        {item.product.image_url ? (
                          <img 
                            src={getImageUrl(item.product.image_url)} 
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.parentElement!.innerHTML = `<span class="text-2xl">${
                                item.product.category === 'notes' ? '📚' : 
                                item.product.category === 'mock-papers' ? '📝' : '🎁'
                              }</span>`;
                            }}
                          />
                        ) : (
                          <span className="text-2xl">
                            {item.product.category === 'notes' && '📚'}
                            {item.product.category === 'mock-papers' && '📝'}
                            {item.product.category === 'combo' && '🎁'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-sm truncate">
                          {item.product.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-base font-bold price-text">
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
                        size="sm"
                        onClick={() => removeItem(item.product.id)}
                        className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCart}
                  className="text-muted-foreground text-xs"
                >
                  Clear Cart
                </Button>
              </div>

              {/* Order Summary - Desktop */}
              <div className="lg:col-span-1 hidden lg:block">
                <div className="bg-card rounded-xl border border-border p-4 sticky top-24">
                  <h2 className="text-lg font-bold text-foreground mb-4">Order Summary</h2>

                  {/* Contact Details */}
                  <div className="space-y-3 mb-4">
                  {(!customerName || !email || !phone) && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20"
                      >
                        <motion.div
                          animate={{ scale: [1, 1.15, 1] }}
                          transition={{ repeat: Infinity, repeatDelay: 2, duration: 0.6 }}
                        >
                          <Mail className="h-4 w-4 text-primary mt-0.5" />
                        </motion.div>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Enter your details below</span> to receive your order confirmation and download links.
                        </p>
                      </motion.div>
                    )}

                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-widest text-foreground mb-1.5 block" style={{ textShadow: '0 1px 0 hsl(var(--muted)), 0 2px 3px rgba(0,0,0,0.1)' }}>
                        Your Name <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          if (nameError) setNameError('');
                        }}
                        placeholder="Enter your full name"
                        maxLength={100}
                        className={`w-full px-3 py-2 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm ${
                          nameError ? 'border-destructive' : 'border-input'
                        }`}
                      />
                      {nameError && (
                        <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1.5 rounded-md bg-destructive/10 border border-destructive/30 animate-shake">
                          <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                          <p className="text-xs font-medium text-destructive">{nameError}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-widest text-foreground mb-1.5 block" style={{ textShadow: '0 1px 0 hsl(var(--muted)), 0 2px 3px rgba(0,0,0,0.1)' }}>
                        Email Address <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) setEmailError('');
                        }}
                        placeholder="Please enter your email here"
                        className={`w-full px-3 py-2 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm ${
                          emailError ? 'border-destructive' : 'border-input'
                        }`}
                      />
                      {emailError && (
                        <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1.5 rounded-md bg-destructive/10 border border-destructive/30 animate-shake">
                          <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                          <p className="text-xs font-medium text-destructive">{emailError}</p>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-widest text-foreground mb-1.5 block" style={{ textShadow: '0 1px 0 hsl(var(--muted)), 0 2px 3px rgba(0,0,0,0.1)' }}>
                        Phone Number <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9+]/g, '').replace(/(?!^)\+/g, '');
                          setPhone(value);
                          if (phoneError) setPhoneError('');
                        }}
                        placeholder="Please enter your mobile here"
                        maxLength={15}
                        className={`w-full px-3 py-2 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm ${
                          phoneError ? 'border-destructive' : 'border-input'
                        }`}
                      />
                      {phoneError && (
                        <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1.5 rounded-md bg-destructive/10 border border-destructive/30 animate-shake">
                          <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                          <p className="text-xs font-medium text-destructive">{phoneError}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {whatsappEnabled && (
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200 mb-4 flex items-center gap-2">
                      <span className="text-green-600 text-base">📱</span>
                      <p className="text-sm font-semibold text-green-700">
                        Order delivery notification will send on WhatsApp
                      </p>
                    </div>
                  )}

                  <div className="space-y-2 mb-4 pb-4 border-b border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal ({items.length} items)</span>
                      <span className="text-foreground">₹{getTotal()}</span>
                    </div>
                  </div>

                  <div className="flex justify-between mb-4">
                    <span className="text-base font-semibold text-foreground">Total</span>
                    <span className="text-xl font-bold price-text">₹{getTotal()}</span>
                  </div>

                  <Button
                    type="button"
                    size="default"
                    className="w-full touch-manipulation select-none"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isProcessing) handleCheckout();
                    }}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Redirecting to Payment...
                      </>
                    ) : (
                      <>
                        Pay Now — ₹{getTotal()}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  {/* Payment method icons */}
                  <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Shield className="h-3.5 w-3.5 text-secondary" />
                      <span className="text-xs font-semibold text-foreground">Secure Payment Options</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-background border border-border text-[11px] font-bold text-foreground shadow-sm">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M2 10h20" stroke="currentColor" strokeWidth="1.5"/><path d="M6 15h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        Cards
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-background border border-border text-[11px] font-bold shadow-sm" style={{ color: '#4285F4' }}>
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg>
                        GPay
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-background border border-border text-[11px] font-bold shadow-sm" style={{ color: '#5f259f' }}>
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
                        PhonePe
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-background border border-border text-[11px] font-bold shadow-sm" style={{ color: '#00897B' }}>
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
                        UPI
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-background border border-border text-[11px] font-bold shadow-sm text-foreground">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM4 0h16v2H4zm0 22h16v2H4z"/></svg>
                        Net Banking
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 text-primary" />
                      <span>Download link sent to email</span>
                    </div>
                    {whatsappEnabled && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MessageCircle className="h-3.5 w-3.5 text-secondary" />
                        <span>Order delivery notification on WhatsApp</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Summary - Mobile (inline, compact) */}
              <div className="lg:hidden space-y-3">
                <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                  <h2 className="text-base font-bold text-foreground">Contact Details</h2>

                  {(!customerName || !email || !phone) && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                      <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Enter your details</span> to receive download links.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-widest text-foreground mb-1.5 block" style={{ textShadow: '0 1px 0 hsl(var(--muted)), 0 2px 4px rgba(0,0,0,0.15)' }}>
                      Your Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        if (nameError) setNameError('');
                      }}
                      placeholder="Enter your full name"
                      maxLength={100}
                      className={`w-full px-3 py-2 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm ${
                        nameError ? 'border-destructive' : 'border-input'
                      }`}
                    />
                    {nameError && (
                      <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1.5 rounded-md bg-destructive/10 border border-destructive/30 animate-shake">
                        <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                        <p className="text-xs font-medium text-destructive">{nameError}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-widest text-foreground mb-1.5 block" style={{ textShadow: '0 1px 0 hsl(var(--muted)), 0 2px 4px rgba(0,0,0,0.15)' }}>
                      Email Address <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError('');
                      }}
                      placeholder="Please enter your email here"
                      className={`w-full px-3 py-2 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm ${
                        emailError ? 'border-destructive' : 'border-input'
                      }`}
                    />
                    {emailError && (
                      <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1.5 rounded-md bg-destructive/10 border border-destructive/30 animate-shake">
                        <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                        <p className="text-xs font-medium text-destructive">{emailError}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-widest text-foreground mb-1.5 block" style={{ textShadow: '0 1px 0 hsl(var(--muted)), 0 2px 4px rgba(0,0,0,0.15)' }}>
                      Phone Number <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9+]/g, '').replace(/(?!^)\+/g, '');
                        setPhone(value);
                        if (phoneError) setPhoneError('');
                      }}
                      placeholder="Please enter your mobile here"
                      maxLength={15}
                      className={`w-full px-3 py-2 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm ${
                        phoneError ? 'border-destructive' : 'border-input'
                      }`}
                    />
                    {phoneError && (
                      <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1.5 rounded-md bg-destructive/10 border border-destructive/30 animate-shake">
                        <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                        <p className="text-xs font-medium text-destructive">{phoneError}</p>
                      </div>
                    )}
                  </div>

                  {whatsappEnabled && (
                    <div className="p-2.5 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2">
                      <span className="text-green-600 text-base">📱</span>
                      <p className="text-sm font-semibold text-green-700">
                        Order delivery notification will send on WhatsApp
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Fixed bottom payment bar - Mobile only */}
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card border-t border-border px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Total ({items.length} items)</span>
            <span className="text-lg font-bold price-text">₹{getTotal()}</span>
          </div>
          <Button
            type="button"
            size="lg"
            className="w-full touch-manipulation select-none"
            onTouchStart={(e) => {
              e.currentTarget.style.opacity = '0.8';
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isProcessing) handleCheckout();
            }}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting to Payment...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Pay Now — ₹{getTotal()}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
          <div className="flex items-center justify-center gap-3 mt-2 opacity-70">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Pay with</span>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-bold text-foreground border border-border">UPI</span>
              <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-bold border border-border" style={{ color: '#4285F4' }}>GPay</span>
              <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-bold border border-border" style={{ color: '#5f259f' }}>PhonePe</span>
              <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-bold text-foreground border border-border">Cards</span>
            </div>
          </div>
        </div>

        <div className="hidden lg:block">
          <Footer />
        </div>
      </div>
    </>
  );
};

export default Cart;
