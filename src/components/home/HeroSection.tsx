import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Download, FileText, Shield, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { staggerContainer, staggerItem } from '@/hooks/useScrollAnimation';
import studentStudy1 from '@/assets/student-study-1.jpg';
import studentStudy2 from '@/assets/student-study-2.jpg';
import studentStudy3 from '@/assets/student-study-3.jpg';

const HeroSection = () => {
  const trustPoints = [{
    icon: Download,
    text: 'Instant PDF Access'
  }, {
    icon: Shield,
    text: 'Secure Razorpay Payments'
  }, {
    icon: IndianRupee,
    text: 'Student-Friendly Pricing'
  }];

  const studentImages = [studentStudy1, studentStudy2, studentStudy3];

  return <section className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 hero-gradient opacity-95" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRWMjhIMjR2Mmgxem0tMTIgOGgxMnYtMkgyNHYyem0xMi0xNnYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />

      <div className="relative container-custom">
        <div className="min-h-[85vh] flex flex-col justify-center py-16 md:py-24 bg-cyan-700">
          <motion.div className="max-w-4xl mx-auto text-center" variants={staggerContainer} initial="hidden" animate="visible">
            {/* Badge */}
            <motion.div variants={staggerItem} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 mb-6">
              <span className="flex h-2 w-2 rounded-full bg-secondary animate-pulse" />
              <span className="text-sm font-medium text-primary-foreground">
                Trusted by 1000+ Students
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1 variants={staggerItem} className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-primary-foreground leading-tight mb-6">
              Crack Competitive Exams with{' '}
              <span className="relative">
                Smart, Exam-Ready Notes
                <motion.svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none" initial={{
                pathLength: 0,
                opacity: 0
              }} animate={{
                pathLength: 1,
                opacity: 1
              }} transition={{
                delay: 0.8,
                duration: 0.8,
                ease: "easeOut"
              }}>
                  <motion.path d="M2 8C50 4 150 2 298 8" stroke="hsl(160 84% 39%)" strokeWidth="4" strokeLinecap="round" initial={{
                  pathLength: 0
                }} animate={{
                  pathLength: 1
                }} transition={{
                  delay: 0.8,
                  duration: 0.8,
                  ease: "easeOut"
                }} />
                </motion.svg>
              </span>
            </motion.h1>

            {/* Student Images Gallery */}
            <motion.div variants={staggerItem} className="flex justify-center gap-4 mb-8">
              {studentImages.map((img, index) => (
                <motion.div
                  key={index}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden border-2 border-primary-foreground/20 shadow-lg"
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.15, duration: 0.4 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                >
                  <img
                    src={img}
                    alt={`Student studying ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              ))}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div variants={staggerItem} className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link to="/products">
                <Button size="xl" variant="hero-outline" className="w-full sm:w-auto group">
                  <Download className="mr-2 h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
                  Download Notes Now
                </Button>
              </Link>
            </motion.div>

            {/* Trust Points */}
            <motion.div variants={staggerItem} className="flex flex-wrap justify-center gap-6 md:gap-8">
              {trustPoints.map((point, index) => <motion.div key={index} className="flex items-center gap-2 text-primary-foreground/90" initial={{
              opacity: 0,
              y: 10
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: 0.6 + index * 0.1,
              duration: 0.4
            }}>
                  <point.icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{point.text}</span>
                </motion.div>)}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Wave Bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" className="w-full h-auto" preserveAspectRatio="none">
          <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="hsl(210 20% 98%)" />
        </svg>
      </div>
    </section>;
};
export default HeroSection;