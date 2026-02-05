import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Check, Download, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { useActiveProducts, Product } from '@/hooks/useProducts';
import { fadeInUp, staggerContainer, staggerItem, viewportSettings } from '@/hooks/useScrollAnimation';

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
  'mumbai-university': 'Mumbai University Notes',
  'engineering': 'Engineering Notes',
  'iit': 'IIT Notes',
  'audio-notes': 'Audio Notes',
  'others': 'Others',
};

const ProductsSection = () => {
  const { data: products, isLoading, error } = useActiveProducts();
  const addItem = useCartStore((state) => state.addItem);
  const items = useCartStore((state) => state.items);
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Hint the browser to fetch product images ASAP (even if the grid is only partially visible).
  useEffect(() => {
    if (!products?.length) return;

    const urls = products
      .map((p) => getImageUrl(p.image_url))
      .filter(Boolean) as string[];

    // Preload only the first few to avoid unnecessary bandwidth.
    urls.slice(0, 6).forEach((href) => {
      const selector = `link[rel="preload"][as="image"][href="${CSS.escape(href)}"]`;
      if (document.head.querySelector(selector)) return;

      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = href;
      document.head.appendChild(link);
    });
  }, [products]);

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

  const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: i * 0.08,
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1] as const
      }
    })
  };

  return (
    <section
      id="products"
      className="section-padding -mt-12 pt-10 md:-mt-16 md:pt-12 bg-gradient-to-b from-primary/5 via-secondary/5 to-background"
    >
      <div className="container-custom">
        {/* Header */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportSettings}
          className="text-center mb-6 md:mb-8"
        >
          <motion.span 
            className="inline-block px-4 py-1.5 rounded-full bg-secondary/10 text-secondary text-sm font-medium mb-4"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={viewportSettings}
            transition={{ duration: 0.4 }}
          >
            Our Products
          </motion.span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            All Study Materials
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
            Choose the package that suits your preparation. All products include instant PDF download.
          </p>
        </motion.div>

        {/* Category Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportSettings}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-2 mb-4"
        >
          {categories.map((category, index) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={viewportSettings}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <Button
                variant={activeCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCategory(category)}
                className="capitalize"
              >
                {CATEGORY_LABELS[category] || category}
              </Button>
            </motion.div>
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
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
          >
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                custom={index}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                // Trigger earlier so the first row becomes visible even when only a small portion is on-screen.
                viewport={{ once: true, amount: 0.12 }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="relative group"
              >
                <div className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all duration-300 h-full flex flex-col">
                  {/* Badge */}
                  {product.badge && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.05 }}
                      className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold z-10 ${
                        product.badge === 'best-value' ? 'badge-best' : 'badge-popular'
                      }`}
                    >
                      {product.badge === 'best-value' ? '🏆 Best Value' : '🔥 Popular'}
                    </motion.div>
                  )}

                  {/* Image */}
                  <div className="relative h-48 bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center overflow-hidden">
                    {getImageUrl(product.image_url) ? (
                      <img
                        src={getImageUrl(product.image_url)!}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="eager"
                        fetchPriority={index < 3 ? 'high' : 'auto'}
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
                      {product.category === 'mumbai-university' && '🏫'}
                      {product.category === 'engineering' && '⚙️'}
                      {product.category === 'iit' && '🏛️'}
                      {product.category === 'audio-notes' && '🎧'}
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
                      {(product.features || []).slice(0, 4).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
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
