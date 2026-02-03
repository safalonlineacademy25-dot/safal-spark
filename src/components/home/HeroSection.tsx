import { motion } from 'framer-motion';
import { Shield, IndianRupee, Download, Award, Users, BookOpen } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/hooks/useScrollAnimation';
import studentStudy1 from '@/assets/student-study-1.jpg';
import studentStudy2 from '@/assets/student-study-2.jpg';
import studentStudy3 from '@/assets/student-study-3.jpg';

const HeroSection = () => {
  const trustPoints = [
    { icon: Download, text: 'Instant PDF Access' },
    { icon: Shield, text: 'Secure Payments' },
    { icon: IndianRupee, text: 'Student-Friendly Pricing' },
  ];

  const studentImages = [
    { src: studentStudy1, label: 'UPSC' },
    { src: studentStudy2, label: 'Banking' },
    { src: studentStudy3, label: 'SSC' },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/90">
      {/* Premium Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>
      
      {/* Gradient Overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-primary/50" />

      <div className="relative container-custom">
        <div className="py-4 md:py-6">
          <motion.div 
            className="max-w-6xl mx-auto w-full"
            variants={staggerContainer} 
            initial="hidden" 
            animate="visible"
          >
            {/* Compact Corporate Layout */}
            <div className="flex flex-col items-center text-center">
              
              {/* Trust Badge - Top */}
              <motion.div 
                variants={staggerItem} 
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-3"
              >
                <Award className="h-3 w-3 text-secondary" />
                <span className="text-xs font-semibold text-primary-foreground tracking-wide">
                  Trusted by 1,000+ Students Across India
                </span>
              </motion.div>

              {/* Main Headline - Prominent */}
              <motion.h1 
                variants={staggerItem} 
                className="text-2xl sm:text-3xl md:text-4xl font-black text-primary-foreground leading-[1.1] mb-4 tracking-tight"
              >
                <span className="block">Crack Competitive Exams</span>
                <span className="block mt-1 bg-gradient-to-r from-secondary via-emerald-300 to-secondary bg-clip-text text-transparent">
                  with Smart, Exam-Ready Notes
                </span>
              </motion.h1>

              {/* Student Images Row - Compact */}
              <motion.div 
                variants={staggerItem}
                className="flex items-center justify-center gap-6 md:gap-10 lg:gap-14 mb-4"
              >
                {studentImages.map((student, index) => (
                  <motion.div
                    key={index}
                    className="relative group"
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.1, duration: 0.4, ease: "easeOut" }}
                  >
                    {/* Image Container */}
                    <div className="relative">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl overflow-hidden ring-2 ring-white/30 shadow-lg group-hover:ring-secondary/50 transition-all duration-300">
                        <img
                          src={student.src}
                          alt={student.label}
                          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                      </div>
                      
                      {/* Floating Label */}
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-white rounded-full shadow-md whitespace-nowrap">
                        <span className="text-[10px] font-bold text-primary">{student.label}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Trust Points Row - Compact */}
              <motion.div 
                variants={staggerItem} 
                className="flex flex-wrap items-center justify-center gap-2 md:gap-4"
              >
                {trustPoints.map((point, index) => (
                  <motion.div 
                    key={index} 
                    className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-full border border-white/10"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
                  >
                    <div className="w-5 h-5 rounded-full bg-secondary/20 flex items-center justify-center">
                      <point.icon className="h-3 w-3 text-secondary" />
                    </div>
                    <span className="text-xs font-medium text-primary-foreground">{point.text}</span>
                  </motion.div>
                ))}
              </motion.div>

            </div>
          </motion.div>
        </div>
      </div>

      {/* Slim Wave Separator */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 40" fill="none" className="w-full h-auto" preserveAspectRatio="none">
          <path 
            d="M0 40L48 37.3C96 35 192 29 288 26.7C384 24 480 24 576 25.3C672 27 768 29 864 29.3C960 29 1056 27 1152 25.3C1248 24 1344 24 1392 24L1440 24V40H1392C1344 40 1248 40 1152 40C1056 40 960 40 864 40C768 40 672 40 576 40C480 40 384 40 288 40C192 40 96 40 48 40H0Z" 
            fill="hsl(210 20% 98%)" 
          />
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
