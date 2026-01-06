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
        <title>Refund Policy - Safal Academy</title>
        <meta name="description" content="Refund Policy for Safal Academy - Understand our refund and cancellation policy for digital study materials and educational content purchases." />
      </Helmet>
      
      <Header />
      
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">Refund Policy</h1>
            
            <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
              <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">1. Digital Products - No Refund Policy</h2>
                <p>
                  Due to the nature of digital products, all sales of study materials, notes, and mock papers are <strong>final and non-refundable</strong>. Once a digital product has been purchased and the download link has been sent, no refunds will be issued.
                </p>
                <p>
                  This policy exists because digital products can be copied and retained after download, making it impossible to "return" them in the traditional sense.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">2. Exceptions</h2>
                <p>We may consider refunds or replacements in the following exceptional circumstances:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Duplicate Purchase:</strong> If you accidentally purchased the same product twice</li>
                  <li><strong>Technical Issues:</strong> If you are unable to download or access the purchased files due to technical errors on our end</li>
                  <li><strong>Wrong Product:</strong> If you received a different product than what was advertised</li>
                  <li><strong>Corrupted Files:</strong> If the downloaded files are corrupted and we cannot provide a working replacement</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">3. How to Request a Refund</h2>
                <p>If you believe you qualify for a refund exception, please:</p>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>Contact us within 7 days of purchase</li>
                  <li>Provide your order number and email address used for purchase</li>
                  <li>Explain the issue in detail</li>
                  <li>Include any relevant screenshots or documentation</li>
                </ol>
                <p className="mt-4">
                  Send your refund request to: <span className="font-medium text-foreground">support@safalonline.in</span>
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">4. Refund Processing</h2>
                <p>
                  If your refund is approved:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Refunds will be processed within 7-10 business days</li>
                  <li>The refund will be credited to your original payment method</li>
                  <li>You will receive an email confirmation once the refund is processed</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">5. Cancellation Policy</h2>
                <p>
                  Since digital products are delivered instantly after payment, orders cannot be cancelled once the payment is completed and download links are generated.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">6. Download Issues</h2>
                <p>
                  Before requesting a refund for download issues, please try:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Using a different browser or device</li>
                  <li>Checking your internet connection</li>
                  <li>Checking your spam/junk folder for download links</li>
                  <li>Contacting our support team for assistance</li>
                </ul>
                <p className="mt-4">
                  We are committed to ensuring you receive your purchased materials and will work with you to resolve any technical issues.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">7. Contact Us</h2>
                <p>
                  For any questions regarding our refund policy, please contact us:
                </p>
                <p className="font-medium text-foreground">
                  Email: support@safalonline.in<br />
                  Phone: +91 98765 43210
                </p>
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
