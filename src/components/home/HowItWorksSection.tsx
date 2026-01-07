import { motion } from 'framer-motion';
import { MousePointer, CreditCard, Download } from 'lucide-react';
import { fadeInUp, staggerContainer, viewportSettings } from '@/hooks/useScrollAnimation';

const HowItWorksSection = () => {
  const steps = [
    {
      icon: MousePointer,
      step: '01',
      title: 'Choose Your Product',
      description: 'Browse our collection of exam notes and mock papers. Select what suits your preparation needs.',
    },
    {
      icon: CreditCard,
      step: '02',
      title: 'Pay Securely via Razorpay',
      description: 'Complete your purchase using UPI, Credit/Debit Cards, or Wallets. 100% secure payment.',
    },
    {
      icon: Download,
      step: '03',
      title: 'Download Instantly',
      description: 'Get immediate access to your PDF files. Download links also sent via Email & WhatsApp.',
    },
  ];

  const stepVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: i * 0.2,
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1] as const
      }
    })
  };

  return (
    <section id="how-it-works" className="section-padding bg-muted/30">
      <div className="container-custom">
        {/* Header */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportSettings}
          className="text-center mb-12 md:mb-16"
        >
          <motion.span 
            className="inline-block px-4 py-1.5 rounded-full bg-secondary/10 text-secondary text-sm font-medium mb-4"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={viewportSettings}
            transition={{ duration: 0.4 }}
          >
            Simple Process
          </motion.span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get your study materials in 3 simple steps. No complicated processes, just instant access.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line */}
          <motion.div 
            className="hidden lg:block absolute top-24 left-1/2 -translate-x-1/2 w-2/3 h-0.5 bg-gradient-to-r from-primary via-secondary to-primary opacity-20"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={viewportSettings}
            transition={{ duration: 1, delay: 0.5 }}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                custom={index}
                variants={stepVariants}
                initial="hidden"
                whileInView="visible"
                viewport={viewportSettings}
                whileHover={{ y: -5 }}
                className="relative text-center"
              >
                {/* Step Number */}
                <motion.div 
                  className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl hero-gradient mb-6"
                  whileHover={{ scale: 1.05, rotate: 3 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <step.icon className="h-8 w-8 text-primary-foreground" />
                  <motion.span 
                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-card border-2 border-primary flex items-center justify-center text-xs font-bold text-primary"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={viewportSettings}
                    transition={{ delay: 0.4 + index * 0.2, type: "spring", stiffness: 300 }}
                  >
                    {step.step}
                  </motion.span>
                </motion.div>

                <h3 className="text-xl font-bold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground max-w-xs mx-auto">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
