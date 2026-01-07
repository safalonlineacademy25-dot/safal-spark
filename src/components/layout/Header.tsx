import { useState, useRef, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Menu, X, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isHoveringNav, setIsHoveringNav] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const itemCount = useCartStore((state) => state.getItemCount());

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/products', label: 'Products' },
    { href: '/#how-it-works', label: 'How It Works', isAnchor: true },
    { href: '/#faq', label: 'FAQ', isAnchor: true },
  ];

  const handleMouseMove = (e: MouseEvent<HTMLElement>) => {
    if (navRef.current) {
      const rect = navRef.current.getBoundingClientRect();
      setCursorPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleNavClick = (
    e: MouseEvent<HTMLAnchorElement>,
    link: { href: string; isAnchor?: boolean }
  ) => {
    setIsMenuOpen(false);

    if (link.isAnchor) {
      e.preventDefault();
      const targetId = link.href.replace('/#', '');

      const scrollToTarget = () => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
          window.history.replaceState(null, '', `/#${targetId}`);
        }
      };

      if (location.pathname === '/') {
        scrollToTarget();
      } else {
        navigate('/');
        setTimeout(scrollToTarget, 150);
      }
      return;
    }

    if (link.href === '/' && location.pathname === '/') {
      e.preventDefault();
      window.history.replaceState(null, '', '/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isActive = (path: string) => {
    if (path.startsWith('/#')) return false;
    return location.pathname === path;
  };

  // Mobile menu animations
  const mobileMenuVariants = {
    hidden: { 
      opacity: 0, 
      height: 0,
      transition: { 
        height: { duration: 0.3 },
        opacity: { duration: 0.2 }
      }
    },
    visible: { 
      opacity: 1, 
      height: 'auto' as const,
      transition: { 
        height: { duration: 0.3, ease: 'easeOut' as const },
        opacity: { duration: 0.2, delay: 0.1 }
      }
    }
  };

  const mobileItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.08,
        duration: 0.3,
        ease: 'easeOut' as const
      }
    }),
    exit: (i: number) => ({
      opacity: 0,
      x: -10,
      transition: {
        delay: i * 0.03,
        duration: 0.15
      }
    })
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container-custom">
        <div className="flex h-20 items-center justify-between">
          {/* Logo with hover effect */}
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div 
              className="flex h-12 w-12 items-center justify-center rounded-xl hero-gradient"
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <BookOpen className="h-7 w-7 text-primary-foreground" />
            </motion.div>
            <span className="text-2xl font-bold text-foreground">
              Safal<span className="text-gradient">Academy</span>
            </span>
          </Link>

          {/* Desktop Navigation with cursor glow */}
          <nav 
            ref={navRef}
            className="hidden md:flex items-center gap-1 relative px-2 py-1 rounded-full"
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHoveringNav(true)}
            onMouseLeave={() => setIsHoveringNav(false)}
          >
            {/* Glowing cursor follower */}
            <AnimatePresence>
              {isHoveringNav && (
                <motion.div
                  className="absolute pointer-events-none rounded-full bg-primary/20 blur-xl"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ 
                    opacity: 0.6, 
                    scale: 1,
                    x: cursorPos.x - 40,
                    y: cursorPos.y - 20,
                  }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ 
                    opacity: { duration: 0.2 },
                    scale: { duration: 0.2 },
                    x: { duration: 0.1, ease: 'linear' },
                    y: { duration: 0.1, ease: 'linear' }
                  }}
                  style={{ width: 80, height: 40 }}
                />
              )}
            </AnimatePresence>

            {navLinks.map((link) => (
              <motion.div
                key={link.href}
                className="relative"
                whileHover="hover"
                initial="rest"
                animate="rest"
              >
                <Link
                  to={link.href}
                  onClick={(e) => handleNavClick(e, link)}
                  className="relative z-10 block px-5 py-2.5 text-base font-medium transition-colors"
                >
                  <motion.span
                    className={`relative z-10 ${
                      isActive(link.href) ? 'text-primary' : 'text-muted-foreground'
                    }`}
                    variants={{
                      rest: { y: 0 },
                      hover: { y: -2 }
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  >
                    {link.label}
                  </motion.span>
                </Link>
                
                {/* Background reveal on hover */}
                <motion.div
                  className="absolute inset-0 rounded-lg bg-primary/10"
                  variants={{
                    rest: { opacity: 0, scale: 0.9 },
                    hover: { opacity: 1, scale: 1 }
                  }}
                  transition={{ duration: 0.2 }}
                />
                
                {/* Active indicator line */}
                {isActive(link.href) && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.div>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link to="/cart" className="relative">
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className="relative"
              >
                <Button variant="ghost" size="icon" className="relative group">
                  <ShoppingCart className="h-5 w-5 transition-transform group-hover:scale-110" />
                  <motion.div
                    className="absolute inset-0 bg-primary/10 rounded-md"
                    initial={{ scale: 0, opacity: 0 }}
                    whileHover={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                </Button>
                {itemCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground shadow-md border-2 border-background"
                  >
                    {itemCount}
                  </motion.span>
                )}
              </motion.div>
            </Link>

            <Link to="/admin" className="hidden md:block">
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <Button variant="outline" size="sm" className="relative overflow-hidden group">
                  <span className="relative z-10">Admin</span>
                  <motion.div
                    className="absolute inset-0 bg-primary/5"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </Button>
              </motion.div>
            </Link>

            {/* Mobile Menu Button */}
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden relative overflow-hidden"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <AnimatePresence mode="wait">
                  {isMenuOpen ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <X className="h-5 w-5" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Menu className="h-5 w-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Mobile Menu with enhanced animations */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            variants={mobileMenuVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="md:hidden border-t border-border bg-background overflow-hidden"
          >
            <nav className="container-custom py-4 flex flex-col gap-1">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.href}
                  custom={index}
                  variants={mobileItemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <Link
                    to={link.href}
                    onClick={(e) => handleNavClick(e, link)}
                    className="relative block"
                  >
                    <motion.div
                      className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors relative overflow-hidden ${
                        isActive(link.href)
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground'
                      }`}
                      whileHover={{ 
                        x: 8,
                        backgroundColor: 'hsl(var(--muted))',
                        transition: { duration: 0.2 }
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="relative z-10">{link.label}</span>
                      {isActive(link.href) && (
                        <motion.div
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"
                          layoutId="mobileActiveIndicator"
                        />
                      )}
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
              <motion.div
                custom={navLinks.length}
                variants={mobileItemVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <Link
                  to="/admin"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <motion.div
                    className="px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground"
                    whileHover={{ 
                      x: 8,
                      backgroundColor: 'hsl(var(--muted))',
                      transition: { duration: 0.2 }
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Admin Panel
                  </motion.div>
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
