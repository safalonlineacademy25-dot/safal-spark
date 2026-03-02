import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { CheckCircle, Mail, MessageCircle, Download, ArrowRight, Home, Loader2, AlertCircle } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Convert name to Title Case (e.g., "john DOE" → "John Doe")
const toTitleCase = (name: string): string =>
  name.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const OrderSuccess = () => {
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const hasVerified = useRef(false);

  // Check for Razorpay Payment Link callback params
  const razorpayPaymentId = searchParams.get('razorpay_payment_id');
  const razorpayPaymentLinkId = searchParams.get('razorpay_payment_link_id');
  const razorpayPaymentLinkRefId = searchParams.get('razorpay_payment_link_reference_id');
  const razorpayPaymentLinkStatus = searchParams.get('razorpay_payment_link_status');
  const razorpaySignature = searchParams.get('razorpay_signature');

  // Also check for legacy query params
  const legacyOrderNumber = searchParams.get('order');
  const legacyEmail = searchParams.get('email');
  const legacyPhone = searchParams.get('phone');

  useEffect(() => {
    // If this is a Payment Link callback, verify the payment
    if (razorpayPaymentId && razorpayPaymentLinkId && !hasVerified.current) {
      hasVerified.current = true;
      verifyPaymentLink();
    } else if (legacyOrderNumber) {
      // Legacy flow - already verified
      setOrderNumber(legacyOrderNumber);
      setEmail(legacyEmail || '');
      setPhone(legacyPhone || '');
    }

    // Try to load saved order context from sessionStorage
    try {
      const pending = sessionStorage.getItem('pending_order');
      if (pending) {
        const parsed = JSON.parse(pending);
        if (!orderNumber && parsed.order_number) setOrderNumber(parsed.order_number);
        if (!customerName && parsed.name) setCustomerName(toTitleCase(parsed.name));
        if (!email && parsed.email) setEmail(parsed.email);
        if (!phone && parsed.phone) setPhone(parsed.phone);
        sessionStorage.removeItem('pending_order');
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  const verifyPaymentLink = async () => {
    setIsVerifying(true);
    setVerificationError('');

    try {
      console.log('[OrderSuccess] Verifying payment link callback:', {
        razorpayPaymentId,
        razorpayPaymentLinkId,
        razorpayPaymentLinkRefId,
        razorpayPaymentLinkStatus,
      });

      const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
        body: {
          razorpay_payment_id: razorpayPaymentId,
          razorpay_payment_link_id: razorpayPaymentLinkId,
          razorpay_payment_link_reference_id: razorpayPaymentLinkRefId,
          razorpay_payment_link_status: razorpayPaymentLinkStatus,
          razorpay_signature: razorpaySignature,
        },
      });

      if (error) {
        console.error('[OrderSuccess] Verification error:', error);
        throw new Error(error.message || 'Payment verification failed');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Payment verification failed');
      }

      console.log('[OrderSuccess] Payment verified:', data);
      setOrderNumber(data.order_number || razorpayPaymentLinkRefId || '');

    } catch (err: any) {
      console.error('[OrderSuccess] Payment verification failed:', err);
      setVerificationError(err.message || 'Could not verify payment. Please contact support.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Show loading while verifying
  if (isVerifying) {
    return (
      <>
        <Helmet>
          <title>Verifying Payment | Safal Online Academy</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <div className="min-h-screen flex flex-col bg-background">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center px-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <h1 className="text-xl font-bold text-foreground mb-2">Verifying your payment...</h1>
              <p className="text-sm text-muted-foreground">Please wait while we confirm your payment.</p>
            </div>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  // Show error if verification failed
  if (verificationError) {
    return (
      <>
        <Helmet>
          <title>Payment Issue | Safal Online Academy</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <div className="min-h-screen flex flex-col bg-background">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center px-4 max-w-md">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="text-xl font-bold text-foreground mb-2">Payment Verification Issue</h1>
              <p className="text-sm text-muted-foreground mb-4">{verificationError}</p>
              <p className="text-xs text-muted-foreground mb-6">
                If money was deducted, don't worry — it will be refunded automatically. 
                You can also contact us at{' '}
                <a href="mailto:support@safalonlinesolutions.com" className="text-primary hover:underline">
                  support@safalonlinesolutions.com
                </a>
              </p>
              <Link to="/">
                <Button variant="outline">
                  <Home className="mr-2 h-4 w-4" />
                  Back to Home
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
        <title>Order Confirmed | Safal Online Academy</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-4 md:py-6 flex items-center justify-center">
          <div className="container-custom max-w-xl px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              {/* Success Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 rounded-full bg-secondary/10 flex items-center justify-center"
              >
                <CheckCircle className="h-8 w-8 md:h-10 md:w-10 text-secondary" />
              </motion.div>

              {/* Success Message */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h1 className="text-xl md:text-3xl font-bold text-foreground mb-1 md:mb-2">
                  Payment Successful! 🎉
                </h1>
                <p className="text-sm md:text-base text-muted-foreground mb-1">
                  Thank you{customerName ? `, ${customerName}` : ''} for your purchase
                </p>
                {orderNumber && (
                  <p className="text-xs font-medium text-primary mb-3 md:mb-4">
                    Order ID: {orderNumber}
                  </p>
                )}
              </motion.div>

              {/* Order Details Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-card rounded-xl border border-border p-3 md:p-4 mb-3 md:mb-4 text-left"
              >
                <h2 className="text-sm md:text-base font-semibold text-foreground mb-2 md:mb-3 text-center">
                  What happens next?
                </h2>

                <div className="space-y-1.5 md:space-y-2">
                  {/* Email Delivery */}
                  <div className="flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-muted/50">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xs md:text-sm font-medium text-foreground">
                        Check your email
                      </h3>
                      <p className="text-[11px] md:text-xs text-muted-foreground">
                        {email
                          ? <>Download links have been sent to <strong className="text-foreground">{email}</strong></>
                          : 'Download links sent to your registered email'}
                      </p>
                    </div>
                  </div>

                  {/* WhatsApp Delivery */}
                  <div className="flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-muted/50">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                      <MessageCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-secondary" />
                    </div>
                    <div>
                      <h3 className="text-xs md:text-sm font-medium text-foreground">
                        WhatsApp notification
                      </h3>
                      <p className="text-[11px] md:text-xs text-muted-foreground">
                        If opted in, you'll also get links on WhatsApp
                      </p>
                    </div>
                  </div>

                  {/* Download Info */}
                  <div className="flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-muted/50">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <Download className="h-3.5 w-3.5 md:h-4 md:w-4 text-accent-foreground" />
                    </div>
                    <div>
                      <h3 className="text-xs md:text-sm font-medium text-foreground">
                        Download your files
                      </h3>
                      <p className="text-[11px] md:text-xs text-muted-foreground">
                        Valid for <strong>7 days</strong>, up to <strong>3 downloads</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-3 justify-center"
              >
                <Link to="/">
                  <Button variant="outline" size="default" className="w-full sm:w-auto">
                    <Home className="mr-2 h-4 w-4" />
                    Back to Home
                  </Button>
                </Link>
                <Link to="/products">
                  <Button size="default" className="w-full sm:w-auto">
                    Continue Shopping
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </motion.div>

              {/* Support Note */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-xs text-muted-foreground mt-4"
              >
                Didn't receive your email? Check spam or{' '}
                <a href="mailto:support@safalonlinesolutions.com" className="text-primary hover:underline">
                  contact support
                </a>
              </motion.p>
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default OrderSuccess;
