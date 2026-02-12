import { useState, useRef, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Download, Copy, Check, Package, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Product } from '@/hooks/useProducts';

interface CampaignOffersTabProps {
  products: Product[] | undefined;
  isLoading: boolean;
}

const CampaignOffersTab = ({ products, isLoading }: CampaignOffersTabProps) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const qrRef = useRef<HTMLDivElement>(null);

  // Only active products
  const activeProducts = useMemo(
    () => (products || []).filter((p) => p.is_active),
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

  // Generate the combo URL with comma-separated IDs
  const comboUrl = useMemo(() => {
    if (selectedIds.size === 0) return '';
    const ids = Array.from(selectedIds).join(',');
    return `${window.location.origin}/cart?add=${ids}`;
  }, [selectedIds]);

  const handleCopyLink = async () => {
    if (!comboUrl) return;
    try {
      await navigator.clipboard.writeText(comboUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `combo-offer-qr-${Date.now()}.png`;
      link.href = pngUrl;
      link.click();
      toast.success('QR code downloaded');
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const selectedProducts = activeProducts.filter((p) => selectedIds.has(p.id));
  const totalPrice = selectedProducts.reduce((s, p) => s + p.price, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Special Campaign / Combo Offers</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select multiple products to create a single QR code & link. When scanned, the customer's cart will be cleared and only the selected products will be added.
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
                  {/* Category header */}
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
                  {/* Products */}
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

        {/* QR Code & Summary Panel */}
        <div className="space-y-4">
          {/* Selected summary */}
          <div className="bg-card rounded-lg border border-border p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Selected Products ({selectedIds.size})
            </h3>
            {selectedProducts.length === 0 ? (
              <p className="text-xs text-muted-foreground">No products selected yet.</p>
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
                  <span>Total</span>
                  <span>₹{totalPrice}</span>
                </div>
              </>
            )}
          </div>

          {/* QR Code */}
          {selectedIds.size > 0 && (
            <div className="bg-card rounded-lg border border-border p-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                QR Code & Link
              </h3>

              <div ref={qrRef} className="flex justify-center p-4 bg-white rounded-xl">
                <QRCodeSVG value={comboUrl} size={180} level="H" includeMargin bgColor="#ffffff" fgColor="#000000" />
              </div>

              {/* URL */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground font-mono break-all">{comboUrl}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={handleCopyLink}>
                  {copied ? (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      Copy Link
                    </>
                  )}
                </Button>
                <Button size="sm" className="flex-1" onClick={handleDownloadQR}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download QR
                </Button>
              </div>
            </div>
          )}

          {/* Clear selection */}
          {selectedIds.size > 0 && (
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setSelectedIds(new Set())}>
              Clear Selection
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignOffersTab;
