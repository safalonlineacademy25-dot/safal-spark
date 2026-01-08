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
        <title>Terms and Conditions - Safal Online Academy</title>
        <meta name="description" content="Terms and Conditions for Safal Online Academy - Read our terms for purchasing and using our digital study materials and educational content." />
      </Helmet>
      
      <Header />
      
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">Terms and Conditions</h1>
            
            <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
              <p className="text-sm text-muted-foreground">Last updated: January 8, 2026</p>
              
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
                <p>
                  Welcome to Safal Online Academy. These Terms and Conditions ("Terms") govern your use of our website <strong>safalonline.in</strong> and the purchase of digital educational products offered by Safal Online Academy ("we," "our," "us," or "Company").
                </p>
                <p>
                  By accessing our website or making a purchase, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our services.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">2. Business Information</h2>
                <div className="bg-muted/50 p-4 rounded-lg border border-border">
                  <p className="font-semibold text-foreground mb-2">Safal Online Academy</p>
                  <p>Registered Address: Pune, Maharashtra, India</p>
                  <p>Email: safalonlineacademy@gmail.com</p>
                  <p>Phone: +91 98765 43210</p>
                  <p>Website: https://safalonline.in</p>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">3. Description of Services</h2>
                <p>
                  Safal Online Academy is a digital education platform offering study materials, notes, and mock question papers for competitive exams, engineering courses, and university examinations. All products are delivered digitally in PDF format via email and/or WhatsApp immediately after successful payment.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">4. Eligibility</h2>
                <p>
                  To use our services and make purchases, you must be at least 18 years of age or have parental/guardian consent. By using our website, you represent and warrant that you meet these eligibility requirements.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">5. Digital Product License</h2>
                <p>Upon successful purchase and payment, you are granted a personal, non-exclusive, non-transferable license to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Download and access the purchased digital study materials</li>
                  <li>Use the materials for personal educational purposes only</li>
                  <li>Store copies on your personal devices for your own use</li>
                </ul>
                <p className="font-medium text-foreground mt-4">You are expressly NOT permitted to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Share, distribute, resell, or transfer the purchased materials to any third party</li>
                  <li>Upload materials to file-sharing websites, social media, or any public platform</li>
                  <li>Reproduce, modify, or create derivative works for commercial purposes</li>
                  <li>Remove, alter, or obscure any copyright notices, watermarks, or proprietary markings</li>
                  <li>Use the materials for any illegal or unauthorized purpose</li>
                </ul>
                <p className="mt-4">
                  Violation of these license terms may result in legal action and termination of your access rights.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">6. Pricing and Payment</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>All prices are listed in Indian Rupees (INR) and are inclusive of applicable taxes</li>
                  <li>Prices are subject to change without prior notice; however, confirmed orders will be honored at the price displayed at the time of purchase</li>
                  <li>Payment is processed securely through <strong>Razorpay Payment Gateway</strong></li>
                  <li>We accept various payment methods including UPI, Credit/Debit Cards, Net Banking, and Wallets as available through Razorpay</li>
                  <li>Payment must be completed in full at the time of purchase</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">7. Order Processing and Delivery</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Instant Delivery:</strong> Digital products are delivered immediately after successful payment confirmation</li>
                  <li><strong>Delivery Method:</strong> Secure download links are sent to your registered email address and/or WhatsApp number (if opted in)</li>
                  <li><strong>Download Validity:</strong> Download links are valid for a limited period as specified at the time of purchase</li>
                  <li><strong>Download Limits:</strong> Each product may have a maximum number of allowed downloads as specified</li>
                </ul>
                <p className="mt-4">
                  If you do not receive your download links within 30 minutes of payment, please check your spam/junk folder first. If still not received within 24 hours, contact our support team at <span className="font-medium text-foreground">safalonlineacademy@gmail.com</span>.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">8. User Responsibilities</h2>
                <p>By using our services, you agree to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide accurate and complete contact information (name, email, phone number) for order delivery</li>
                  <li>Use the purchased materials in compliance with these Terms</li>
                  <li>Respect all intellectual property rights</li>
                  <li>Not engage in any fraudulent, abusive, or illegal activities</li>
                  <li>Not attempt to circumvent security measures or download restrictions</li>
                  <li>Maintain the confidentiality of your download links</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">9. Intellectual Property Rights</h2>
                <p>
                  All content on our website, including but not limited to study materials, notes, mock papers, logos, graphics, text, and website design, is the intellectual property of Safal Online Academy and is protected by Indian copyright laws and international intellectual property treaties.
                </p>
                <p>
                  Unauthorized reproduction, distribution, modification, or use of our content may result in civil and criminal penalties.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">10. Refund and Cancellation Policy</h2>
                <p>
                  Please refer to our detailed <a href="/refund" className="text-primary underline hover:text-primary/80">Refund and Cancellation Policy</a> for complete information regarding refunds, cancellations, and exceptions.
                </p>
                <p className="font-medium text-foreground mt-2">
                  Key Points:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>All sales of digital products are final and non-refundable once download links are delivered</li>
                  <li>Refund requests for exceptional cases must be made within 7 days of purchase</li>
                  <li>Approved refunds are processed within 5-7 business days</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">11. Limitation of Liability</h2>
                <p>
                  Safal Online Academy provides study materials as educational aids and supplementary resources. To the maximum extent permitted by law:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>We do not guarantee specific exam results, scores, grades, or outcomes</li>
                  <li>We are not liable for any direct, indirect, incidental, consequential, or punitive damages arising from the use of our products</li>
                  <li>Our total liability shall not exceed the purchase price of the specific product(s) in question</li>
                  <li>We are not responsible for technical issues on your device or internet connection that may affect download or access</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">12. Indemnification</h2>
                <p>
                  You agree to indemnify, defend, and hold harmless Safal Online Academy and its owners, employees, and affiliates from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from your violation of these Terms or misuse of our products or services.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">13. Modifications to Terms</h2>
                <p>
                  We reserve the right to modify these Terms and Conditions at any time. Changes will be effective immediately upon posting on this page with an updated "Last updated" date. Your continued use of our services after any modifications constitutes acceptance of the updated Terms.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">14. Governing Law and Jurisdiction</h2>
                <p>
                  These Terms and Conditions are governed by and construed in accordance with the laws of India. Any disputes arising from or relating to these Terms shall be subject to the exclusive jurisdiction of the courts in Pune, Maharashtra, India.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">15. Severability</h2>
                <p>
                  If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">16. Contact Information</h2>
                <p>
                  For any questions, concerns, or support regarding these Terms and Conditions, please contact us:
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

export default TermsOfService;
