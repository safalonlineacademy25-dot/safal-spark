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
    { src: studentStudy1, label: 'UPSC Aspirant' },
    { src: studentStudy2, label: 'Banking Prep' },
    { src: studentStudy3, label: 'SSC Candidate' },
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
        <div className="py-8 md:py-12 lg:py-14">
          <motion.div 
            className="max-w-6xl mx-auto w-full"
            variants={staggerContainer} 
            initial="hidden" 
            animate="visible"
          >
            {/* Corporate Stacked Layout */}
            <div className="flex flex-col items-center text-center">
              
              {/* Trust Badge - Top */}
              <motion.div 
                variants={staggerItem} 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6"
              >
                <Award className="h-4 w-4 text-secondary" />
                <span className="text-sm font-semibold text-primary-foreground tracking-wide">
                  Trusted by 1,000+ Students Across India
                </span>
              </motion.div>

              {/* Main Headline - Prominent */}
              <motion.h1 
                variants={staggerItem} 
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-primary-foreground leading-[1.1] mb-8 tracking-tight"
              >
                <span className="block">Crack Competitive Exams</span>
                <span className="block mt-2 bg-gradient-to-r from-secondary via-emerald-300 to-secondary bg-clip-text text-transparent">
                  with Smart, Exam-Ready Notes
                </span>
              </motion.h1>

              {/* Student Images Row - Centered & Prominent */}
              <motion.div 
                variants={staggerItem}
                className="flex items-center justify-center gap-4 md:gap-6 lg:gap-8 mb-8"
              >
                {studentImages.map((student, index) => (
                  <motion.div
                    key={index}
                    className="relative group"
                    initial={{ opacity: 0, y: 30, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.5 + index * 0.15, duration: 0.6, ease: "easeOut" }}
                  >
                    {/* Image Container with Premium Border */}
                    <div className="relative">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-2xl overflow-hidden ring-4 ring-white/30 shadow-2xl shadow-black/20 group-hover:ring-secondary/50 transition-all duration-300">
                        <img
                          src={student.src}
                          alt={student.label}
                          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                        />
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                      </div>
                      
                      {/* Floating Label */}
                      <motion.div 
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-white rounded-full shadow-lg whitespace-nowrap"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 + index * 0.1 }}
                      >
                        <span className="text-xs font-bold text-primary">{student.label}</span>
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Trust Points Row */}
              <motion.div 
                variants={staggerItem} 
                className="flex flex-wrap items-center justify-center gap-4 md:gap-6 lg:gap-8"
              >
                {trustPoints.map((point, index) => (
                  <motion.div 
                    key={index} 
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 + index * 0.1, duration: 0.4 }}
                  >
                    <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
                      <point.icon className="h-4 w-4 text-secondary" />
                    </div>
                    <span className="text-sm font-medium text-primary-foreground">{point.text}</span>
                  </motion.div>
                ))}
              </motion.div>

            </div>
          </motion.div>
        </div>
      </div>

      {/* Elegant Wave Separator */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" className="w-full h-auto" preserveAspectRatio="none">
          <path 
            d="M0 80L48 74.7C96 69 192 59 288 53.3C384 48 480 48 576 50.7C672 53 768 59 864 58.7C960 59 1056 53 1152 50.7C1248 48 1344 48 1392 48L1440 48V80H1392C1344 80 1248 80 1152 80C1056 80 960 80 864 80C768 80 672 80 576 80C480 80 384 80 288 80C192 80 96 80 48 80H0Z" 
            fill="hsl(210 20% 98%)" 
          />
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
