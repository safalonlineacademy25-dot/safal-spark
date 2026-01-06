import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const TermsOfService = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Helmet>
        <title>Terms of Service - Safal Academy</title>
        <meta name="description" content="Terms of Service for Safal Academy - Read our terms and conditions for purchasing and using our digital study materials and educational content." />
      </Helmet>
      
      <Header />
      
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">Terms of Service</h1>
            
            <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
              <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
                <p>
                  By accessing and using Safal Academy's website and purchasing our digital products, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">2. Description of Services</h2>
                <p>
                  Safal Academy is a digital education platform offering study materials, notes, and mock papers for competitive exams, engineering courses, and university examinations. All products are delivered digitally in PDF format.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">3. Digital Product License</h2>
                <p>Upon purchase, you are granted a personal, non-transferable license to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Download and access the purchased digital materials</li>
                  <li>Use the materials for personal educational purposes only</li>
                  <li>Store copies on your personal devices</li>
                </ul>
                <p className="font-medium text-foreground mt-4">You are NOT permitted to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Share, distribute, or resell the purchased materials</li>
                  <li>Upload materials to file-sharing websites or platforms</li>
                  <li>Reproduce or modify the content for commercial purposes</li>
                  <li>Remove any copyright notices or watermarks</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">4. Purchase and Payment</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>All prices are listed in Indian Rupees (INR) and include applicable taxes</li>
                  <li>Payment is processed securely through Razorpay</li>
                  <li>Upon successful payment, download links are sent via Email and/or WhatsApp</li>
                  <li>Download links are valid for a limited time as specified at the time of purchase</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">5. Delivery of Digital Products</h2>
                <p>
                  Digital products are delivered instantly after successful payment. You will receive download links via your preferred method (Email or WhatsApp). If you do not receive your download links within 24 hours, please contact our support team.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">6. User Responsibilities</h2>
                <p>You agree to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide accurate contact information for order delivery</li>
                  <li>Use the materials in compliance with these terms</li>
                  <li>Respect intellectual property rights</li>
                  <li>Not engage in any fraudulent activities</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">7. Intellectual Property</h2>
                <p>
                  All content, including study materials, notes, mock papers, logos, and website design, is the intellectual property of Safal Academy and is protected by copyright laws. Unauthorized use may result in legal action.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">8. Limitation of Liability</h2>
                <p>
                  Safal Academy provides study materials as educational aids. We do not guarantee specific exam results or outcomes. Our liability is limited to the purchase price of the products.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">9. Changes to Terms</h2>
                <p>
                  We reserve the right to modify these Terms of Service at any time. Changes will be effective immediately upon posting. Your continued use of our services constitutes acceptance of the updated terms.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">10. Contact Information</h2>
                <p>
                  For questions about these Terms of Service, please contact us at:
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

export default TermsOfService;
