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
import { useComboPackFileUpload } from '@/hooks/useComboPackFiles';
 import { useProductAudioFileUpload } from '@/hooks/useProductAudioFiles';
 import ProductDocumentFilesManager from './ProductDocumentFilesManager';
 import ProductAudioFilesManager from './ProductAudioFilesManager';

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
    audio_url: '',
    badge: '',
    is_active: true,
    features: [],
  });
  const [featuresInput, setFeaturesInput] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
   const [pendingDocumentFiles, setPendingDocumentFiles] = useState<Array<{ file: File; order: number }>>([]);
   const [pendingAudioFiles, setPendingAudioFiles] = useState<Array<{ file: File; order: number }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addProduct = useAddProduct();
  const { uploadImage, isUploading: isImageUploading, cancelUpload: cancelImageUpload } = useImageUpload();
   const { uploadFile: uploadDocumentFile, isUploading: isDocumentUploading } = useComboPackFileUpload();
   const { uploadFile: uploadAudioFile, isUploading: isAudioUploading } = useProductAudioFileUpload();

  // Cancel uploads and cleanup when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      cancelImageUpload();
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    }
    setOpen(newOpen);
  };

  // Defer upload - only show local preview instantly
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedImageFile(file);
    
    // Show instant preview using object URL (much faster)
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const removeImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setSelectedImageFile(null);
    setFormData({ ...formData, image_url: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let imageUrl = formData.image_url || null;
    
    // Image upload promise
    if (selectedImageFile && !formData.image_url) {
       const url = await uploadImage(selectedImageFile);
       if (url) {
         imageUrl = url;
       } else {
         return; // Upload failed
      }
    }
    
    const product: ProductInsert = {
      name: formData.name || '',
      category: formData.category || 'notes',
      price: formData.price || 0,
      original_price: formData.original_price || null,
      description: formData.description || null,
      image_url: imageUrl,
       file_url: null,
       audio_url: null,
      badge: formData.badge && formData.badge.trim().length > 0 ? formData.badge.trim() : null,
      is_active: formData.is_active ?? true,
      features: featuresInput ? featuresInput.split('\n').filter(f => f.trim()) : [],
    };

    try {
      const newProduct = await addProduct.mutateAsync(product);
      
       // Upload pending document files
       if (pendingDocumentFiles.length > 0 && newProduct?.id) {
         for (const { file, order } of pendingDocumentFiles) {
           await uploadDocumentFile(file, newProduct.id, order);
         }
       }
       
       // Upload pending audio files
       if (pendingAudioFiles.length > 0 && newProduct?.id) {
         for (const { file, order } of pendingAudioFiles) {
           await uploadAudioFile(file, newProduct.id, order);
        }
      }
      
      setOpen(false);
      resetForm();
    } catch (error) {
      // Error is handled in the mutation
    }
  };

  const resetForm = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setFormData({
      name: '',
      description: '',
      category: 'notes',
      price: 0,
      original_price: 0,
      image_url: '',
      file_url: '',
      audio_url: '',
      badge: '',
      is_active: true,
      features: [],
    });
    setFeaturesInput('');
    setImagePreview(null);
    setSelectedImageFile(null);
     setPendingDocumentFiles([]);
     setPendingAudioFiles([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
                  <SelectItem value="audio-notes">Audio Notes</SelectItem>
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

           {/* Document Files Upload */}
           <ProductDocumentFilesManager
             productId={null}
             isNewProduct={true}
             pendingFiles={pendingDocumentFiles}
             onFilesChange={setPendingDocumentFiles}
           />

           {/* Audio Files Upload */}
           <ProductAudioFilesManager
             productId={null}
             isNewProduct={true}
             pendingFiles={pendingAudioFiles}
             onFilesChange={setPendingAudioFiles}
           />

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
             <Button type="submit" disabled={addProduct.isPending || isImageUploading || isDocumentUploading || isAudioUploading}>
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
