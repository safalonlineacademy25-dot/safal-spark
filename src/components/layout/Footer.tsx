import { Link } from 'react-router-dom';
import { BookOpen, Mail, Phone, MapPin } from 'lucide-react';
const Footer = () => {
  const currentYear = new Date().getFullYear();
  return <footer className="bg-foreground text-background">
      <div className="container-custom section-padding">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <BookOpen className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">
                Safal<span className="text-primary">Academy</span>
              </span>
            </Link>
            <p className="text-background/70 text-sm leading-relaxed">
              Your trusted partner for competitive exam preparation. Quality notes and mock papers designed for success.
            </p>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              {[{
              label: 'Privacy Policy',
              href: '/privacy'
            }, {
              label: 'Terms of Service',
              href: '/terms'
            }, {
              label: 'Refund Policy',
              href: '/refund'
            }, {
              label: 'Disclaimer',
              href: '/disclaimer'
            }].map(link => <li key={link.href}>
                  <Link to={link.href} className="text-background/70 hover:text-primary transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>)}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-background/70">
                <Mail className="h-4 w-4 text-primary" />
                support@safalonlinesolutions.com
              </li>
              
              
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-background/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-background/60 text-sm">
              © {currentYear} Safal Online Academy. All rights reserved.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-background/60 text-sm">Secure payments by</span>
              <span className="font-semibold text-primary">Razorpay</span>
            </div>
          </div>
        </div>
      </div>
    </footer>;
};
export default Footer;