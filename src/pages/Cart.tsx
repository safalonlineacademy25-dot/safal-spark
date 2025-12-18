import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Trash2, ShoppingBag, ArrowRight, Shield, MessageCircle, Mail } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const Cart = () => {
  const { items, removeItem, clearCart, getTotal } = useCartStore();
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const { toast } = useToast();

  const handleCheckout = () => {
    if (!email || !phone) {
      toast({
        title: 'Please fill in your details',
        description: 'Email and phone number are required for order delivery.',
        variant: 'destructive',
      });
      return;
    }
    
    toast({
      title: 'Redirecting to Razorpay...',
      description: 'You will be redirected to complete your payment securely.',
    });
    
    // In production, this would integrate with Razorpay
    setTimeout(() => {
      toast({
        title: 'Demo Mode',
        description: 'Razorpay integration requires backend setup. Connect Supabase to enable payments.',
      });
    }, 1500);
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
                      <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center shrink-0">
                        <span className="text-3xl">
                          {item.product.category === 'notes' && '📚'}
                          {item.product.category === 'mock-papers' && '📝'}
                          {item.product.category === 'combo' && '🎁'}
                        </span>
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
                          {item.product.originalPrice && (
                            <span className="text-sm price-original">
                              ₹{item.product.originalPrice}
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
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
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
                  >
                    Pay with Razorpay
                    <ArrowRight className="ml-2 h-4 w-4" />
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
