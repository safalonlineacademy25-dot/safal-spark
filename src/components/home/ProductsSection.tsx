import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Check, Download, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { useActiveProducts, Product } from '@/hooks/useProducts';

// Convert Google Drive sharing link to direct image URL
const getImageUrl = (url: string | null): string | null => {
  if (!url) return null;
  
  // Check if it's a Google Drive link
  const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
  }
  
  return url;
};

const CATEGORY_LABELS: Record<string, string> = {
  'all': 'All Products',
  'notes': 'Competitive Exam Notes',
  'mock-papers': 'Mock Papers',
  'pune-university': 'Pune University Notes',
  'engineering': 'Engineering Notes',
  'iit': 'IIT Notes',
  'others': 'Others',
};

const ProductsSection = () => {
  const { data: products, isLoading, error } = useActiveProducts();
  const addItem = useCartStore((state) => state.addItem);
  const items = useCartStore((state) => state.items);
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Get unique categories from products
  const categories = useMemo(() => {
    if (!products) return ['all'];
    const uniqueCategories = [...new Set(products.map(p => p.category))];
    return ['all', ...uniqueCategories];
  }, [products]);

  // Filter products by category
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (activeCategory === 'all') return products;
    return products.filter(p => p.category === activeCategory);
  }, [products, activeCategory]);

  const isInCart = (productId: string) => {
    return items.some((item) => item.product.id === productId);
  };

  const handleAddToCart = (product: Product) => {
    if (isInCart(product.id)) {
      toast({
        title: 'Already in cart',
        description: 'This product is already in your cart.',
      });
      return;
    }
    addItem(product);
    toast({
      title: 'Added to cart!',
      description: `${product.name} has been added to your cart.`,
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <section id="products" className="section-padding bg-muted/30">
      <div className="container-custom">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 md:mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary/10 text-secondary text-sm font-medium mb-4">
            Our Products
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            All Study Materials
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Choose the package that suits your preparation. All products include instant PDF download.
          </p>
        </motion.div>

        {/* Category Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-2 mb-10"
        >
          {categories.map((category) => (
            <Button
              key={category}
              variant={activeCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(category)}
              className="capitalize"
            >
              {CATEGORY_LABELS[category] || category}
            </Button>
          ))}
        </motion.div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">
            Failed to load products. Please try again later.
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No products available in this category.
          </div>
        ) : (
          <motion.div
            key={activeCategory}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
          >
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                variants={itemVariants}
                className="relative group"
              >
                <div className="bg-card rounded-2xl border border-border overflow-hidden card-hover h-full flex flex-col">
                  {/* Badge */}
                  {product.badge && (
                    <div
                      className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold z-10 ${
                        product.badge === 'best-value' ? 'badge-best' : 'badge-popular'
                      }`}
                    >
                      {product.badge === 'best-value' ? '🏆 Best Value' : '🔥 Popular'}
                    </div>
                  )}

                  {/* Image */}
                  <div className="relative h-48 bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center overflow-hidden">
                    {getImageUrl(product.image_url) ? (
                      <img
                        src={getImageUrl(product.image_url)!}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`text-6xl fallback-icon ${getImageUrl(product.image_url) ? 'hidden' : ''}`}>
                      {product.category === 'notes' && '📚'}
                      {product.category === 'mock-papers' && '📝'}
                      {product.category === 'pune-university' && '🎓'}
                      {product.category === 'engineering' && '⚙️'}
                      {product.category === 'iit' && '🏛️'}
                      {product.category === 'others' && '📖'}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {product.description}
                    </p>

                    {/* Features */}
                    <ul className="space-y-2 mb-6 flex-1">
                      {(product.features || []).slice(0, 4).map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Download className="h-4 w-4" />
                        <span>{(product.download_count || 0).toLocaleString()}+ downloads</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>4.8</span>
                      </div>
                    </div>

                    {/* Price & CTA */}
                    <div className="flex items-end justify-between gap-4 pt-4 border-t border-border">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold price-text">
                            ₹{product.price}
                          </span>
                          {product.original_price && (
                            <span className="text-sm price-original">
                              ₹{product.original_price}
                            </span>
                          )}
                        </div>
                        {product.original_price && (
                          <span className="text-xs text-secondary font-medium">
                            Save ₹{product.original_price - product.price}
                          </span>
                        )}
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(product);
                        }}
                        variant={isInCart(product.id) ? 'secondary' : 'default'}
                        size="sm"
                        className="relative z-10"
                      >
                        {isInCart(product.id) ? (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Added
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-4 w-4 mr-1" />
                            Add to Cart
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default ProductsSection;
