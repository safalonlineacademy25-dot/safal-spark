import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { CheckCircle, Mail, MessageCircle, Download, ArrowRight, Home } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';

const OrderSuccess = () => {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('order') || '';
  const email = searchParams.get('email') || '';

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
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary/10 flex items-center justify-center"
              >
                <CheckCircle className="h-10 w-10 text-secondary" />
              </motion.div>

              {/* Success Message */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                  Payment Successful! 🎉
                </h1>
                <p className="text-base text-muted-foreground mb-1">
                  Thank you for your purchase
                </p>
                {orderNumber && (
                  <p className="text-xs font-medium text-primary mb-4">
                    Order ID: {orderNumber}
                  </p>
                )}
              </motion.div>

              {/* Order Details Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-card rounded-xl border border-border p-4 mb-4 text-left"
              >
                <h2 className="text-base font-semibold text-foreground mb-3 text-center">
                  What happens next?
                </h2>

                <div className="space-y-2">
                  {/* Email Delivery */}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-foreground">
                        Check your email
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Download links sent to{' '}
                        {email ? (
                          <span className="font-medium text-foreground">{email}</span>
                        ) : (
                          'your email'
                        )}
                      </p>
                    </div>
                  </div>

                  {/* WhatsApp Delivery */}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                      <MessageCircle className="h-4 w-4 text-secondary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-foreground">
                        WhatsApp notification
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        If opted in, you'll also get links on WhatsApp
                      </p>
                    </div>
                  </div>

                  {/* Download Info */}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <Download className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-foreground">
                        Download your files
                      </h3>
                      <p className="text-xs text-muted-foreground">
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
                <a href="mailto:support@safalonlineacademy.com" className="text-primary hover:underline">
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
