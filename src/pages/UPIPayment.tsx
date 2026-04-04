import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { QrCode, ShoppingBag, User, Mail, Phone, Loader2, Shield, CheckCircle, Upload, Camera } from "lucide-react";
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

export default function UPIPayment() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [upiId, setUpiId] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch products
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

      // Fetch UPI settings
      const { data: settings } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", ["upi_qr_image_url", "upi_id"]);

      if (settings) {
        settings.forEach((s) => {
          if (s.key === "upi_qr_image_url" && s.value) setQrImageUrl(s.value);
          if (s.key === "upi_id" && s.value) setUpiId(s.value);
        });
      }
    };
    fetchData();
  }, [searchParams]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const isPreSelected = !!searchParams.get("product") && !!selectedProduct;

  const productsByCategory = products.reduce<Record<string, Product[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Please upload a file smaller than 5MB", variant: "destructive" });
        return;
      }
      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onload = () => setScreenshotPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

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

    try {
      let screenshotUrl: string | null = null;

      // Upload screenshot if provided
      if (screenshotFile) {
        const fileExt = screenshotFile.name.split('.').pop();
        const fileName = `upi-screenshots/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(fileName, screenshotFile);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from("product-images")
            .getPublicUrl(fileName);
          screenshotUrl = publicUrl;
        }
      }

      // Create UPI order entry
      const { error } = await supabase
        .from("upi_orders")
        .insert({
          customer_name: name.trim(),
          customer_email: email.trim().toLowerCase(),
          customer_phone: phone.trim(),
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          product_price: selectedProduct.price,
          amount: selectedProduct.price,
          screenshot_url: screenshotUrl,
          whatsapp_optin: true,
          status: "pending",
        });

      if (error) throw error;

      // Send Telegram notification
      try {
        await supabase.functions.invoke("send-telegram-notification", {
          body: {
            message: `🔔 *New UPI Payment Received*\n\n👤 ${name.trim()}\n📧 ${email.trim()}\n📱 ${phone.trim()}\n📦 ${selectedProduct.name}\n💰 ₹${selectedProduct.price}\n📸 Screenshot: ${screenshotUrl ? 'Yes' : 'No'}\n\n⏳ Pending admin approval`,
          },
        });
      } catch (e) {
        console.error("Telegram notification failed:", e);
      }

      setSubmitted(true);
    } catch (error: any) {
      toast({ title: "Submission failed", description: error.message || "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-background flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto text-center p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Payment Details Submitted!</h2>
            <p className="text-muted-foreground mb-4">
              Thank you, <strong>{name}</strong>! We have received your payment details for <strong>{selectedProduct?.name}</strong>.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2 mb-6">
              <p>✅ Our team will verify your payment shortly.</p>
              <p>📧 Download links will be sent to <strong>{email}</strong> once verified.</p>
              <p>📱 You'll also receive a WhatsApp notification.</p>
              <p>⏱️ Usually verified within 15-30 minutes during business hours.</p>
            </div>
            <Button onClick={() => window.location.href = "/"} className="w-full">
              Back to Home
            </Button>
          </motion.div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Pay via UPI Scanner | Safal Online Academy</title>
        <meta name="description" content="Pay easily using UPI scanner. Scan QR code, make payment, and receive your study materials instantly." />
      </Helmet>
      <Header />
      <main className="min-h-screen bg-background">
        {/* Hero */}
        <section className="hero-gradient py-10 md:py-14">
          <div className="container-custom text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="inline-flex items-center gap-2 bg-background/20 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
                <QrCode className="h-5 w-5 text-primary-foreground" />
                <span className="text-primary-foreground font-medium text-sm">Pay via UPI Scanner</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-3">
                Scan & Pay — Easy UPI Payment
              </h1>
              <div className="flex items-center justify-center gap-3 md:gap-6 text-primary-foreground/90 text-sm md:text-base mt-4">
                <span className="flex items-center gap-1.5"><span className="bg-primary-foreground/20 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span> Select Product</span>
                <span className="text-primary-foreground/40">→</span>
                <span className="flex items-center gap-1.5"><span className="bg-primary-foreground/20 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span> Scan & Pay</span>
                <span className="text-primary-foreground/40">→</span>
                <span className="flex items-center gap-1.5"><span className="bg-primary-foreground/20 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span> Get Download</span>
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
                      <h3 className="font-semibold text-foreground">{selectedProduct!.name}</h3>
                      {selectedProduct!.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{selectedProduct!.description}</p>
                      )}
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-xl font-bold price-text">₹{selectedProduct!.price}</span>
                        {selectedProduct!.original_price && selectedProduct!.original_price > selectedProduct!.price && (
                          <span className="text-sm price-original">₹{selectedProduct!.original_price}</span>
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

            {/* QR Code Scanner */}
            {selectedProduct && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card className="border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <QrCode className="h-5 w-5 text-primary" />
                      Step 2: Scan & Pay ₹{selectedProduct.price}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    {qrImageUrl ? (
                      <div className="space-y-3">
                        <div className="bg-background border-2 border-dashed border-primary/30 rounded-xl p-4 inline-block mx-auto">
                          <img 
                            src={qrImageUrl} 
                            alt="UPI QR Code" 
                            className="w-56 h-56 object-contain mx-auto"
                          />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          Scan this QR code using any UPI app
                        </p>
                        {upiId && (
                          <p className="text-xs text-muted-foreground">
                            UPI ID: <span className="font-mono font-semibold text-foreground">{upiId}</span>
                          </p>
                        )}
                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-200">
                          <p className="font-medium">💡 Important:</p>
                          <p>Pay exact amount: <strong>₹{selectedProduct.price}</strong></p>
                        </div>
                        <div className="flex items-center justify-center gap-3 pt-1">
                          {["GPay", "PhonePe", "Paytm", "UPI"].map((method) => (
                            <span key={method} className="text-[10px] font-medium bg-muted px-2 py-1 rounded text-muted-foreground">
                              {method}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-muted-foreground">
                        <QrCode className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>UPI QR code not configured yet.</p>
                        <p className="text-xs mt-1">Please contact support for payment assistance.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Customer Details */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5 text-primary" />
                    Step 3: Your Details & Payment Confirmation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Fill your details below. After we verify your payment, download links will be sent to your email.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="upi-name" className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" /> Full Name <span className="text-destructive">*</span>
                    </Label>
                    <Input id="upi-name" placeholder="Enter your full name" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="upi-email" className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" /> Email Address <span className="text-destructive">*</span>
                    </Label>
                    <Input id="upi-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <p className="text-xs text-muted-foreground">📧 Download links will be sent to this email</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="upi-phone" className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" /> Mobile Number <span className="text-destructive">*</span>
                    </Label>
                    <Input id="upi-phone" type="tel" placeholder="10-digit mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>

                  {/* Screenshot Upload (Optional) */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5" /> Payment Screenshot <span className="text-xs text-muted-foreground">(Optional)</span>
                    </Label>
                    <div className="flex items-center gap-3">
                      <label className="flex-1 cursor-pointer">
                        <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                          {screenshotPreview ? (
                            <img src={screenshotPreview} alt="Screenshot" className="max-h-32 mx-auto rounded" />
                          ) : (
                            <div className="text-muted-foreground">
                              <Upload className="h-6 w-6 mx-auto mb-1" />
                              <p className="text-xs">Upload payment screenshot</p>
                            </div>
                          )}
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={handleScreenshotChange} />
                      </label>
                      {screenshotFile && (
                        <Button variant="ghost" size="sm" onClick={() => { setScreenshotFile(null); setScreenshotPreview(null); }}>
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Submit Button */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !selectedProductId || !qrImageUrl}
                className="w-full h-14 text-base font-semibold gap-2"
                size="lg"
              >
                {submitting ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Submitting...</>
                ) : (
                  <><CheckCircle className="h-5 w-5" /> I've Paid — Submit for Verification</>
                )}
              </Button>

              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> 100% Secure</span>
                  <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Manual Verification</span>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  After submitting, our team will verify your payment and send download links within 15-30 minutes.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
