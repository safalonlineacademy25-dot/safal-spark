import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { MessageCircle, Send, CheckCircle, Loader2, ShoppingBag, User, Mail, Phone } from "lucide-react";
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
  const [success, setSuccess] = useState<{ orderNumber: string; whatsappSent: boolean; paymentUrl: string } | null>(null);

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

      // Auto-select product from URL param
      const productParam = searchParams.get("product");
      if (productParam && data?.some((p) => p.id === productParam)) {
        setSelectedProductId(productParam);
      }
    })();
  }, [searchParams]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const isPreSelected = !!searchParams.get("product") && !!selectedProduct;

  // Group products by category
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
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-whatsapp-order", {
        body: {
          product_id: selectedProductId,
          customer_name: name.trim(),
          customer_email: email.trim().toLowerCase(),
          customer_phone: phone.trim(),
          callback_origin: window.location.origin,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Order creation failed");

      setSuccess({
        orderNumber: data.order_number,
        whatsappSent: data.whatsapp_sent,
        paymentUrl: data.payment_url,
      });

      toast({ title: "Order created!", description: data.whatsapp_sent ? "Payment link sent to your WhatsApp!" : "Payment link is ready." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Something went wrong", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Order via WhatsApp | Safal Online Academy</title>
        <meta name="description" content="Quick and easy ordering via WhatsApp. Select a product, fill your details, and receive the payment link on WhatsApp." />
      </Helmet>
      <Header />
      <main className="min-h-screen bg-background">
        {/* Hero */}
        <section className="hero-gradient py-12 md:py-16">
          <div className="container-custom text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="inline-flex items-center gap-2 bg-background/20 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
                <MessageCircle className="h-5 w-5 text-primary-foreground" />
                <span className="text-primary-foreground font-medium text-sm">Quick WhatsApp Checkout</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-3">
                Order via WhatsApp
              </h1>
              <p className="text-primary-foreground/80 max-w-lg mx-auto">
                Select a product, fill your details, and get the payment link directly on WhatsApp. Simple & fast!
              </p>
            </motion.div>
          </div>
        </section>

        <div className="container-custom py-8 md:py-12">
          {success ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg mx-auto text-center">
              <Card className="border-secondary/30">
                <CardContent className="pt-8 pb-6 space-y-4">
                  <CheckCircle className="h-16 w-16 text-secondary mx-auto" />
                  <h2 className="text-2xl font-bold text-foreground">Order Created!</h2>
                  <p className="text-muted-foreground">Order #{success.orderNumber}</p>
                  {success.whatsappSent ? (
                    <div className="bg-secondary/10 rounded-lg p-4 text-sm text-foreground">
                      <MessageCircle className="h-5 w-5 text-secondary inline mr-2" />
                      Payment link has been sent to your WhatsApp! Check your messages.
                    </div>
                  ) : (
                    <div className="bg-muted rounded-lg p-4 text-sm text-foreground">
                      <p className="mb-3">WhatsApp delivery couldn't be completed. Use this link to pay:</p>
                      <a href={success.paymentUrl} target="_blank" rel="noopener noreferrer">
                        <Button className="w-full">Pay Now →</Button>
                      </a>
                    </div>
                  )}
                  <Button variant="outline" onClick={() => { setSuccess(null); setSelectedProductId(""); setName(""); setEmail(""); setPhone(""); }}>
                    Place Another Order
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className="max-w-2xl mx-auto grid gap-6">
              {/* Product Selection */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ShoppingBag className="h-5 w-5 text-primary" />
                      Select Product
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
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="h-5 w-5 text-primary" />
                      Your Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="wa-name" className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" /> Full Name
                      </Label>
                      <Input id="wa-name" placeholder="Enter your full name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wa-email" className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" /> Email Address
                      </Label>
                      <Input id="wa-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                      <p className="text-xs text-muted-foreground">Product download links will be sent here</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wa-phone" className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" /> WhatsApp Number
                      </Label>
                      <Input id="wa-phone" type="tel" placeholder="10-digit mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} />
                      <p className="text-xs text-muted-foreground">Payment link will be sent to this WhatsApp number</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Submit */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !selectedProductId}
                  className="w-full h-12 text-base font-semibold gap-2"
                  size="lg"
                >
                  {submitting ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</>
                  ) : (
                    <><Send className="h-5 w-5" /> Send Payment Link to WhatsApp</>
                  )}
                </Button>
                {selectedProduct && (
                  <p className="text-center text-sm text-muted-foreground mt-2">
                    You'll receive a secure Razorpay payment link for ₹{selectedProduct.price} on WhatsApp
                  </p>
                )}
              </motion.div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
