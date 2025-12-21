import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Edit, Loader2 } from 'lucide-react';
import { useUpdateProduct, Product } from '@/hooks/useProducts';

interface EditProductDialogProps {
  product: Product;
  children?: React.ReactNode;
}

const EditProductDialog = ({ product, children }: EditProductDialogProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'notes',
    price: 0,
    original_price: 0,
    image_url: '',
    file_url: '',
    badge: '',
    is_active: true,
  });
  const [featuresInput, setFeaturesInput] = useState('');

  const updateProduct = useUpdateProduct();

  useEffect(() => {
    if (open && product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        category: product.category || 'notes',
        price: product.price || 0,
        original_price: product.original_price || 0,
        image_url: product.image_url || '',
        file_url: product.file_url || '',
        badge: product.badge || '',
        is_active: product.is_active ?? true,
      });
      setFeaturesInput(product.features?.join('\n') || '');
    }
  }, [open, product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await updateProduct.mutateAsync({
        id: product.id,
        name: formData.name,
        category: formData.category,
        price: formData.price,
        original_price: formData.original_price || null,
        description: formData.description || null,
        image_url: formData.image_url || null,
        file_url: formData.file_url || null,
        badge: formData.badge && formData.badge.trim().length > 0 ? formData.badge.trim() : null,
        is_active: formData.is_active,
        features: featuresInput ? featuresInput.split('\n').filter(f => f.trim()) : [],
      });
      setOpen(false);
    } catch (error) {
      // Error is handled in the mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Badge must be one of: Best Value, Popular (or leave empty).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Product Name *</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Complete Study Notes"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the product"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category *</Label>
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
              <Label htmlFor="edit-badge">Badge</Label>
              <Select
                value={formData.badge && formData.badge.length > 0 ? formData.badge : 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, badge: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger id="edit-badge">
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
              <Label htmlFor="edit-price">Price (₹) *</Label>
              <Input
                id="edit-price"
                type="number"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-original_price">Original Price (₹)</Label>
              <Input
                id="edit-original_price"
                type="number"
                min="0"
                value={formData.original_price || ''}
                onChange={(e) => setFormData({ ...formData, original_price: Number(e.target.value) || 0 })}
                placeholder="For showing discount"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-image_url">Image URL</Label>
            <Input
              id="edit-image_url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-file_url">File URL (Download Link)</Label>
            <Input
              id="edit-file_url"
              value={formData.file_url}
              onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-features">Features (one per line)</Label>
            <Textarea
              id="edit-features"
              value={featuresInput}
              onChange={(e) => setFeaturesInput(e.target.value)}
              placeholder="Comprehensive coverage&#10;Expert solutions&#10;Updated content"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="edit-is_active">Active</Label>
            <Switch
              id="edit-is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateProduct.isPending}>
              {updateProduct.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProductDialog;
