import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { BookOpen, Truck, Loader2, ShieldCheck, Package, Sparkles, FileText, Headphones, Award, IndianRupee } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

interface Book {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  badge: string | null;
  category: string;
  features: string[] | null;
  weight_grams: number | null;
}

const checkoutSchema = z.object({
  customer_name: z.string().trim().min(2, 'Name is required').max(100),
  customer_email: z.string().trim().email('Valid email required').max(255),
  customer_phone: z.string().trim().regex(/^(\+91|91)?[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  address_line1: z.string().trim().min(3, 'Address is required').max(200),
  address_line2: z.string().trim().max(200).optional().or(z.literal('')),
  city: z.string().trim().min(2, 'City is required').max(80),
  state: z.string().trim().min(2, 'State is required').max(80),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  landmark: z.string().trim().max(200).optional().or(z.literal('')),
});

const Books = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Book | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    customer_name: '', customer_email: '', customer_phone: '',
    address_line1: '', address_line2: '', city: '', state: '', pincode: '', landmark: '',
    whatsapp_optin: true,
  });

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('hard_copy_products' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Failed to fetch books:', error);
        toast.error('Could not load books');
      } else {
        setBooks((data as unknown as Book[]) || []);
      }
      setLoading(false);
    })();
  }, []);

  // Pre-select via ?book=ID
  useEffect(() => {
    const bookId = params.get('book');
    if (bookId && books.length) {
      const b = books.find(x => x.id === bookId);
      if (b) setSelected(b);
    }
  }, [params, books]);

  const handleBuy = (book: Book) => {
    setSelected(book);
    setTimeout(() => {
      document.getElementById('checkout-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) {
      toast.error('Please select a book');
      return;
    }
    const parsed = checkoutSchema.safeParse(form);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      toast.error(first.message);
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-hardcopy-order', {
        body: {
          product_id: selected.id,
          ...parsed.data,
          whatsapp_optin: form.whatsapp_optin,
          callback_origin: window.location.origin,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Could not start payment');

      // Save context for success page lookup
      sessionStorage.setItem('hardcopy_last_order', JSON.stringify({
        order_number: data.order_number,
        product_name: selected.name,
        amount: selected.price,
      }));

      // Redirect to Razorpay payment link
      window.location.href = data.payment_url;
    } catch (e: any) {
      console.error(e);
      toast.error('Payment could not be started', { description: e?.message });
      setSubmitting(false);
    }
  };

  const totalAmount = selected?.price || 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Books & Hard Copy Notes | Safal Online Academy</title>
        <meta name="description" content="Order printed books and hard copy study notes delivered to your home address by courier across India." />
        <link rel="canonical" href="https://safalonlinesolutions.com/books" />
      </Helmet>

      <Header hideCartButton />

      {/* Corporate Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/90">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-20 -right-20 w-72 h-72 md:w-96 md:h-96 rounded-full"
            style={{ background: 'radial-gradient(circle, hsl(160 84% 39% / 0.18) 0%, transparent 70%)' }}
            animate={{ x: [0, 30, -20, 0], y: [0, -20, 15, 0], scale: [1, 1.1, 0.95, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-32 -left-20 w-80 h-80 md:w-[28rem] md:h-[28rem] rounded-full"
            style={{ background: 'radial-gradient(circle, hsl(221 83% 70% / 0.14) 0%, transparent 70%)' }}
            animate={{ x: [0, -25, 20, 0], y: [0, 25, -15, 0], scale: [1, 0.95, 1.1, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0z' fill='none'/%3E%3Cpath d='M0 20h40M20 0v40' stroke='%23fff' stroke-width='0.5'/%3E%3C/svg%3E")`,
        }} />

        <div className="relative container-custom py-10 md:py-14">
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto text-center"
          >
            <motion.div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-4"
              whileHover={{ scale: 1.05 }}
            >
              <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                <Sparkles className="h-3.5 w-3.5 text-secondary" />
              </motion.div>
              <span className="text-xs font-semibold text-primary-foreground tracking-wide">
                Printed Books & Hard Copy Notes — Pan India Delivery
              </span>
            </motion.div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-primary-foreground leading-tight tracking-tight mb-3">
              Premium Study Material,
              <span className="block mt-1"
                style={{
                  background: 'linear-gradient(135deg, hsl(160 84% 55%), hsl(120 70% 60%))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 2px 8px hsl(160 84% 39% / 0.3))',
                }}
              >
                Delivered to Your Doorstep
              </span>
            </h1>
            <p className="text-sm md:text-base text-white/80 max-w-2xl mx-auto mb-6">
              Quality printed books and hard copy notes for MPSC, Banking, SSC & more — couriered safely across India with free shipping.
            </p>

            {/* Floating book icons row */}
            <motion.div className="flex items-center justify-center gap-5 md:gap-8 my-4">
              {[
                { Icon: BookOpen, label: 'Books' },
                { Icon: FileText, label: 'Notes' },
                { Icon: Award, label: 'Quality' },
              ].map((item, index) => {
                const floatY = index === 1 ? [-5, 5, -5] : [5, -5, 5];
                return (
                  <motion.div
                    key={index}
                    className="relative"
                    initial={{ opacity: 0, y: 20, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.15, duration: 0.5 }}
                  >
                    <motion.div
                      animate={{ y: floatY }}
                      transition={{ duration: 5 + index * 0.8, repeat: Infinity, ease: 'easeInOut', delay: index * 0.4 }}
                      whileHover={{ scale: 1.15, y: -8 }}
                    >
                      <motion.div
                        className="absolute -inset-1.5 rounded-2xl"
                        style={{ background: 'linear-gradient(135deg, hsl(160 84% 39% / 0.3), hsl(221 83% 53% / 0.3))', filter: 'blur(6px)' }}
                        animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.08, 1] }}
                        transition={{ duration: 3, repeat: Infinity, delay: index * 0.4 }}
                      />
                      <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg">
                        <item.Icon className="h-7 w-7 md:h-8 md:w-8 text-white" />
                      </div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-white rounded-full shadow-md whitespace-nowrap">
                        <span className="text-[10px] font-bold text-primary">{item.label}</span>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mt-7">
              {[
                { Icon: Truck, text: 'Free Doorstep Delivery' },
                { Icon: ShieldCheck, text: 'Secure UPI / Card Payment' },
                { Icon: Package, text: 'Tracked Shipping' },
              ].map((t, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 backdrop-blur-sm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.12)', scale: 1.05 }}
                >
                  <div className="w-5 h-5 rounded-full bg-secondary/20 flex items-center justify-center">
                    <t.Icon className="h-3 w-3 text-secondary" />
                  </div>
                  <span className="text-xs font-medium text-primary-foreground">{t.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Wave separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 50" fill="none" className="w-full h-auto" preserveAspectRatio="none">
            <path
              d="M0 50L48 46C96 42 192 34 288 30C384 26 480 26 576 28C672 30 768 34 864 35C960 36 1056 34 1152 30C1248 26 1344 26 1392 26L1440 26V50H0Z"
              fill="hsl(var(--background))"
            />
          </svg>
        </div>
      </section>

      <main className="flex-1 container-custom py-10 md:py-14">
        {/* Book Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : books.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium text-foreground">No books available right now</p>
              <p className="text-sm mt-1">Please check back soon.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {books.map((book) => {
              const isSelected = selected?.id === book.id;
              return (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                  className={`bg-card rounded-2xl border ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border'} overflow-hidden shadow-sm hover:shadow-lg transition-all`}
                >
                  <div className="aspect-[4/3] bg-muted overflow-hidden relative">
                    {book.image_url ? (
                      <img src={book.image_url} alt={book.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl">📚</div>
                    )}
                    {book.badge && (
                      <Badge className="absolute top-3 left-3 bg-secondary text-secondary-foreground">{book.badge}</Badge>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-lg text-foreground line-clamp-2">{book.name}</h3>
                    {book.description && (
                      <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{book.description}</p>
                    )}
                    <div className="flex items-baseline gap-2 mt-3">
                      <span className="text-2xl font-bold text-foreground">₹{book.price}</span>
                      {book.original_price && book.original_price > book.price && (
                        <span className="text-sm text-muted-foreground line-through">₹{book.original_price}</span>
                      )}
                    </div>
                    <Button
                      className="w-full mt-4"
                      variant={isSelected ? 'secondary' : 'default'}
                      onClick={() => handleBuy(book)}
                    >
                      {isSelected ? 'Selected ✓' : 'Buy Now'}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Checkout Form */}
        {selected && (
          <motion.div
            id="checkout-form"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4 mb-6 pb-5 border-b border-border">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">You're ordering</p>
                <h2 className="text-xl font-bold text-foreground">{selected.name}</h2>
                <p className="text-2xl font-bold text-primary mt-1">₹{totalAmount}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Change</Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <h3 className="font-semibold text-foreground">Your Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="customer_name">Full Name *</Label>
                  <Input id="customer_name" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="customer_phone">Mobile Number *</Label>
                  <Input id="customer_phone" inputMode="numeric" maxLength={10} value={form.customer_phone}
                    onChange={e => setForm({ ...form, customer_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="9876543210" required />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Label htmlFor="customer_email">Email *</Label>
                  <Input id="customer_email" type="email" value={form.customer_email} onChange={e => setForm({ ...form, customer_email: e.target.value })} required />
                </div>
              </div>

              <h3 className="font-semibold text-foreground pt-3">Shipping Address</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="address_line1">Address Line 1 *</Label>
                  <Input id="address_line1" value={form.address_line1} onChange={e => setForm({ ...form, address_line1: e.target.value })} placeholder="House/Flat No., Street, Area" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="address_line2">Address Line 2</Label>
                  <Input id="address_line2" value={form.address_line2} onChange={e => setForm({ ...form, address_line2: e.target.value })} placeholder="Apartment, Building (optional)" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="city">City *</Label>
                    <Input id="city" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="state">State *</Label>
                    <Input id="state" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pincode">Pincode *</Label>
                    <Input id="pincode" inputMode="numeric" maxLength={6} value={form.pincode}
                      onChange={e => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="landmark">Landmark</Label>
                  <Input id="landmark" value={form.landmark} onChange={e => setForm({ ...form, landmark: e.target.value })} placeholder="Near… (optional)" />
                </div>
              </div>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/40 cursor-pointer">
                <input type="checkbox" checked={form.whatsapp_optin} onChange={e => setForm({ ...form, whatsapp_optin: e.target.checked })} className="mt-1" />
                <span className="text-sm text-foreground">
                  Send shipping & tracking updates on WhatsApp <span className="text-muted-foreground">(recommended)</span>
                </span>
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <Button type="submit" size="lg" className="w-full sm:w-auto sm:flex-1" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Pay ₹{totalAmount} & Place Order
                </Button>
                <p className="text-xs text-muted-foreground text-center sm:text-left">
                  Secure payment via Razorpay. Free shipping included.
                </p>
              </div>
            </form>
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Books;
