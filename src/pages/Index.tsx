import { useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/home/HeroSection';
import ProductsSection from '@/components/home/ProductsSection';
import AudienceSection from '@/components/home/AudienceSection';
import HowItWorksSection from '@/components/home/HowItWorksSection';
import FAQSection from '@/components/home/FAQSection';
import CTASection from '@/components/home/CTASection';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const hasTracked = useRef(false);

  // Track page visit once per session
  useEffect(() => {
    const trackVisit = async () => {
      // Only track once per page load
      if (hasTracked.current) return;
      hasTracked.current = true;

      try {
        await supabase.functions.invoke('track-visit', {
          method: 'POST',
        });
        console.log('[Index] Visit tracked');
      } catch (error) {
        // Silently fail - visitor tracking shouldn't affect user experience
        console.log('[Index] Failed to track visit:', error);
      }
    };

    trackVisit();
  }, []);

  return (
    <>
      <Helmet>
        <title>Safal Online Academy | Competitive Exam Notes & Mock Papers</title>
        <meta
          name="description"
          content="Buy competitive exam notes and mock question papers online. Instant PDF download. Secure Razorpay payment. Designed for Indian college students."
        />
        <meta
          name="keywords"
          content="competitive exam notes, mock papers, SSC notes, banking exam preparation, study materials India"
        />
        <link rel="canonical" href="https://safalonline.in" />
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <HeroSection />
          <ProductsSection />
          <AudienceSection />
          <HowItWorksSection />
          <FAQSection />
          <CTASection />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
