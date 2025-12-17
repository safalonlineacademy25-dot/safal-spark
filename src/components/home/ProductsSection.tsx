import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShoppingCart, Check, Download, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { products, useCartStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

const ProductsSection = () => {
  const addItem = useCartStore((state) => state.addItem);
  const items = useCartStore((state) => state.items);
  const { toast } = useToast();

  const isInCart = (productId: string) => {
    return items.some((item) => item.product.id === productId);
  };

  const handleAddToCart = (product: typeof products[0]) => {
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
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <section className="section-padding bg-muted/30">
      <div className="container-custom">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 md:mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary/10 text-secondary text-sm font-medium mb-4">
            Our Products
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Featured Study Materials
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Choose the package that suits your preparation. All products include instant PDF download.
          </p>
        </motion.div>

        {/* Products Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
        >
          {products.map((product) => (
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
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {product.description}
                  </p>

                  {/* Features */}
                  <ul className="space-y-2 mb-6 flex-1">
                    {product.features.slice(0, 4).map((feature, index) => (
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
        </motion.div>

        {/* View All */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center mt-10"
        >
          <Link to="/products">
            <Button variant="outline" size="lg">
              View All Products
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default ProductsSection;
