import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { QrCode, ShoppingBag, User, Mail, Phone, Loader2, Shield, CheckCircle, Hash } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function UPIPayment() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [noProduct, setNoProduct] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [upiId, setUpiId] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const productId = searchParams.get("product");

      if (!productId) {
        setNoProduct(true);
        setLoadingProduct(false);
        return;
      }

      // Fetch the specific product
      const { data } = await supabase
        .from("products")
        .select("id, name, price, original_price, category, description, image_url")
        .eq("id", productId)
        .eq("is_active", true)
        .single();

      if (!data) {
        setNoProduct(true);
        setLoadingProduct(false);
        return;
      }

      setProduct(data);
      setLoadingProduct(false);

      // Fetch UPI settings
      const [qrRes, upiIdRes] = await Promise.all([
        supabase.rpc("get_public_setting", { setting_key: "upi_qr_image_url" }),
        supabase.rpc("get_public_setting", { setting_key: "upi_id" }),
      ]);

      if (qrRes.data) setQrImageUrl(qrRes.data);
      if (upiIdRes.data) setUpiId(upiIdRes.data);
    };
    fetchData();
  }, [searchParams]);

  const validateForm = () => {
    if (!name.trim()) { toast({ title: "Please enter your name", variant: "destructive" }); return false; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { toast({ title: "Please enter a valid email", variant: "destructive" }); return false; }
    const phoneClean = phone.replace(/\D/g, "");
    if (phoneClean.length < 10) { toast({ title: "Please enter a valid 10-digit phone number", variant: "destructive" }); return false; }
    if (!transactionId.trim()) { toast({ title: "Please enter your UPI Transaction ID", variant: "destructive" }); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !product) return;
    setSubmitting(true);

    try {
      // Create UPI order entry
      const { error } = await supabase
        .from("upi_orders")
        .insert({
          customer_name: name.trim(),
          customer_email: email.trim().toLowerCase(),
          customer_phone: phone.trim(),
          product_id: product.id,
          product_name: product.name,
          product_price: product.price,
          amount: product.price,
          transaction_id: transactionId.trim(),
          whatsapp_optin: true,
          status: "pending",
        } as any);

      if (error) throw error;

      // Send Telegram notification
      try {
        await supabase.functions.invoke("send-telegram-notification", {
          body: {
            message: `🔔 *New UPI Payment Received*\n\n👤 ${name.trim()}\n📧 ${email.trim()}\n📱 ${phone.trim()}\n📦 ${product.name}\n💰 ₹${product.price}\n🔢 Txn ID: ${transactionId.trim()}\n\n⏳ Pending admin approval`,
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
              Thank you, <strong>{name}</strong>! We have received your payment details for <strong>{product?.name}</strong>.
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

  if (loadingProduct) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
        <Footer />
      </>
    );
  }

  if (noProduct) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-background flex items-center justify-center">
          <div className="max-w-md mx-auto text-center p-8">
            <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold text-foreground mb-2">No Product Selected</h2>
            <p className="text-muted-foreground mb-6">
              Please use the payment link shared with you or visit our products page to select a product.
            </p>
            <Button onClick={() => window.location.href = "/products"} className="w-full">
              Browse Products
            </Button>
          </div>
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
                <span className="flex items-center gap-1.5"><span className="bg-primary-foreground/20 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span> Scan & Pay</span>
                <span className="text-primary-foreground/40">→</span>
                <span className="flex items-center gap-1.5"><span className="bg-primary-foreground/20 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span> Enter Details</span>
                <span className="text-primary-foreground/40">→</span>
                <span className="flex items-center gap-1.5"><span className="bg-primary-foreground/20 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span> Get Download</span>
              </div>
            </motion.div>
          </div>
        </section>

        <div className="container-custom py-8 md:py-12">
          <div className="max-w-2xl mx-auto grid gap-6">
            {/* Product Info */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                    Selected Product
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <h3 className="font-semibold text-foreground">{product!.name}</h3>
                    {product!.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{product!.description}</p>
                    )}
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-xl font-bold price-text">₹{product!.price}</span>
                      {product!.original_price && product!.original_price > product!.price && (
                        <span className="text-sm price-original">₹{product!.original_price}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* QR Code Scanner */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <QrCode className="h-5 w-5 text-primary" />
                    Step 1: Scan & Pay ₹{product!.price}
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
                        <p>Pay exact amount: <strong>₹{product!.price}</strong></p>
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

            {/* Customer Details & Transaction ID */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5 text-primary" />
                    Step 2: Your Details & Transaction ID
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Fill your details and transaction ID below. After we verify your payment, download links will be sent to your email.
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
                  <div className="space-y-2">
                    <Label htmlFor="upi-txn" className="flex items-center gap-1.5">
                      <Hash className="h-3.5 w-3.5" /> UPI Transaction ID <span className="text-destructive">*</span>
                    </Label>
                    <Input id="upi-txn" placeholder="e.g. 412345678901" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
                    <p className="text-xs text-muted-foreground">📋 You can find this in your UPI app payment history</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Submit Button */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !qrImageUrl}
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
