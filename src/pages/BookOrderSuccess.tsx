import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { CheckCircle2, Package, Truck, Loader2, AlertCircle, MessageCircle } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const BookOrderSuccess = () => {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [message, setMessage] = useState('Confirming your payment…');
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    const cached = sessionStorage.getItem('hardcopy_last_order');
    if (cached) {
      try { setOrderNumber(JSON.parse(cached).order_number); } catch {}
    }

    const payment_id = params.get('razorpay_payment_id');
    const payment_link_id = params.get('razorpay_payment_link_id');
    const reference_id = params.get('razorpay_payment_link_reference_id');
    const link_status = params.get('razorpay_payment_link_status');
    const signature = params.get('razorpay_signature');

    if (!payment_id || !payment_link_id) {
      setStatus('failed');
      setMessage('Payment details missing. If you completed the payment, please contact support.');
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('verify-hardcopy-payment', {
          body: {
            razorpay_payment_id: payment_id,
            razorpay_payment_link_id: payment_link_id,
            razorpay_payment_link_reference_id: reference_id,
            razorpay_payment_link_status: link_status,
            razorpay_signature: signature,
          },
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Verification failed');
        setOrderNumber(data.order_number || orderNumber);
        setMessage(data.message || 'Payment confirmed.');
        setStatus('success');
      } catch (e: any) {
        console.error(e);
        setMessage(e?.message || 'We could not confirm your payment. Please contact support.');
        setStatus('failed');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet><title>Book Order Status | Safal Online Academy</title></Helmet>
      <Header hideCartButton />
      <main className="flex-1 container-custom py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="max-w-xl mx-auto bg-card border border-border rounded-2xl p-8 shadow-sm text-center"
        >
          {status === 'verifying' && (
            <>
              <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
              <h1 className="text-2xl font-bold mb-2">Confirming Payment…</h1>
              <p className="text-muted-foreground">{message}</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="h-16 w-16 mx-auto rounded-full bg-secondary/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-10 w-10 text-secondary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Order Placed Successfully!</h1>
              <p className="text-muted-foreground mb-5">{message}</p>
              {orderNumber && (
                <p className="text-sm bg-muted/50 rounded-lg py-2 px-3 inline-block mb-5">
                  Order Number: <span className="font-mono font-semibold text-foreground">{orderNumber}</span>
                </p>
              )}
              <div className="grid sm:grid-cols-3 gap-3 my-6 text-sm">
                <div className="p-4 rounded-lg bg-muted/40">
                  <Package className="h-5 w-5 text-primary mx-auto mb-2" />
                  <p className="font-medium">We're packing</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/40">
                  <Truck className="h-5 w-5 text-primary mx-auto mb-2" />
                  <p className="font-medium">Courier dispatch</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/40">
                  <MessageCircle className="h-5 w-5 text-primary mx-auto mb-2" />
                  <p className="font-medium">WhatsApp tracking</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Your book will be shipped to your address shortly. You'll receive courier name and tracking ID on WhatsApp once dispatched.
              </p>
              <Link to="/books"><Button className="mt-6">Order more books</Button></Link>
            </>
          )}
          {status === 'failed' && (
            <>
              <div className="h-16 w-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="h-10 w-10 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Payment Not Confirmed</h1>
              <p className="text-muted-foreground mb-5">{message}</p>
              {orderNumber && (
                <p className="text-sm">Reference: <span className="font-mono">{orderNumber}</span></p>
              )}
              <Link to="/books"><Button className="mt-6">Back to Books</Button></Link>
            </>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default BookOrderSuccess;
