import { motion } from 'framer-motion';
import { MousePointer, CreditCard, Download } from 'lucide-react';

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

  return (
    <section id="how-it-works" className="section-padding bg-muted/30">
      <div className="container-custom">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 md:mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary/10 text-secondary text-sm font-medium mb-4">
            Simple Process
          </span>
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
          <div className="hidden lg:block absolute top-24 left-1/2 -translate-x-1/2 w-2/3 h-0.5 bg-gradient-to-r from-primary via-secondary to-primary opacity-20" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="relative text-center"
              >
                {/* Step Number */}
                <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl hero-gradient mb-6">
                  <step.icon className="h-8 w-8 text-primary-foreground" />
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-card border-2 border-primary flex items-center justify-center text-xs font-bold text-primary">
                    {step.step}
                  </span>
                </div>

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
