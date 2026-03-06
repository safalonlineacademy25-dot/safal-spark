import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { CreditCard, ShoppingBag, User, Mail, Phone, Loader2, Shield, CheckCircle } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  category: string;
  description: string | null;
  image_url: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  "Competitive Exam Notes": "🏆 Competitive Exam Notes",
  "Mock Papers": "📝 Mock Papers",
  "Pune University Notes": "🎓 Pune University Notes",
  "Engineering Notes": "⚙️ Engineering Notes",
  "IIT Notes": "🔬 IIT Notes",
  "Mumbai University Notes": "🏛️ Mumbai University Notes",
  "Audio Notes": "🎧 Audio Notes",
  "Combo Packs": "📦 Combo Packs",
  "Others": "📚 Others",
};

export default function WhatsAppOrder() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, price, original_price, category, description, image_url")
        .eq("is_active", true)
        .order("category")
        .order("name");
      setProducts(data || []);
      setLoadingProducts(false);

      const productParam = searchParams.get("product");
      if (productParam && data?.some((p) => p.id === productParam)) {
        setSelectedProductId(productParam);
      }
    })();
  }, [searchParams]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const isPreSelected = !!searchParams.get("product") && !!selectedProduct;

  const productsByCategory = products.reduce<Record<string, Product[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  const validateForm = () => {
    if (!selectedProductId) { toast({ title: "Please select a product", variant: "destructive" }); return false; }
    if (!name.trim()) { toast({ title: "Please enter your name", variant: "destructive" }); return false; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { toast({ title: "Please enter a valid email", variant: "destructive" }); return false; }
    const phoneClean = phone.replace(/\D/g, "");
    if (phoneClean.length < 10) { toast({ title: "Please enter a valid 10-digit phone number", variant: "destructive" }); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !selectedProduct) return;
    setSubmitting(true);

    const timeoutId = setTimeout(() => {
      toast({
        title: 'Request timed out',
        description: 'The payment request took too long. Please try again.',
        variant: 'destructive',
      });
      setSubmitting(false);
    }, 30000);

    try {
      const items = [{
        id: selectedProduct.id,
        name: selectedProduct.name,
        price: selectedProduct.price,
        quantity: 1,
      }];

      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          items,
          customer_email: email.trim().toLowerCase(),
          customer_phone: phone.trim(),
          customer_name: name.trim(),
          whatsapp_optin: true,
          callback_origin: window.location.origin,
        },
      });

      clearTimeout(timeoutId);

      if (orderError || !orderData?.success) {
        throw new Error(orderData?.error || orderError?.message || 'Failed to create order');
      }

      if (!orderData.payment_url) {
        throw new Error('Payment link not generated. Please contact support.');
      }

      // Save order context before redirect
      try {
        sessionStorage.setItem('pending_order', JSON.stringify({
          order_number: orderData.order_number,
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          name: name.trim(),
        }));
      } catch (e) {
        // sessionStorage might not be available
      }

      // Redirect to Razorpay payment page
      window.location.href = orderData.payment_url;

    } catch (error: any) {
      clearTimeout(timeoutId);
      
      let errorTitle = 'Payment failed';
      let errorMessage = 'Something went wrong. Please try again.';
      
      const errorText = error.message?.toLowerCase() || '';
      
      if (errorText.includes('razorpay') || errorText.includes('payment gateway') || errorText.includes('api key')) {
        errorTitle = 'Payment gateway not available';
        errorMessage = 'The payment system is currently being configured. Please try again later.';
      } else if (errorText.includes('rate limit') || errorText.includes('too many')) {
        errorTitle = 'Too many attempts';
        errorMessage = 'Please wait a moment before trying again.';
      } else if (errorText.includes('network') || errorText.includes('fetch')) {
        errorTitle = 'Connection error';
        errorMessage = 'Please check your internet connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({ title: errorTitle, description: errorMessage, variant: 'destructive' });
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Quick Checkout | Safal Online Academy</title>
        <meta name="description" content="Quick and easy checkout. Select a product, fill your details, and pay securely via UPI, Cards or Net Banking." />
      </Helmet>
      <Header />
      <main className="min-h-screen bg-background">
        {/* Hero */}
        <section className="hero-gradient py-10 md:py-14">
          <div className="container-custom text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="inline-flex items-center gap-2 bg-background/20 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
                <CreditCard className="h-5 w-5 text-primary-foreground" />
                <span className="text-primary-foreground font-medium text-sm">Quick & Secure Checkout</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-3">
                Buy in 3 Simple Steps
              </h1>
              <div className="flex items-center justify-center gap-3 md:gap-6 text-primary-foreground/90 text-sm md:text-base mt-4">
                <span className="flex items-center gap-1.5"><span className="bg-primary-foreground/20 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span> Select Product</span>
                <span className="text-primary-foreground/40">→</span>
                <span className="flex items-center gap-1.5"><span className="bg-primary-foreground/20 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span> Fill Details</span>
                <span className="text-primary-foreground/40">→</span>
                <span className="flex items-center gap-1.5"><span className="bg-primary-foreground/20 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span> Pay & Download</span>
              </div>
            </motion.div>
          </div>
        </section>

        <div className="container-custom py-8 md:py-12">
          <div className="max-w-2xl mx-auto grid gap-6">
            {/* Product Selection */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                    {isPreSelected ? "Selected Product" : "Step 1: Select Product"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingProducts ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : isPreSelected ? (
                    <div className="p-4 rounded-lg bg-muted/50 border border-border">
                      <h3 className="font-semibold text-foreground">{selectedProduct.name}</h3>
                      {selectedProduct.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{selectedProduct.description}</p>
                      )}
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-xl font-bold price-text">₹{selectedProduct.price}</span>
                        {selectedProduct.original_price && selectedProduct.original_price > selectedProduct.price && (
                          <span className="text-sm price-original">₹{selectedProduct.original_price}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a product..." />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(productsByCategory).map(([category, prods]) => (
                            <div key={category}>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                {CATEGORY_LABELS[category] || category}
                              </div>
                              {prods.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} — ₹{p.price}
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedProduct && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 p-4 rounded-lg bg-muted/50 border border-border">
                          <h3 className="font-semibold text-foreground">{selectedProduct.name}</h3>
                          {selectedProduct.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{selectedProduct.description}</p>
                          )}
                          <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-xl font-bold price-text">₹{selectedProduct.price}</span>
                            {selectedProduct.original_price && selectedProduct.original_price > selectedProduct.price && (
                              <span className="text-sm price-original">₹{selectedProduct.original_price}</span>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Customer Details */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5 text-primary" />
                    {isPreSelected ? "Please provide your details 👇" : "Step 2: Your Details"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    All fields are mandatory. After payment, download links will be sent to your email.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="wa-name" className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" /> Full Name <span className="text-destructive">*</span>
                    </Label>
                    <Input id="wa-name" placeholder="Enter your full name" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wa-email" className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" /> Email Address <span className="text-destructive">*</span>
                    </Label>
                    <Input id="wa-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <p className="text-xs text-muted-foreground">📧 Download links will be sent to this email</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wa-phone" className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" /> Mobile Number <span className="text-destructive">*</span>
                    </Label>
                    <Input id="wa-phone" type="tel" placeholder="10-digit mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Pay Now Button */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !selectedProductId}
                className="w-full h-14 text-base font-semibold gap-2"
                size="lg"
              >
                {submitting ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</>
                ) : (
                  <><CreditCard className="h-5 w-5" /> {selectedProduct ? `Pay ₹${selectedProduct.price} Now` : "Pay Now"}</>
                )}
              </Button>

              {/* Trust indicators */}
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> 100% Secure</span>
                  <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Instant Delivery</span>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  Pay securely via UPI (GPay, PhonePe), Cards, or Net Banking
                </p>

                {/* Payment method badges */}
                <div className="flex items-center justify-center gap-3 pt-1">
                  {["GPay", "PhonePe", "UPI", "Cards"].map((method) => (
                    <span key={method} className="text-[10px] font-medium bg-muted px-2 py-1 rounded text-muted-foreground">
                      {method}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
