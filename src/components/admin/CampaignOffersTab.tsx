import { useState, useRef, useMemo } from 'react';
import { Package, Search, Loader2, Upload, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Product, useAddProduct, ProductInsert } from '@/hooks/useProducts';
import { useImageUpload } from '@/hooks/useImageUpload';
import { supabase } from '@/integrations/supabase/client';
import EditProductDialog from './EditProductDialog';
import DeleteProductDialog from './DeleteProductDialog';
import ProductQRCodeDialog from './ProductQRCodeDialog';
import PaginationControls from './PaginationControls';
import { usePagination } from '@/hooks/usePagination';

interface CampaignOffersTabProps {
  products: Product[] | undefined;
  isLoading: boolean;
  isSuperAdmin?: boolean;
}

const CampaignOffersTab = ({ products, isLoading, isSuperAdmin = false }: CampaignOffersTabProps) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Combo product form state
  const [comboName, setComboName] = useState('');
  const [comboDescription, setComboDescription] = useState('');
  const [comboPrice, setComboPrice] = useState<number>(0);
  const [comboBadge, setComboBadge] = useState('');
  const [comboFeatures, setComboFeatures] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [isCopyingFiles, setIsCopyingFiles] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addProduct = useAddProduct();
  const { uploadImage, isUploading: isImageUploading, cancelUpload: cancelImageUpload } = useImageUpload();

  // Existing combo-pack products
  const comboProducts = useMemo(
    () => (products || []).filter((p) => p.category === 'combo-pack'),
    [products]
  );

  const comboPagination = usePagination({ data: comboProducts, itemsPerPage: 10 });

  // Only active products (exclude combo-pack products from selection)
  const activeProducts = useMemo(
    () => (products || []).filter((p) => p.is_active && p.category !== 'combo-pack'),
    [products]
  );

  // Group by category
  const categories = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of activeProducts) {
      const cat = p.category || 'Others';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [activeProducts]);

  // Filtered categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories
      .map(([cat, prods]) => [cat, prods.filter((p) => p.name.toLowerCase().includes(q))] as [string, Product[]])
      .filter(([, prods]) => prods.length > 0);
  }, [categories, searchQuery]);

  const toggleProduct = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCategory = (categoryProducts: Product[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = categoryProducts.every((p) => next.has(p.id));
      for (const p of categoryProducts) {
        if (allSelected) next.delete(p.id);
        else next.add(p.id);
      }
      return next;
    });
  };

  const selectedProducts = activeProducts.filter((p) => selectedIds.has(p.id));
  const totalOriginalPrice = selectedProducts.reduce((s, p) => s + p.price, 0);

  // Image handlers
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setSelectedImageFile(null);
    setImageUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resetForm = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setSelectedIds(new Set());
    setComboName('');
    setComboDescription('');
    setComboPrice(0);
    setComboBadge('');
    setComboFeatures('');
    setImagePreview(null);
    setSelectedImageFile(null);
    setImageUrl('');
  };

  const handleCreateCombo = async () => {
    if (selectedIds.size < 2) {
      toast.error('Please select at least 2 products for a combo offer');
      return;
    }
    if (!comboName.trim()) {
      toast.error('Please enter a combo product name');
      return;
    }
    if (!comboPrice || comboPrice <= 0) {
      toast.error('Please enter a valid combo price');
      return;
    }

    let finalImageUrl = imageUrl || null;

    // Upload image if selected
    if (selectedImageFile && !imageUrl) {
      const url = await uploadImage(selectedImageFile);
      if (url) {
        finalImageUrl = url;
      } else {
        return; // Upload failed
      }
    }

    // Build description with included products
    const includedProductNames = selectedProducts.map((p) => p.name).join(', ');
    const fullDescription = comboDescription
      ? `${comboDescription}\n\nIncludes: ${includedProductNames}`
      : `Combo pack includes: ${includedProductNames}`;

    const product: ProductInsert = {
      name: comboName.trim(),
      category: 'combo-pack',
      price: comboPrice,
      original_price: totalOriginalPrice > comboPrice ? totalOriginalPrice : null,
      description: fullDescription,
      image_url: finalImageUrl,
      file_url: null,
      audio_url: null,
      badge: comboBadge && comboBadge.trim().length > 0 ? comboBadge.trim() : null,
      is_active: true,
      features: comboFeatures ? comboFeatures.split('\n').filter((f) => f.trim()) : [],
    };

    try {
      const newProduct = await addProduct.mutateAsync(product);

      // Auto-copy files from selected products into the new combo product
      if (newProduct?.id) {
        setIsCopyingFiles(true);
        let fileOrder = 0;

        for (const selectedProduct of selectedProducts) {
          // Copy document files
          const { data: docFiles } = await supabase
            .from('combo_pack_files')
            .select('*')
            .eq('product_id', selectedProduct.id)
            .order('file_order', { ascending: true });

          if (docFiles && docFiles.length > 0) {
            for (const docFile of docFiles) {
              await supabase.from('combo_pack_files').insert({
                product_id: newProduct.id,
                file_name: docFile.file_name,
                file_url: docFile.file_url,
                file_order: fileOrder++,
                source_product_id: selectedProduct.id,
                source_product_name: selectedProduct.name,
              });
            }
          }

          // Copy audio files
          const { data: audioFiles } = await supabase
            .from('product_audio_files')
            .select('*')
            .eq('product_id', selectedProduct.id)
            .order('file_order', { ascending: true });

          if (audioFiles && audioFiles.length > 0) {
            for (const audioFile of audioFiles) {
              await supabase.from('product_audio_files').insert({
                product_id: newProduct.id,
                file_name: audioFile.file_name,
                file_url: audioFile.file_url,
                file_order: fileOrder++,
                source_product_id: selectedProduct.id,
                source_product_name: selectedProduct.name,
              });
            }
          }
        }

        setIsCopyingFiles(false);
      }

      toast.success('Combo offer created! Files from selected products have been linked automatically.');
      resetForm();
    } catch (error) {
      setIsCopyingFiles(false);
      // Error handled in mutation
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const isPending = addProduct.isPending || isImageUploading || isCopyingFiles;

  return (
    <div className="space-y-8">
      {/* ============ Existing Combo Products ============ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Combo Products</h2>
          <span className="text-sm text-muted-foreground">{comboProducts.length} combo products</span>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {comboProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No combo products created yet. Use the form below to create one.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Product</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Price</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Original</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Downloads</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comboPagination.paginatedData.map((product) => (
                      <tr key={product.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg">
                              📦
                            </div>
                            <div className="min-w-0">
                              <span className="font-medium text-foreground block truncate max-w-[200px]">{product.name}</span>
                              {product.badge && (
                                <span className="text-xs text-primary font-medium">{product.badge}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm font-medium price-text">₹{product.price}</td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {product.original_price ? (
                            <span className="line-through">₹{product.original_price}</span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                              product.is_active
                                ? 'bg-secondary/10 text-secondary'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {product.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">{product.download_count?.toLocaleString() || 0}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <ProductQRCodeDialog productId={product.id} productName={product.name} />
                            {isSuperAdmin && <EditProductDialog product={product} />}
                            {isSuperAdmin && <DeleteProductDialog productId={product.id} productName={product.name} />}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {comboPagination.totalPages > 1 && (
                <PaginationControls
                  currentPage={comboPagination.currentPage}
                  totalPages={comboPagination.totalPages}
                  startIndex={comboPagination.startIndex}
                  endIndex={comboPagination.endIndex}
                  totalItems={comboPagination.totalItems}
                  onPrevPage={comboPagination.prevPage}
                  onNextPage={comboPagination.nextPage}
                  onGoToPage={comboPagination.goToPage}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* ============ Create New Combo ============ */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Create Combo Offer</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Select products, set a discounted combo price, upload a label image, and create it as a new combo product.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Product Selection */}
          <div className="xl:col-span-2 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category-wise product list */}
            {filteredCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No products found.</p>
            ) : (
              filteredCategories.map(([category, prods]) => {
                const allSelected = prods.every((p) => selectedIds.has(p.id));
                const someSelected = prods.some((p) => selectedIds.has(p.id));
                return (
                  <div key={category} className="bg-card rounded-lg border border-border overflow-hidden">
                    <div
                      className="flex items-center gap-3 px-4 py-3 bg-muted/50 border-b border-border cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => toggleCategory(prods)}
                    >
                      <Checkbox
                        checked={allSelected}
                        className={someSelected && !allSelected ? 'opacity-60' : ''}
                        onCheckedChange={() => toggleCategory(prods)}
                      />
                      <span className="text-sm font-semibold text-foreground">{category}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {prods.filter((p) => selectedIds.has(p.id)).length}/{prods.length} selected
                      </span>
                    </div>
                    <div className="divide-y divide-border">
                      {prods.map((product) => (
                        <label
                          key={product.id}
                          className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
                        >
                          <Checkbox
                            checked={selectedIds.has(product.id)}
                            onCheckedChange={() => toggleProduct(product.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                          </div>
                          <span className="text-sm font-semibold text-primary shrink-0">₹{product.price}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Combo Product Form */}
          <div className="space-y-4">
            {/* Selected summary */}
            <div className="bg-card rounded-lg border border-border p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Package className="h-4 w-4" />
                Selected Products ({selectedIds.size})
              </h3>
              {selectedProducts.length === 0 ? (
                <p className="text-xs text-muted-foreground">Select at least 2 products to create a combo.</p>
              ) : (
                <>
                  <ul className="space-y-1 max-h-48 overflow-y-auto">
                    {selectedProducts.map((p) => (
                      <li key={p.id} className="text-xs text-muted-foreground flex justify-between">
                        <span className="truncate mr-2">{p.name}</span>
                        <span className="shrink-0 font-medium">₹{p.price}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-border pt-2 flex justify-between text-sm font-bold text-foreground">
                    <span>Total (Original)</span>
                    <span>₹{totalOriginalPrice}</span>
                  </div>
                </>
              )}
            </div>

            {/* Combo Details Form */}
            {selectedIds.size >= 2 && (
              <div className="bg-card rounded-lg border border-border p-4 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Combo Product Details</h3>

                <div className="space-y-2">
                  <Label htmlFor="combo-name">Combo Name *</Label>
                  <Input
                    id="combo-name"
                    value={comboName}
                    onChange={(e) => setComboName(e.target.value)}
                    placeholder="e.g., Ultimate Study Bundle"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="combo-desc">Description</Label>
                  <Textarea
                    id="combo-desc"
                    value={comboDescription}
                    onChange={(e) => setComboDescription(e.target.value)}
                    placeholder="Brief description of the combo offer"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="combo-price">Combo Price (₹) *</Label>
                    <Input
                      id="combo-price"
                      type="number"
                      min="0"
                      value={comboPrice || ''}
                      onChange={(e) => setComboPrice(Number(e.target.value))}
                      placeholder={`Discount from ₹${totalOriginalPrice}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Original Price</Label>
                    <div className="flex items-center h-10 px-3 rounded-md border border-input bg-muted text-sm text-muted-foreground line-through">
                      ₹{totalOriginalPrice}
                    </div>
                  </div>
                </div>

                {comboPrice > 0 && comboPrice < totalOriginalPrice && (
                  <div className="bg-primary/10 text-primary text-xs font-medium px-3 py-2 rounded-md text-center">
                    💰 Discount: ₹{totalOriginalPrice - comboPrice} ({Math.round(((totalOriginalPrice - comboPrice) / totalOriginalPrice) * 100)}% off)
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="combo-badge">Badge</Label>
                  <Select
                    value={comboBadge || 'none'}
                    onValueChange={(value) => setComboBadge(value === 'none' ? '' : value)}
                  >
                    <SelectTrigger id="combo-badge">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="best-value">Best Value</SelectItem>
                      <SelectItem value="popular">Popular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                  <Label>Product Label / Image</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />

                  {imagePreview || imageUrl ? (
                    <div className="relative w-full h-32 rounded-lg border border-border overflow-hidden">
                      <img
                        src={imagePreview || imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {isImageUploading && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isImageUploading}
                      className="w-full h-32 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                      {isImageUploading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-6 w-6" />
                          <span className="text-xs">Upload combo label</span>
                        </>
                      )}
                    </button>
                  )}
                  <Input
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setImagePreview(null);
                    }}
                    placeholder="Or paste image URL..."
                    className="text-xs"
                  />
                </div>

                {/* Auto-copied files info */}
                <div className="bg-muted/50 rounded-lg border border-border p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">📁 Files (auto-included)</p>
                  <p>All document and audio files from the selected products will be automatically included in this combo. No need to upload separately.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="combo-features">Features (one per line)</Label>
                  <Textarea
                    id="combo-features"
                    value={comboFeatures}
                    onChange={(e) => setComboFeatures(e.target.value)}
                    placeholder="All-in-one bundle&#10;Huge savings&#10;Complete preparation"
                    rows={3}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={resetForm}
                    disabled={isPending}
                  >
                    Clear All
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={handleCreateCombo}
                    disabled={isPending}
                  >
                    {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Combo Product
                  </Button>
                </div>
              </div>
            )}

            {/* Clear selection */}
            {selectedIds.size > 0 && selectedIds.size < 2 && (
              <p className="text-xs text-muted-foreground text-center">Select one more product to enable combo creation.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignOffersTab;
