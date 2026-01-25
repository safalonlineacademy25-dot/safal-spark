import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const Disclaimer = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Helmet>
        <title>Disclaimer - Safal Online Academy</title>
        <meta name="description" content="Disclaimer for Safal Online Academy - Important information about our digital study materials, educational content, and limitations of liability." />
      </Helmet>
      
      <Header />
      
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">Disclaimer</h1>
            
            <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
              <p className="text-sm text-muted-foreground">Last updated: January 8, 2026</p>
              
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">1. General Information</h2>
                <p>
                  The information, study materials, notes, and mock papers provided by Safal Online Academy through our website <strong>safalonline.in</strong> are for general educational and informational purposes only. By accessing our website and purchasing our products, you acknowledge and agree to this disclaimer.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">2. Educational Purpose Only</h2>
                <p>
                  Our study materials are designed to supplement your exam preparation and should be used alongside official textbooks, course materials, and guidance from qualified educators. These materials are:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Intended as study aids and reference materials</li>
                  <li>Created to help students prepare for competitive exams and university examinations</li>
                  <li>Not substitutes for official course materials or classroom instruction</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">3. No Guarantee of Results</h2>
                <div className="bg-amber-500/10 p-4 rounded-lg border border-amber-500/20">
                  <p className="font-semibold text-foreground mb-2">Important Notice</p>
                  <p>
                    While our study materials are carefully prepared by experienced educators, we do not guarantee or warrant any specific:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Exam scores, marks, or grades</li>
                    <li>Success in any examination or test</li>
                    <li>Admission to any educational institution</li>
                    <li>Job placement or career outcomes</li>
                    <li>Learning outcomes or skill development</li>
                  </ul>
                </div>
                <p className="mt-4">
                  Exam success depends on multiple factors including but not limited to: individual effort, understanding, time management, consistent practice, official syllabus coverage, examination pattern, and personal aptitude.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">4. Content Accuracy and Updates</h2>
                <p>
                  We strive to provide accurate, relevant, and up-to-date information in our study materials. However:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>We do not warrant that all information is error-free, complete, or current</li>
                  <li>Examination patterns, syllabi, and marking schemes may change at the discretion of examination authorities</li>
                  <li>Our materials may not immediately reflect the latest updates from official sources</li>
                  <li>Users are strongly advised to verify critical information from official sources before relying on it</li>
                  <li>We are not responsible for any inaccuracies, omissions, or outdated information</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">5. Not Official Materials</h2>
                <p>
                  Our study materials are independently created and are <strong>NOT affiliated with, endorsed by, sponsored by, or officially connected to</strong> any:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Government examination bodies (UPSC, SSC, IBPS, RRB, State PSCs, etc.)</li>
                  <li>Universities (Savitribai Phule Pune University, Mumbai University, etc.)</li>
                  <li>Educational institutions (IITs, NITs, AIIMS, etc.)</li>
                  <li>Banking and financial examination authorities</li>
                  <li>Any official examination conducting authority</li>
                </ul>
                <p className="mt-4">
                  All trademarks, logos, and brand names mentioned are the property of their respective owners and are used for reference purposes only.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">6. Limitation of Liability</h2>
                <p>
                  To the fullest extent permitted by applicable law, Safal Online Academy and its owners, employees, affiliates, and partners shall NOT be liable for:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Any direct, indirect, incidental, special, consequential, or punitive damages arising from the use or inability to use our materials</li>
                  <li>Loss of data, profits, revenue, or business opportunities</li>
                  <li>Any reliance placed on information contained in our study materials</li>
                  <li>Technical issues, server downtime, or interruptions in service</li>
                  <li>Actions of third-party service providers (payment gateways, email providers, etc.)</li>
                  <li>Exam results or career outcomes based on use of our materials</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">7. Third-Party Links and Services</h2>
                <p>
                  Our website may contain links to third-party websites, services, or resources. We:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Do not control or endorse these external sites</li>
                  <li>Are not responsible for their content, privacy practices, or accuracy</li>
                  <li>Provide these links for convenience only</li>
                  <li>Encourage users to review the terms and privacy policies of any third-party sites</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">8. Payment Gateway Disclaimer</h2>
                <p>
                  We use Razorpay as our payment gateway for secure transactions. While we ensure secure checkout on our end:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>We are not responsible for any issues arising from payment processing by Razorpay</li>
                  <li>Users should refer to Razorpay's terms and privacy policy for payment-related queries</li>
                  <li>Transaction disputes should first be raised with our support team before approaching Razorpay or your bank</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">9. User Responsibility</h2>
                <p>
                  By using our products and services, you acknowledge that:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>You are responsible for your own exam preparation and study habits</li>
                  <li>You will use our materials as supplementary resources, not as the sole source of preparation</li>
                  <li>You will verify important information from official sources</li>
                  <li>You will not hold us responsible for your examination outcomes</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">10. Intellectual Property</h2>
                <p>
                  All content on our website and in our study materials is protected by intellectual property laws. This disclaimer does not grant any license to reproduce, distribute, or create derivative works from our materials except as expressly permitted in our Terms and Conditions.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">11. Changes to Disclaimer</h2>
                <p>
                  We reserve the right to update or modify this disclaimer at any time without prior notice. Users are encouraged to review this page periodically. Continued use of our services after changes constitutes acceptance of the updated disclaimer.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">12. Governing Law</h2>
                <p>
                  This disclaimer is governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Mumbai, India.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">13. Contact Us</h2>
                <p>
                  If you have any questions about this disclaimer, please contact us:
                </p>
                <div className="bg-muted/50 p-4 rounded-lg border border-border">
                  <p className="font-semibold text-foreground mb-2">Safal Online Academy</p>
                  <p>Address: Mumbai, India</p>
                  <p>Email: safalonlineacademy@gmail.com</p>
                  <p>Phone: +91 7620045446</p>
                  <p>Website: https://safalonline.in</p>
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

export default Disclaimer;
