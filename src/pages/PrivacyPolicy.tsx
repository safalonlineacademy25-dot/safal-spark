import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const PrivacyPolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Helmet>
        <title>Privacy Policy - Safal Online Academy</title>
        <meta name="description" content="Privacy Policy for Safal Online Academy - Learn how we collect, use, and protect your personal information when you purchase our digital study materials." />
      </Helmet>
      
      <Header />
      
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>
            
            <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
              <p className="text-sm text-muted-foreground">Last updated: January 8, 2026</p>
              
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
                <p>
                  Welcome to Safal Online Academy ("we," "our," "us," or "Company"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website <strong>safalonline.in</strong> and purchase our digital educational products.
                </p>
                <p>
                  By using our website and services, you consent to the data practices described in this policy. If you do not agree with this policy, please do not access or use our services.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">2. Business Information</h2>
                <p>
                  <strong>Safal Online Academy</strong><br />
                  Registered Address: Mumbai, India<br />
                  Email: safalonlineacademy@gmail.com<br />
                  Phone: +91 7620045446<br />
                  Website: https://safalonline.in
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">3. Information We Collect</h2>
                <p>We collect information that you provide directly to us when you make a purchase or interact with our website:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Personal Information:</strong> Full name, email address, and mobile phone number provided during checkout</li>
                  <li><strong>Payment Information:</strong> Payment details are processed securely through Razorpay Payment Gateway; we do not store your card details, CVV, or banking credentials on our servers</li>
                  <li><strong>Communication Preferences:</strong> Your preference for receiving download links via Email or WhatsApp</li>
                  <li><strong>Transaction Data:</strong> Order history, purchase amounts, and product details</li>
                  <li><strong>Usage Data:</strong> IP address, browser type, device information, pages visited, and time spent on our website</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">4. How We Use Your Information</h2>
                <p>We use the information we collect for the following purposes:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>To process and fulfill your orders for digital study materials</li>
                  <li>To send you secure download links via your preferred method (Email and/or WhatsApp)</li>
                  <li>To communicate with you about your orders, provide customer support, and respond to inquiries</li>
                  <li>To send order confirmations and transaction receipts</li>
                  <li>To prevent fraud and ensure secure transactions</li>
                  <li>To improve our website, products, and services</li>
                  <li>To comply with legal obligations and regulatory requirements</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">5. Information Sharing and Disclosure</h2>
                <p>
                  We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Payment Processor (Razorpay):</strong> We use Razorpay as our payment gateway for secure payment processing. Razorpay may collect and process your payment information in accordance with their privacy policy</li>
                  <li><strong>Email Service Provider (Resend):</strong> For sending order confirmations and download links to your email</li>
                  <li><strong>WhatsApp Business API:</strong> For delivering download links via WhatsApp when you opt-in for this service</li>
                  <li><strong>Legal Requirements:</strong> When required by law, court order, or government authority, or to protect our rights and safety</li>
                  <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">6. Data Security</h2>
                <p>
                  We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>SSL/TLS encryption for all data transmission</li>
                  <li>Secure payment processing through PCI-DSS compliant Razorpay</li>
                  <li>Regular security assessments and updates</li>
                  <li>Access controls and authentication mechanisms</li>
                </ul>
                <p>
                  However, no electronic transmission over the internet is completely secure. While we strive to protect your information, we cannot guarantee absolute security.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">7. Data Retention</h2>
                <p>
                  We retain your personal information for as long as necessary to fulfill the purposes outlined in this policy, comply with legal obligations, resolve disputes, and enforce our agreements. Order records may be retained for up to 7 years for tax and legal compliance purposes.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">8. Your Rights</h2>
                <p>Under applicable Indian laws, you have the following rights:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Access:</strong> Request access to the personal information we hold about you</li>
                  <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                  <li><strong>Deletion:</strong> Request deletion of your personal information, subject to legal retention requirements</li>
                  <li><strong>Opt-out:</strong> Opt-out of marketing communications at any time</li>
                  <li><strong>Withdraw Consent:</strong> Withdraw your consent for data processing where applicable</li>
                </ul>
                <p className="mt-4">
                  To exercise any of these rights, please contact us at <span className="font-medium text-foreground">safalonlineacademy@gmail.com</span>. We will respond to your request within 30 days.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">9. Cookies and Tracking Technologies</h2>
                <p>
                  We use cookies and similar tracking technologies to enhance your browsing experience, analyze website traffic, and understand user behavior. You can control cookies through your browser settings. Disabling cookies may affect certain features of our website.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">10. Third-Party Links</h2>
                <p>
                  Our website may contain links to third-party websites. We are not responsible for the privacy practices or content of these external sites. We encourage you to read the privacy policies of any third-party websites you visit.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">11. Children's Privacy</h2>
                <p>
                  Our services are not intended for children under the age of 18. We do not knowingly collect personal information from children. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">12. Changes to This Policy</h2>
                <p>
                  We reserve the right to update this Privacy Policy at any time. Changes will be effective immediately upon posting on this page with an updated "Last updated" date. We encourage you to review this policy periodically. Your continued use of our services after any changes constitutes acceptance of the updated policy.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">13. Governing Law</h2>
                <p>
                  This Privacy Policy is governed by and construed in accordance with the laws of India, including the Information Technology Act, 2000 and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">14. Contact Us</h2>
                <p>
                  If you have any questions, concerns, or complaints about this Privacy Policy or our data practices, please contact us at:
                </p>
                <div className="bg-muted/50 p-4 rounded-lg border border-border">
                  <p className="font-semibold text-foreground mb-2">Safal Online Academy</p>
                  <p>Address: Mumbai, India</p>
                  <p>Email: safalonlineacademy@gmail.com</p>
                  <p>Phone: +91 7620045446</p>
                  <p>Website: https://safalonline.in</p>
                  <p className="mt-2 text-sm">We will respond to your inquiry within 48 hours.</p>
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

export default PrivacyPolicy;
