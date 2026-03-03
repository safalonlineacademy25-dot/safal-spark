import { motion, AnimatePresence } from 'framer-motion';
import { Shield, IndianRupee, Download, Award, Sparkles, BookOpen, Headphones, FileText } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/hooks/useScrollAnimation';
import { useState, useEffect } from 'react';
import studentStudy1 from '@/assets/student-study-1.jpg';
import studentStudy2 from '@/assets/student-study-2.jpg';
import studentStudy3 from '@/assets/student-study-3.jpg';

const ROTATING_WORDS = ['MPSC', 'Banking', 'SSC', 'Talathi Bharti', 'Police Bharti', 'Court Assistant'];
const EXAM_ICONS = [BookOpen, FileText, Headphones, Sparkles, Award];

const HeroSection = () => {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const trustPoints = [
    { icon: Download, text: 'Instant PDF Access' },
    { icon: Shield, text: 'Secure Payments' },
    { icon: IndianRupee, text: 'Student-Friendly Pricing' },
  ];

  const studentImages = [
    { src: studentStudy1, label: 'MPSC' },
    { src: studentStudy2, label: 'Banking' },
    { src: studentStudy3, label: 'SSC' },
  ];

  const stats = [
    { value: '1,000+', label: 'Students' },
    { value: '50+', label: 'Study Notes' },
    { value: '4.8★', label: 'Rating' },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/90">
      
      {/* Animated Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-20 -right-20 w-72 h-72 md:w-96 md:h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(160 84% 39% / 0.15) 0%, transparent 70%)' }}
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -20, 15, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-32 -left-20 w-80 h-80 md:w-[28rem] md:h-[28rem] rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(221 83% 70% / 0.12) 0%, transparent 70%)' }}
          animate={{
            x: [0, -25, 20, 0],
            y: [0, 25, -15, 0],
            scale: [1, 0.95, 1.1, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(160 84% 50% / 0.08) 0%, transparent 70%)' }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-white/20"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [-20, 20, -20],
              x: [-10, 10, -10],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 4 + i * 0.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.4,
            }}
          />
        ))}
      </div>

      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0z' fill='none'/%3E%3Cpath d='M0 20h40M20 0v40' stroke='%23fff' stroke-width='0.5'/%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative container-custom">
        <div className="py-2 md:py-3">
          <motion.div 
            className="max-w-6xl mx-auto w-full"
            variants={staggerContainer} 
            initial="hidden" 
            animate="visible"
          >
            <div className="flex flex-col items-center text-center">
              
              {/* Animated Trust Badge */}
              <motion.div 
                variants={staggerItem} 
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-1"
                whileHover={{ scale: 1.05, borderColor: 'rgba(255,255,255,0.4)' }}
              >
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Sparkles className="h-3.5 w-3.5 text-secondary" />
                </motion.div>
                <span className="text-xs font-semibold text-primary-foreground tracking-wide">
                  Trusted by 1,000+ Students Across India
                </span>
              </motion.div>

              {/* Main Headline with Rotating Word */}
              <motion.h1 
                variants={staggerItem} 
                className="text-xl sm:text-2xl md:text-4xl font-black text-primary-foreground leading-[1.1] mb-1 tracking-tight"
              >
                <span className="block">Crack Your</span>
                <span className="block h-[1.4em] mt-1 relative overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={wordIndex}
                      className="inline-block px-3 py-0.5 rounded-lg text-2xl sm:text-3xl md:text-5xl font-black tracking-wider uppercase"
                      style={{
                        background: 'linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 55%), hsl(120 70% 55%))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0 0 40px hsl(160 84% 39% / 0.3)',
                        filter: 'drop-shadow(0 2px 8px hsl(160 84% 39% / 0.25))',
                      }}
                      initial={{ y: 50, opacity: 0, scale: 0.8, rotateX: -60 }}
                      animate={{ y: 0, opacity: 1, scale: 1, rotateX: 0 }}
                      exit={{ y: -50, opacity: 0, scale: 0.8, rotateX: 60 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {ROTATING_WORDS[wordIndex]}
                    </motion.span>
                  </AnimatePresence>
                </span>
                <span className="block text-base sm:text-lg md:text-xl font-bold text-white/80 mt-0.5">
                  Exam with Smart Notes
                </span>
              </motion.h1>

              {/* Student Images with Orbit Effect */}
              <motion.div 
                variants={staggerItem}
                className="flex items-center justify-center gap-6 md:gap-10 lg:gap-14 my-2"
              >
                {studentImages.map((student, index) => {
                  // Subtle, staggered float for a refined corporate feel
                  const floatY = index === 1 ? [-4, 4, -4] : [4, -4, 4];
                  const floatDuration = 5 + index * 0.8;
                  const floatDelay = index * 0.6;

                  return (
                    <motion.div
                      key={index}
                      className="relative"
                      initial={{ opacity: 0, y: 30, scale: 0.85 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0, 
                        scale: 1,
                      }}
                      whileHover={{ 
                        scale: 1.2, 
                        y: -10,
                        transition: { type: "spring", stiffness: 400, damping: 15 }
                      }}
                      whileTap={{ scale: 1.1 }}
                      transition={{ delay: 0.3 + index * 0.15, duration: 0.5, ease: "easeOut" }}
                    >
                      <motion.div 
                        className="relative group"
                        animate={{ y: floatY }}
                        transition={{ 
                          duration: floatDuration, 
                          repeat: Infinity, 
                          ease: 'easeInOut',
                          delay: floatDelay,
                        }}
                      >
                        {/* Subtle pulse ring */}
                        <motion.div
                          className="absolute -inset-1.5 rounded-xl"
                          style={{ 
                            background: 'linear-gradient(135deg, hsl(160 84% 39% / 0.25), hsl(221 83% 53% / 0.25))',
                            filter: 'blur(4px)',
                          }}
                          animate={{ 
                            opacity: [0.3, 0.6, 0.3],
                            scale: [1, 1.05, 1],
                          }}
                          transition={{ 
                            duration: 3, 
                            repeat: Infinity, 
                            ease: 'easeInOut',
                            delay: index * 0.4,
                          }}
                        />
                        <div className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl overflow-hidden ring-2 ring-white/30 shadow-lg hover:ring-secondary hover:shadow-2xl hover:shadow-secondary/30 transition-all duration-300">
                          <img
                            src={student.src}
                            alt={student.label}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                        </div>
                        
                        {/* Floating Label */}
                        <motion.div 
                          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-white rounded-full shadow-md whitespace-nowrap"
                          whileHover={{ scale: 1.1 }}
                        >
                          <span className="text-[10px] font-bold text-primary">{student.label}</span>
                        </motion.div>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Animated Stats Counter */}
              <motion.div
                variants={staggerItem}
                className="flex items-center justify-center gap-6 md:gap-10 mb-2"
              >
                {stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    className="text-center"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + index * 0.15, type: 'spring', stiffness: 200 }}
                  >
                    <motion.div 
                      className="text-base sm:text-lg md:text-xl font-black text-secondary"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 3, repeat: Infinity, delay: index * 0.5 }}
                    >
                      {stat.value}
                    </motion.div>
                    <div className="text-[10px] md:text-xs text-white/60 font-medium">{stat.label}</div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Trust Points Row */}
              <motion.div 
                variants={staggerItem} 
                className="flex flex-wrap items-center justify-center gap-2 md:gap-4"
              >
                {trustPoints.map((point, index) => (
                  <motion.div 
                    key={index} 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 backdrop-blur-sm"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + index * 0.1, duration: 0.3 }}
                    whileHover={{ 
                      backgroundColor: 'rgba(255,255,255,0.12)', 
                      borderColor: 'rgba(255,255,255,0.25)',
                      scale: 1.05,
                    }}
                  >
                    <motion.div 
                      className="w-5 h-5 rounded-full bg-secondary/20 flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      <point.icon className="h-3 w-3 text-secondary" />
                    </motion.div>
                    <span className="text-xs font-medium text-primary-foreground">{point.text}</span>
                  </motion.div>
                ))}
              </motion.div>

            </div>
          </motion.div>
        </div>
      </div>

      {/* Animated Wave Separator */}
      <div className="absolute bottom-0 left-0 right-0">
        <motion.svg 
          viewBox="0 0 1440 50" 
          fill="none" 
          className="w-full h-auto" 
          preserveAspectRatio="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <motion.path 
            d="M0 50L48 46C96 42 192 34 288 30C384 26 480 26 576 28C672 30 768 34 864 35C960 36 1056 34 1152 30C1248 26 1344 26 1392 26L1440 26V50H1392C1344 50 1248 50 1152 50C1056 50 960 50 864 50C768 50 672 50 576 50C480 50 384 50 288 50C192 50 96 50 48 50H0Z" 
            fill="hsl(210 20% 98%)"
            animate={{
              d: [
                "M0 50L48 46C96 42 192 34 288 30C384 26 480 26 576 28C672 30 768 34 864 35C960 36 1056 34 1152 30C1248 26 1344 26 1392 26L1440 26V50H1392C1344 50 1248 50 1152 50C1056 50 960 50 864 50C768 50 672 50 576 50C480 50 384 50 288 50C192 50 96 50 48 50H0Z",
                "M0 50L48 44C96 38 192 30 288 28C384 26 480 30 576 32C672 34 768 30 864 28C960 26 1056 30 1152 34C1248 38 1344 34 1392 32L1440 30V50H1392C1344 50 1248 50 1152 50C1056 50 960 50 864 50C768 50 672 50 576 50C480 50 384 50 288 50C192 50 96 50 48 50H0Z",
                "M0 50L48 46C96 42 192 34 288 30C384 26 480 26 576 28C672 30 768 34 864 35C960 36 1056 34 1152 30C1248 26 1344 26 1392 26L1440 26V50H1392C1344 50 1248 50 1152 50C1056 50 960 50 864 50C768 50 672 50 576 50C480 50 384 50 288 50C192 50 96 50 48 50H0Z",
              ],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.svg>
      </div>
    </section>
  );
};

export default HeroSection;
