import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Upload, X } from 'lucide-react';
import { useAddProduct, ProductInsert } from '@/hooks/useProducts';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useProductFileUpload } from '@/hooks/useProductFileUpload';
import FileUploadProgress from './FileUploadProgress';

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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const productFileInputRef = useRef<HTMLInputElement>(null);

  const addProduct = useAddProduct();
  const { uploadImage, isUploading: isImageUploading } = useImageUpload();
  const { 
    uploadFile, 
    cancelUpload, 
    isUploading: isFileUploading, 
    progress: fileProgress 
  } = useProductFileUpload();

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase
    const url = await uploadImage(file);
    if (url) {
      setFormData({ ...formData, image_url: url });
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setFormData({ ...formData, image_url: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleProductFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    
    // Upload to Supabase Storage
    const url = await uploadFile(file);
    if (url) {
      setFormData({ ...formData, file_url: url });
    }
  };

  const removeProductFile = () => {
    setSelectedFile(null);
    setFormData({ ...formData, file_url: '' });
    if (productFileInputRef.current) {
      productFileInputRef.current.value = '';
    }
    cancelUpload();
  };

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
    setImagePreview(null);
    setSelectedFile(null);
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
                  <SelectItem value="notes">Competitive Exam Notes</SelectItem>
                  <SelectItem value="mock-papers">Mock Papers</SelectItem>
                  <SelectItem value="pune-university">Pune University Notes</SelectItem>
                  <SelectItem value="engineering">Engineering Notes</SelectItem>
                  <SelectItem value="iit">IIT Notes</SelectItem>
                  <SelectItem value="others">Others</SelectItem>
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

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Product Image</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            
            {imagePreview || formData.image_url ? (
              <div className="relative w-full h-40 rounded-lg border border-border overflow-hidden">
                <img
                  src={imagePreview || formData.image_url || ''}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                >
                  <X className="h-4 w-4" />
                </button>
                {isImageUploading && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImageUploading}
                className="w-full h-40 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
              >
                {isImageUploading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-8 w-8" />
                    <span className="text-sm">Click to upload image</span>
                  </>
                )}
              </button>
            )}
            
            <p className="text-xs text-muted-foreground">
              Or paste an external URL below
            </p>
            <Input
              value={formData.image_url || ''}
              onChange={(e) => {
                setFormData({ ...formData, image_url: e.target.value });
                setImagePreview(null);
              }}
              placeholder="https://..."
            />
          </div>

          {/* Product File Upload */}
          <div className="space-y-2">
            <Label>Product File (PDF, ZIP, etc.)</Label>
            <input
              ref={productFileInputRef}
              type="file"
              accept=".pdf,.zip,.rar,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
              onChange={handleProductFileSelect}
              className="hidden"
            />
            
            <FileUploadProgress
              fileName={selectedFile?.name || null}
              fileSize={selectedFile?.size || 0}
              isUploading={isFileUploading}
              progress={fileProgress}
              onCancel={cancelUpload}
              onRemove={removeProductFile}
              onSelect={() => productFileInputRef.current?.click()}
              disabled={isFileUploading}
            />
            
            {formData.file_url && !selectedFile && (
              <div className="text-xs text-muted-foreground">
                Current file: <span className="font-mono">{formData.file_url.split('/').pop()}</span>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground">
              Or paste an external URL below
            </p>
            <Input
              id="file_url"
              value={formData.file_url || ''}
              onChange={(e) => {
                setFormData({ ...formData, file_url: e.target.value });
                setSelectedFile(null);
              }}
              placeholder="https://..."
              disabled={isFileUploading}
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
            <Button type="submit" disabled={addProduct.isPending || isImageUploading || isFileUploading}>
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
