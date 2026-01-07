import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fadeInUp, scaleIn, staggerContainer, staggerItem, viewportSettings } from '@/hooks/useScrollAnimation';

const CTASection = () => {
  const stats = [
    { value: '10K+', label: 'Students' },
    { value: '7.9K+', label: 'Downloads' },
    { value: '4.8★', label: 'Rating' },
  ];

  return (
    <section className="section-padding">
      <div className="container-custom">
        <motion.div
          variants={scaleIn}
          initial="hidden"
          whileInView="visible"
          viewport={viewportSettings}
          className="relative overflow-hidden rounded-3xl hero-gradient p-8 md:p-12 lg:p-16"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRWMjhIMjR2Mmgxem0tMTIgOGgxMnYtMkgyNHYyem0xMi0xNnYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />

          <motion.div 
            className="relative text-center max-w-3xl mx-auto"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportSettings}
          >
            <motion.div 
              variants={staggerItem}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 mb-6"
            >
              <Sparkles className="h-4 w-4 text-primary-foreground" />
              <span className="text-sm font-medium text-primary-foreground">
                Limited Time Offer
              </span>
            </motion.div>

            <motion.h2 
              variants={staggerItem}
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6"
            >
              Start Your Success Journey Today
            </motion.h2>

            <motion.p 
              variants={staggerItem}
              className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto"
            >
              Don't let another day pass by. Get instant access to exam-ready notes and mock papers that thousands of successful students trust.
            </motion.p>

            <motion.div 
              variants={staggerItem}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link to="/products">
                <Button size="xl" variant="hero-outline" className="w-full sm:w-auto group">
                  Get Started Now
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/products?category=combo">
                <Button
                  size="xl"
                  variant="hero-outline"
                  className="w-full sm:w-auto"
                >
                  View Combo Pack
                </Button>
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div 
              variants={staggerItem}
              className="mt-12 grid grid-cols-3 gap-6 max-w-lg mx-auto"
            >
              {stats.map((stat, index) => (
                <motion.div 
                  key={index} 
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={viewportSettings}
                  transition={{ delay: 0.5 + index * 0.1, duration: 0.4 }}
                >
                  <div className="text-2xl md:text-3xl font-bold text-primary-foreground">
                    {stat.value}
                  </div>
                  <div className="text-sm text-primary-foreground/70">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
