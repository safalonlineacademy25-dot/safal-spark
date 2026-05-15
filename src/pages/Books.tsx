import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { BookOpen, Truck, Loader2, ShieldCheck, Package } from 'lucide-react';
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

      <Header />

      <main className="flex-1 container-custom py-10 md:py-14">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <BookOpen className="h-4 w-4" /> Hard Copy / Books
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3">
            Printed Books, <span className="text-gradient">Delivered Home</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Get our study notes and books as printed copies, shipped to your address by courier or post — all across India.
          </p>
          <div className="flex items-center justify-center gap-6 mt-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Truck className="h-4 w-4 text-primary" /> Delivered to your doorstep</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> Secure UPI / Card payment</span>
          </div>
        </motion.div>

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
