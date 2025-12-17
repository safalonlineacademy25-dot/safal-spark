import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Download, FileText, Shield, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';

const HeroSection = () => {
  const trustPoints = [
    { icon: Download, text: 'Instant PDF Access' },
    { icon: Shield, text: 'Secure Razorpay Payments' },
    { icon: IndianRupee, text: 'Student-Friendly Pricing' },
  ];

  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 hero-gradient opacity-95" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRWMjhIMjR2Mmgxem0tMTIgOGgxMnYtMkgyNHYyem0xMi0xNnYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />

      <div className="relative container-custom">
        <div className="min-h-[85vh] flex flex-col justify-center py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 mb-6"
            >
              <span className="flex h-2 w-2 rounded-full bg-secondary animate-pulse" />
              <span className="text-sm font-medium text-primary-foreground">
                Trusted by 10,000+ Students
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-primary-foreground leading-tight mb-6"
            >
              Crack Competitive Exams with{' '}
              <span className="relative">
                Smart, Exam-Ready Notes
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 300 12"
                  fill="none"
                >
                  <path
                    d="M2 8C50 4 150 2 298 8"
                    stroke="hsl(160 84% 39%)"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto"
            >
              High-quality notes and mock question papers designed specifically for Indian college students preparing for SSC, Banking, Railways & more.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
            >
              <Link to="/products">
                <Button size="xl" variant="hero-outline" className="w-full sm:w-auto">
                  <Download className="mr-2 h-5 w-5" />
                  Download Notes Now
                </Button>
              </Link>
              <Link to="/products?category=mock-papers">
                <Button size="xl" variant="hero-outline" className="w-full sm:w-auto">
                  <FileText className="mr-2 h-5 w-5" />
                  View Mock Papers
                </Button>
              </Link>
            </motion.div>

            {/* Trust Points */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-wrap justify-center gap-6 md:gap-8"
            >
              {trustPoints.map((point, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-primary-foreground/90"
                >
                  <point.icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{point.text}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Wave Bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          className="w-full h-auto"
          preserveAspectRatio="none"
        >
          <path
            d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="hsl(210 20% 98%)"
          />
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
