import { useEffect, useState, useRef } from 'react';
import { Plus, Loader2, Edit, Trash2, Upload, X, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useImageUpload } from '@/hooks/useImageUpload';
import { toast } from 'sonner';

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
  is_active: boolean;
  show_on_ui: boolean;
  created_at: string;
}

const empty = {
  name: '', description: '', price: 0, original_price: 0,
  image_url: '', badge: '', category: 'Books', features: '',
  weight_grams: 0, is_active: true, show_on_ui: true,
};

const HardCopyProductsTab = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { uploadImage, isUploading } = useImageUpload();

  const fetchBooks = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('hard_copy_products' as any).select('*').order('created_at', { ascending: false });
    if (error) toast.error('Failed to load books');
    else setBooks((data as unknown as Book[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchBooks(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty });
    setImagePreview(null);
    setImageFile(null);
    setOpen(true);
  };

  const openEdit = (b: Book) => {
    setEditing(b);
    setForm({
      name: b.name, description: b.description || '', price: Number(b.price),
      original_price: b.original_price ? Number(b.original_price) : 0,
      image_url: b.image_url || '', badge: b.badge || '', category: b.category || 'Books',
      features: (b.features || []).join('\n'),
      weight_grams: b.weight_grams || 0,
      is_active: b.is_active, show_on_ui: b.show_on_ui,
    });
    setImagePreview(b.image_url);
    setImageFile(null);
    setOpen(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let imageUrl = form.image_url || null;
      if (imageFile) {
        const url = await uploadImage(imageFile);
        if (!url) { setSaving(false); return; }
        imageUrl = url;
      }
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        original_price: Number(form.original_price) || null,
        image_url: imageUrl,
        badge: form.badge.trim() || null,
        category: form.category.trim() || 'Books',
        features: form.features ? form.features.split('\n').map(s => s.trim()).filter(Boolean) : [],
        weight_grams: Number(form.weight_grams) || null,
        is_active: form.is_active,
        show_on_ui: form.show_on_ui,
      };
      if (editing) {
        const { error } = await supabase.from('hard_copy_products' as any).update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Book updated');
      } else {
        const { error } = await supabase.from('hard_copy_products' as any).insert(payload);
        if (error) throw error;
        toast.success('Book added');
      }
      setOpen(false);
      fetchBooks();
    } catch (err: any) {
      toast.error('Save failed', { description: err?.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('hard_copy_products' as any).delete().eq('id', deleteTarget.id);
    if (error) toast.error('Delete failed', { description: error.message });
    else { toast.success('Book deleted'); fetchBooks(); }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Books / Hard Copy Products</h2>
          <p className="text-sm text-muted-foreground">Printed books and physical notes shipped to customer's home address.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Add Book</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : books.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Package className="h-10 w-10 mx-auto mb-2 opacity-50" />No books added yet.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {books.map(b => (
            <Card key={b.id}>
              <div className="aspect-[4/3] bg-muted rounded-t-lg overflow-hidden">
                {b.image_url ? <img src={b.image_url} alt={b.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-5xl">📚</div>}
              </div>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm line-clamp-2">{b.name}</h3>
                  <div className="flex gap-1 shrink-0">
                    {!b.is_active && <Badge variant="outline" className="text-xs">Hidden</Badge>}
                    {!b.show_on_ui && b.is_active && <Badge variant="outline" className="text-xs">Off UI</Badge>}
                  </div>
                </div>
                <p className="text-base font-bold mt-2">₹{b.price}{b.original_price ? <span className="ml-2 text-xs text-muted-foreground line-through">₹{b.original_price}</span> : null}</p>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(b)}><Edit className="h-3.5 w-3.5 mr-1" />Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleteTarget(b)} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Book' : 'Add Book'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Price (₹) *</Label><Input type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} required /></div>
              <div className="space-y-2"><Label>Original Price (₹)</Label><Input type="number" min="0" value={form.original_price} onChange={e => setForm({ ...form, original_price: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Books" /></div>
              <div className="space-y-2"><Label>Badge</Label><Input value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })} placeholder="e.g. Bestseller" /></div>
            </div>
            <div className="space-y-2">
              <Label>Cover Image</Label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              {imagePreview ? (
                <div className="relative w-full h-40 rounded-lg border overflow-hidden">
                  <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => { setImagePreview(null); setImageFile(null); setForm({ ...form, image_url: '' }); }} className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()} className="w-full h-40 rounded-lg border-2 border-dashed hover:border-primary/50 flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <Upload className="h-7 w-7" /><span className="text-sm">Click to upload</span>
                </button>
              )}
              <Input value={form.image_url} onChange={e => { setForm({ ...form, image_url: e.target.value }); setImagePreview(e.target.value); }} placeholder="or paste image URL" />
            </div>
            <div className="space-y-2"><Label>Features (one per line)</Label><Textarea rows={3} value={form.features} onChange={e => setForm({ ...form, features: e.target.value })} /></div>
            <div className="space-y-2"><Label>Weight (grams) — for shipping reference</Label><Input type="number" min="0" value={form.weight_grams} onChange={e => setForm({ ...form, weight_grams: Number(e.target.value) })} /></div>
            <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /></div>
            <div className="flex items-center justify-between"><Label>Show on /books page</Label><Switch checked={form.show_on_ui} onCheckedChange={v => setForm({ ...form, show_on_ui: v })} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || isUploading}>{(saving || isUploading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editing ? 'Save' : 'Add Book'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this book?</AlertDialogTitle>
            <AlertDialogDescription>"{deleteTarget?.name}" will be removed permanently. Existing orders are not affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HardCopyProductsTab;
