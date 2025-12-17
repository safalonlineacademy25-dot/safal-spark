import { motion } from 'framer-motion';
import { BookOpen, Languages, RefreshCw, Zap } from 'lucide-react';

const WhyUsSection = () => {
  const features = [
    {
      icon: BookOpen,
      title: 'Exam-Oriented Content',
      description: 'Every topic is covered keeping competitive exams in mind. Focus on what matters most.',
    },
    {
      icon: Languages,
      title: 'Easy Language & Clear Concepts',
      description: 'Complex topics explained in simple Hindi-English mix that students actually understand.',
    },
    {
      icon: RefreshCw,
      title: 'Updated Mock Question Papers',
      description: 'Practice with the latest exam patterns. Our mock papers are updated after every exam.',
    },
    {
      icon: Zap,
      title: 'Instant Download After Payment',
      description: 'No waiting. Pay securely and get your PDF downloaded within seconds.',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section className="section-padding bg-background">
      <div className="container-custom">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 md:mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Why Choose Us
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Why Safal Online Academy?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Join thousands of successful students who cracked their exams with our study materials.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group p-6 rounded-2xl bg-card border border-border card-hover"
            >
              <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl hero-gradient">
                <feature.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default WhyUsSection;
