import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { BookOpen, Target, Users, Award, Heart, Lightbulb, MapPin, Mail, Phone, Globe } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const AboutUs = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const values = [
    {
      icon: Award,
      title: 'Quality First',
      description: 'Every study material is carefully crafted by subject experts to ensure accuracy and relevance.',
    },
    {
      icon: Heart,
      title: 'Student-Centric',
      description: 'We understand the challenges students face and design our content to make learning easier.',
    },
    {
      icon: Lightbulb,
      title: 'Affordable Education',
      description: 'Premium study materials at prices that every student can afford.',
    },
  ];

  return (
    <>
      <Helmet>
        <title>About Us - Safal Online Academy</title>
        <meta name="description" content="Learn about Safal Online Academy's mission to help Indian students succeed in competitive exams and university examinations with quality study materials." />
      </Helmet>
      
      <Header />
      
      <main className="min-h-screen bg-background pt-24 pb-16">
        {/* Hero Section */}
        <section className="container-custom py-12 md:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-6">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              About Safal Online Academy
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Empowering students across India with quality study materials and resources 
              to achieve their academic and career goals.
            </p>
          </motion.div>
        </section>

        {/* Business Information */}
        <section className="container-custom py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="max-w-3xl mx-auto"
          >
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-semibold text-foreground mb-4 text-center">Business Information</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Registered Address</p>
                    <p className="text-sm text-muted-foreground">Mumbai, India</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Email</p>
                    <p className="text-sm text-muted-foreground">safalonlineacademy@gmail.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Phone</p>
                    <p className="text-sm text-muted-foreground">+91 7620045446</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Globe className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Website</p>
                    <p className="text-sm text-muted-foreground">https://safalonline.in</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Mission & Vision */}
        <section className="container-custom py-12">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-card border border-border rounded-2xl p-8"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Our Mission</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                To democratize access to quality education by providing comprehensive, 
                well-structured study materials that help students excel in competitive 
                exams and university examinations. We believe every student deserves 
                access to the best resources, regardless of their location or background.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-card border border-border rounded-2xl p-8"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <Lightbulb className="h-5 w-5 text-secondary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Our Vision</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                To become India's most trusted platform for digital study materials, 
                helping millions of students achieve success in their academic journey. 
                We envision a future where quality education is just a click away for 
                every aspiring student.
              </p>
            </motion.div>
          </div>
        </section>

        {/* What We Offer */}
        <section className="container-custom py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-8">
              What We Offer
            </h2>
            <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  'Competitive Exam Notes (UPSC, SSC, Banking)',
                  'Pune University Study Materials',
                  'Engineering Notes (All Branches)',
                  'IIT/JEE Preparation Resources',
                  'Mock Papers & Practice Tests',
                  'Instant Digital Delivery',
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground leading-relaxed pt-4 border-t border-border">
                All our materials are available in PDF format for instant download. 
                Once purchased, you'll receive your download links via Email and WhatsApp 
                within minutes, so you can start studying right away.
              </p>
            </div>
          </motion.div>
        </section>

        {/* Our Values */}
        <section className="container-custom py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-8">
              Our Values
            </h2>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {values.map((value, index) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                  className="bg-card border border-border rounded-2xl p-6 text-center"
                >
                  <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 mb-4">
                    <value.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Team Section */}
        <section className="container-custom py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Our Team
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Safal Online Academy is powered by a dedicated team of educators, subject matter experts, 
              and technology enthusiasts who share a common passion for making quality education 
              accessible to all. Our content creators include experienced teachers, university 
              toppers, and exam crackers who understand exactly what students need to succeed.
            </p>
            <div className="bg-muted/30 rounded-2xl p-6 border border-border">
              <p className="text-foreground font-medium mb-2">
                Want to join our team of content creators?
              </p>
              <p className="text-sm text-muted-foreground">
                We're always looking for passionate educators to help us create quality study materials.
                Reach out to us at <span className="text-primary font-medium">safalonlineacademy@gmail.com</span>
              </p>
            </div>
          </motion.div>
        </section>

        {/* Contact Us Section */}
        <section className="container-custom py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-8">
              Contact Us
            </h2>
            <div className="bg-card border border-border rounded-2xl p-8">
              <p className="text-muted-foreground text-center mb-6">
                Have questions or need assistance? We're here to help!
              </p>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email Us</p>
                      <p className="font-medium text-foreground">safalonlineacademy@gmail.com</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Call Us</p>
                        <p className="font-medium text-foreground">+91 7620045446</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium text-foreground">Mumbai, India</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Website</p>
                      <p className="font-medium text-foreground">https://safalonline.in</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-border text-center">
                <p className="text-sm text-muted-foreground">
                  <strong>Support Hours:</strong> Monday to Saturday, 10:00 AM - 6:00 PM IST
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  We typically respond to all queries within 24-48 hours.
                </p>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
      
      <Footer />
    </>
  );
};

export default AboutUs;
