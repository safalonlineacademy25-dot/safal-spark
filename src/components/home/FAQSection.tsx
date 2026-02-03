import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { fadeInUp, staggerContainer, staggerItem, viewportSettings } from '@/hooks/useScrollAnimation';

const FAQSection = () => {
  const faqs = [
    {
      question: 'How will I receive my study materials after payment?',
      answer: 'After successful payment via Razorpay, download links are sent directly to your email. You\'ll also receive a WhatsApp notification confirming that your order has been delivered.',
    },
    {
      question: 'Are the notes updated for the latest exam patterns?',
      answer: 'Yes! Our team regularly updates all study materials based on the latest exam patterns and syllabus changes. You get access to the most current content.',
    },
    {
      question: 'Which competitive exams are covered?',
      answer: 'Our notes and mock papers cover major competitive exams including SSC CGL, SSC CHSL, Banking (IBPS, SBI), Railways (RRB), and various State PSC examinations.',
    },
    {
      question: 'Can I download the files multiple times?',
      answer: 'Yes, you can download your purchased files unlimited times. Your download links remain active in your email, and you can access them anytime.',
    },
    {
      question: 'What payment methods are accepted?',
      answer: 'We accept all major payment methods through Razorpay including UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, Net Banking, and Wallets.',
    },
    {
      question: 'Is there a refund policy?',
      answer: 'Due to the digital nature of our products, we do not offer refunds once the download link is generated. However, if you face any technical issues, please contact our support team.',
    },
    {
      question: 'Do I need to create an account to purchase?',
      answer: 'No account creation is required. Simply add products to cart, enter your email and phone number at checkout, complete payment, and receive your downloads via email.',
    },
    {
      question: 'In which language are the notes available?',
      answer: 'Our notes are primarily in English with key terms and explanations in Hindi where helpful. This Hinglish approach makes complex topics easier to understand.',
    },
  ];

  return (
    <section id="faq" className="section-padding bg-background">
      <div className="container-custom">
        {/* Header */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportSettings}
          className="text-center mb-12"
        >
          <motion.span 
            className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={viewportSettings}
            transition={{ duration: 0.4 }}
          >
            FAQ
          </motion.span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Got questions? We've got answers. If you don't find what you're looking for, feel free to contact us.
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportSettings}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                variants={staggerItem}
                custom={index}
              >
                <AccordionItem value={`item-${index}`} className="border-border">
                  <AccordionTrigger className="text-left text-foreground hover:text-primary hover:no-underline py-5">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
