import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { ShoppingCart, Check, Download, Star, Filter } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { products, useCartStore, type Product } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

const Products = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const addItem = useCartStore((state) => state.addItem);
  const items = useCartStore((state) => state.items);
  const { toast } = useToast();

  const categories = [
    { id: 'all', label: 'All Products' },
    { id: 'notes', label: 'Notes' },
    { id: 'mock-papers', label: 'Mock Papers' },
    { id: 'combo', label: 'Combo Packs' },
  ];

  const filteredProducts =
    selectedCategory === 'all'
      ? products
      : products.filter((p) => p.category === selectedCategory);

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

  return (
    <>
      <Helmet>
        <title>Products | Safal Online Academy - Exam Notes & Mock Papers</title>
        <meta
          name="description"
          content="Browse our collection of competitive exam notes and mock question papers. Instant PDF download after payment."
        />
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          {/* Hero */}
          <section className="hero-gradient py-16 md:py-20">
            <div className="container-custom text-center">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
                Our Study Materials
              </h1>
              <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
                High-quality notes and mock papers designed for competitive exam success
              </p>
            </div>
          </section>

          {/* Products */}
          <section className="section-padding">
            <div className="container-custom">
              {/* Filter */}
              <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2">
                <Filter className="h-5 w-5 text-muted-foreground shrink-0" />
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                    className="shrink-0"
                  >
                    {category.label}
                  </Button>
                ))}
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {filteredProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
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
                      <div className="relative h-48 bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
                        <div className="text-6xl">
                          {product.category === 'notes' && '📚'}
                          {product.category === 'mock-papers' && '📝'}
                          {product.category === 'combo' && '🎁'}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6 flex-1 flex flex-col">
                        <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                          {product.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {product.description}
                        </p>

                        {/* Features */}
                        <ul className="space-y-2 mb-6 flex-1">
                          {product.features.map((feature, idx) => (
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
                            <span>{product.downloadCount?.toLocaleString()}+ downloads</span>
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
                              {product.originalPrice && (
                                <span className="text-sm price-original">
                                  ₹{product.originalPrice}
                                </span>
                              )}
                            </div>
                            {product.originalPrice && (
                              <span className="text-xs text-secondary font-medium">
                                Save ₹{product.originalPrice - product.price}
                              </span>
                            )}
                          </div>
                          <Button
                            onClick={() => handleAddToCart(product)}
                            variant={isInCart(product.id) ? 'secondary' : 'default'}
                            size="sm"
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
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Products;
