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
        <title>Disclaimer - Safal Academy</title>
        <meta name="description" content="Disclaimer for Safal Academy - Important information about our digital study materials, educational content, and limitations of liability." />
      </Helmet>
      
      <Header />
      
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">Disclaimer</h1>
            
            <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
              <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">1. Educational Purpose Only</h2>
                <p>
                  The study materials, notes, and mock papers provided by Safal Academy are intended for educational and informational purposes only. These materials are designed to supplement your exam preparation and should be used alongside official textbooks, course materials, and guidance from qualified educators.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">2. No Guarantee of Results</h2>
                <p>
                  While our study materials are carefully prepared to help students prepare for competitive exams and university examinations, we do not guarantee:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Specific exam scores or grades</li>
                  <li>Success in any particular examination</li>
                  <li>Admission to any educational institution</li>
                  <li>Any specific learning outcomes</li>
                </ul>
                <p className="mt-4">
                  Exam success depends on multiple factors including individual effort, understanding, time management, and official syllabus requirements.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">3. Content Accuracy</h2>
                <p>
                  We strive to provide accurate and up-to-date information in our study materials. However:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>We do not warrant that all information is error-free or complete</li>
                  <li>Exam patterns and syllabi may change, and our materials may not reflect the latest updates immediately</li>
                  <li>Users should verify critical information from official sources</li>
                  <li>We are not responsible for any inaccuracies in third-party content referenced in our materials</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">4. Not Official Materials</h2>
                <p>
                  Our study materials are independently created and are <strong>not affiliated with, endorsed by, or officially connected to</strong> any:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Government examination bodies (UPSC, SSC, Banking Boards, etc.)</li>
                  <li>Universities (Pune University, etc.)</li>
                  <li>Educational institutions (IITs, NITs, etc.)</li>
                  <li>Any official examination conducting authority</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">5. Limitation of Liability</h2>
                <p>
                  To the fullest extent permitted by law, Safal Academy shall not be liable for:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Any direct, indirect, incidental, or consequential damages arising from the use of our materials</li>
                  <li>Loss of data or profits related to your use of our products</li>
                  <li>Any reliance on information contained in our study materials</li>
                  <li>Technical issues preventing access to purchased materials (beyond our control)</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">6. Third-Party Links</h2>
                <p>
                  Our website may contain links to third-party websites or services. We are not responsible for the content, privacy practices, or accuracy of information on these external sites.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">7. Intellectual Property</h2>
                <p>
                  All trademarks, logos, and brand names mentioned in our materials (such as examination names, university names, etc.) belong to their respective owners and are used for reference purposes only.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">8. Updates to Disclaimer</h2>
                <p>
                  We reserve the right to update this disclaimer at any time. Users are encouraged to review this page periodically for any changes.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">9. Contact Us</h2>
                <p>
                  If you have any questions about this disclaimer, please contact us:
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

export default Disclaimer;
