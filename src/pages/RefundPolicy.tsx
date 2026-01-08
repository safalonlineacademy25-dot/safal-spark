import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const RefundPolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Helmet>
        <title>Refund and Cancellation Policy - Safal Online Academy</title>
        <meta name="description" content="Refund and Cancellation Policy for Safal Online Academy - Understand our refund policy, cancellation terms, and timelines for digital study materials." />
      </Helmet>
      
      <Header />
      
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">Refund and Cancellation Policy</h1>
            
            <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
              <p className="text-sm text-muted-foreground">Last updated: January 8, 2026</p>
              
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">1. Overview</h2>
                <p>
                  This Refund and Cancellation Policy outlines the terms and conditions for refunds and cancellations of digital products purchased from Safal Online Academy through our website <strong>safalonline.in</strong>. By making a purchase, you acknowledge and agree to this policy.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">2. Digital Products - No Refund Policy</h2>
                <p>
                  Due to the nature of digital products, <strong>all sales of study materials, notes, and mock papers are final and non-refundable</strong> once the purchase is completed and download links have been sent.
                </p>
                <p>
                  This policy exists because:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Digital products can be instantly downloaded, copied, and retained after delivery</li>
                  <li>It is not possible to verify the "return" of a digital product</li>
                  <li>The delivery of our products is instantaneous upon successful payment</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">3. Cancellation Policy</h2>
                <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                  <p className="font-semibold text-foreground mb-2">Important: Instant Delivery</p>
                  <p>
                    Since digital products are delivered <strong>immediately</strong> after payment confirmation, <strong>orders cannot be cancelled</strong> once the payment is completed and download links are generated. There is no cancellation window as delivery happens within seconds of payment.
                  </p>
                </div>
                <p className="mt-4">
                  <strong>Before Payment:</strong> You may cancel your order at any time before completing the payment by simply closing the payment window or not proceeding with the transaction.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">4. Exceptions for Refund</h2>
                <p>We may consider refunds or replacements only in the following exceptional circumstances:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Duplicate Purchase:</strong> If you accidentally purchased the same product twice within 24 hours using the same email address</li>
                  <li><strong>Technical Issues on Our End:</strong> If you are unable to download or access the purchased files due to server errors or technical issues caused by our platform</li>
                  <li><strong>Wrong Product Delivered:</strong> If you received a completely different product than what was advertised and ordered</li>
                  <li><strong>Corrupted Files:</strong> If the downloaded files are corrupted and we cannot provide a working replacement</li>
                  <li><strong>Payment Deducted but Order Not Confirmed:</strong> If payment was deducted from your account but no order confirmation or download links were received</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">5. Refund Request Process</h2>
                <p>If you believe you qualify for a refund under the exceptions listed above, please follow these steps:</p>
                <ol className="list-decimal pl-6 space-y-2">
                  <li><strong>Timeframe:</strong> Submit your refund request within <strong>7 days</strong> of the original purchase date</li>
                  <li><strong>Contact Us:</strong> Email your request to <span className="font-medium text-foreground">safalonlineacademy@gmail.com</span></li>
                  <li><strong>Include the following information:</strong>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>Your Order Number / Transaction ID</li>
                      <li>Email address and phone number used for purchase</li>
                      <li>Product name purchased</li>
                      <li>Date of purchase</li>
                      <li>Detailed description of the issue</li>
                      <li>Screenshots or documentation supporting your claim</li>
                    </ul>
                  </li>
                  <li><strong>Response Time:</strong> Our team will review your request and respond within <strong>1-2 business days</strong></li>
                </ol>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">6. Refund Processing Timeline</h2>
                <div className="bg-muted/50 p-4 rounded-lg border border-border">
                  <p className="font-semibold text-foreground mb-3">If your refund is approved:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Processing Time:</strong> Refunds will be initiated within <strong>5-7 business days</strong> from the date of approval</li>
                    <li><strong>Credit to Account:</strong> The refund amount will be credited to your original payment method within <strong>7-10 business days</strong> depending on your bank/payment provider</li>
                    <li><strong>Confirmation:</strong> You will receive an email confirmation once the refund has been processed from our end</li>
                    <li><strong>Refund Amount:</strong> The full purchase amount will be refunded. Payment gateway charges, if any, are non-refundable</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">7. Non-Refundable Situations</h2>
                <p>Refunds will NOT be provided in the following situations:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Change of mind after purchase</li>
                  <li>Claiming you did not read the product description before purchasing</li>
                  <li>Difficulty level of content not meeting your expectations</li>
                  <li>Product already downloaded or accessed</li>
                  <li>Technical issues caused by your device, browser, or internet connection</li>
                  <li>Failure to download within the specified validity period</li>
                  <li>Exam pattern changes by official authorities after your purchase</li>
                  <li>Request made after 7 days of purchase</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">8. Download Issues - Before Requesting Refund</h2>
                <p>
                  Before requesting a refund for download or access issues, please try the following troubleshooting steps:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Check your spam/junk/promotions folder for the download email</li>
                  <li>Check your WhatsApp messages if you opted for WhatsApp delivery</li>
                  <li>Try using a different browser (Chrome, Firefox, Safari, Edge)</li>
                  <li>Try downloading on a different device (mobile/desktop)</li>
                  <li>Ensure you have a stable internet connection</li>
                  <li>Clear your browser cache and cookies</li>
                  <li>Disable any ad-blockers or VPNs temporarily</li>
                </ul>
                <p className="mt-4">
                  If issues persist, contact our support team at <span className="font-medium text-foreground">safalonlineacademy@gmail.com</span> with details of the issue. We are committed to ensuring you receive your purchased materials and will work with you to resolve any technical problems.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">9. Chargebacks and Disputes</h2>
                <p>
                  If you file a chargeback or payment dispute with your bank or payment provider without first contacting us, we reserve the right to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Contest the chargeback with evidence of delivery</li>
                  <li>Revoke access to all purchased products</li>
                  <li>Block future purchases from your account</li>
                </ul>
                <p className="mt-4">
                  We encourage you to contact us first to resolve any issues before initiating a dispute.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">10. Contact Us</h2>
                <p>
                  For any questions or concerns regarding refunds and cancellations, please contact us:
                </p>
                <div className="bg-muted/50 p-4 rounded-lg border border-border">
                  <p className="font-semibold text-foreground mb-2">Safal Online Academy</p>
                  <p>Address: Pune, Maharashtra, India</p>
                  <p>Email: safalonlineacademy@gmail.com</p>
                  <p>Phone: +91 98765 43210</p>
                  <p>Website: https://safalonline.in</p>
                  <p className="mt-2 text-sm">Support Hours: Monday to Saturday, 10:00 AM - 6:00 PM IST</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </>
  );
};

export default RefundPolicy;
