import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { useAddProduct, ProductInsert } from '@/hooks/useProducts';

interface AddProductDialogProps {
  children?: React.ReactNode;
}

const AddProductDialog = ({ children }: AddProductDialogProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<ProductInsert>>({
    name: '',
    description: '',
    category: 'notes',
    price: 0,
    original_price: 0,
    image_url: '',
    file_url: '',
    badge: '',
    is_active: true,
    features: [],
  });
  const [featuresInput, setFeaturesInput] = useState('');

  const addProduct = useAddProduct();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const product: ProductInsert = {
      name: formData.name || '',
      category: formData.category || 'notes',
      price: formData.price || 0,
      original_price: formData.original_price || null,
      description: formData.description || null,
      image_url: formData.image_url || null,
      file_url: formData.file_url || null,
      badge: formData.badge && formData.badge.trim().length > 0 ? formData.badge.trim() : null,
      is_active: formData.is_active ?? true,
      features: featuresInput ? featuresInput.split('\n').filter(f => f.trim()) : [],
    };

    try {
      await addProduct.mutateAsync(product);
      setOpen(false);
      resetForm();
    } catch (error) {
      // Error is handled in the mutation
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'notes',
      price: 0,
      original_price: 0,
      image_url: '',
      file_url: '',
      badge: '',
      is_active: true,
      features: [],
    });
    setFeaturesInput('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Badge must be one of: Best Value, Popular (or leave empty).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Complete Study Notes"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the product"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="notes">Notes</SelectItem>
                  <SelectItem value="mock-papers">Mock Papers</SelectItem>
                  <SelectItem value="combo">Combo Pack</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="badge">Badge</Label>
              <Select
                value={(formData.badge && formData.badge.length > 0) ? formData.badge : 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, badge: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger id="badge">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="best-value">Best Value</SelectItem>
                  <SelectItem value="popular">Popular</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (₹) *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="original_price">Original Price (₹)</Label>
              <Input
                id="original_price"
                type="number"
                min="0"
                value={formData.original_price || ''}
                onChange={(e) => setFormData({ ...formData, original_price: Number(e.target.value) || null })}
                placeholder="For showing discount"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Input
              id="image_url"
              value={formData.image_url || ''}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file_url">File URL (Download Link)</Label>
            <Input
              id="file_url"
              value={formData.file_url || ''}
              onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="features">Features (one per line)</Label>
            <Textarea
              id="features"
              value={featuresInput}
              onChange={(e) => setFeaturesInput(e.target.value)}
              placeholder="Comprehensive coverage&#10;Expert solutions&#10;Updated content"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addProduct.isPending}>
              {addProduct.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Product
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddProductDialog;
