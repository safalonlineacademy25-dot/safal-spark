import { motion } from 'framer-motion';
import { GraduationCap, Target, BookMarked, Clock } from 'lucide-react';

const AudienceSection = () => {
  const audiences = [
    {
      icon: GraduationCap,
      title: 'College Students',
      description: 'Undergraduate and postgraduate students preparing alongside their studies.',
    },
    {
      icon: Target,
      title: 'Competitive Exam Aspirants',
      description: 'Dedicated aspirants aiming for SSC, Banking, Railways, and State PSC exams.',
    },
    {
      icon: BookMarked,
      title: 'Self-Study Learners',
      description: 'Independent learners who prefer organized, easy-to-follow study materials.',
    },
    {
      icon: Clock,
      title: 'Students with Limited Time',
      description: 'Working professionals and busy students who need focused, exam-ready content.',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
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
            Who Is This For
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Perfect For Your Journey
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Our study materials are designed keeping different learner profiles in mind.
          </p>
        </motion.div>

        {/* Audience Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {audiences.map((audience, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="text-center p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
                <audience.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {audience.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {audience.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default AudienceSection;
