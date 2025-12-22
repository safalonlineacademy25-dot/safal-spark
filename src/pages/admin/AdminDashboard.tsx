import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  MessageCircle,
  Settings,
  LogOut,
  BookOpen,
  TrendingUp,
  IndianRupee,
  Download,
  Eye,
  Search,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, signOut } from '@/hooks/useAuth';
import { useProducts } from '@/hooks/useProducts';
import { useOrders } from '@/hooks/useOrders';
import AddProductDialog from '@/components/admin/AddProductDialog';
import EditProductDialog from '@/components/admin/EditProductDialog';
import DeleteProductDialog from '@/components/admin/DeleteProductDialog';
import OrderDetailsDialog from '@/components/admin/OrderDetailsDialog';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: orders, isLoading: ordersLoading } = useOrders();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/admin');
      } else if (!isAdmin) {
        toast.error('Access denied', {
          description: 'You do not have admin permissions.',
        });
        signOut();
        navigate('/admin');
      }
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/admin');
  };

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'whatsapp', label: 'WhatsApp Logs', icon: MessageCircle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const stats = [
    { label: 'Total Revenue', value: '₹1,24,500', icon: IndianRupee, change: '+12.5%', color: 'text-secondary' },
    { label: 'Total Orders', value: '342', icon: ShoppingCart, change: '+8.2%', color: 'text-primary' },
    { label: 'Downloads', value: '7,926', icon: Download, change: '+15.3%', color: 'text-secondary' },
    { label: 'Active Users', value: '1,247', icon: Users, change: '+5.7%', color: 'text-primary' },
  ];

  // Get recent orders from actual data
  const recentOrders = orders?.slice(0, 5) || [];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <>
      <Helmet>
        <title>Admin Dashboard | Safal Online Academy</title>
      </Helmet>

      <div className="min-h-screen bg-muted/30 flex">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r border-border hidden lg:flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg hero-gradient flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">
                Safal<span className="text-primary">Admin</span>
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === item.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </button>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-border">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {/* Header */}
          <header className="bg-card border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground capitalize">{activeTab}</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back! Here's what's happening today.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'dashboard' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {stats.map((stat, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-card rounded-xl border border-border p-5"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                          <stat.icon className="h-5 w-5" />
                        </div>
                        <span className="flex items-center gap-1 text-xs font-medium text-secondary">
                          <TrendingUp className="h-3 w-3" />
                          {stat.change}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Recent Orders */}
                <div className="bg-card rounded-xl border border-border">
                  <div className="p-5 border-b border-border flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground">Recent Orders</h2>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('orders')}>View All</Button>
                  </div>
                  <div className="overflow-x-auto">
                    {ordersLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : recentOrders.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        No orders yet. Orders will appear here once customers start purchasing.
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Order #</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Customer</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Amount</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentOrders.map((order) => (
                            <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                              <td className="p-4 text-sm font-medium text-foreground font-mono">{order.order_number}</td>
                              <td className="p-4">
                                <div className="text-sm text-foreground">{order.customer_name || order.customer_email}</div>
                                <div className="text-xs text-muted-foreground">{order.customer_phone}</div>
                              </td>
                              <td className="p-4 text-sm font-medium price-text">₹{order.total_amount}</td>
                              <td className="p-4">
                                <span
                                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                                    order.status === 'paid' || order.status === 'completed'
                                      ? 'bg-secondary/10 text-secondary'
                                      : order.status === 'pending'
                                      ? 'bg-yellow-500/10 text-yellow-600'
                                      : 'bg-primary/10 text-primary'
                                  }`}
                                >
                                  {order.status}
                                </span>
                              </td>
                              <td className="p-4 text-sm text-muted-foreground">
                                {order.created_at ? format(new Date(order.created_at), 'MMM d, h:mm a') : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'products' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">All Products</h2>
                  <AddProductDialog />
                </div>

                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  {productsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : !products || products.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No products found. Add your first product above.
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Product</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Category</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Price</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Downloads</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((product) => (
                          <tr key={product.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                  {product.category === 'notes' && '📚'}
                                  {product.category === 'mock-papers' && '📝'}
                                  {product.category === 'combo' && '🎁'}
                                </div>
                                <span className="font-medium text-foreground">{product.name}</span>
                              </div>
                            </td>
                            <td className="p-4 text-sm text-muted-foreground capitalize">{product.category}</td>
                            <td className="p-4 text-sm font-medium price-text">₹{product.price}</td>
                            <td className="p-4 text-sm text-muted-foreground">{product.download_count?.toLocaleString() || 0}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <EditProductDialog product={product} />
                                <DeleteProductDialog productId={product.id} productName={product.name} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'orders' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">All Orders</h2>
                  <div className="text-sm text-muted-foreground">
                    {orders?.length || 0} total orders
                  </div>
                </div>

                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  {ordersLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : !orders || orders.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No orders found yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Order #</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Customer</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Amount</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Payment</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Delivery</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map((order) => (
                            <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                              <td className="p-4 text-sm font-medium text-foreground font-mono">
                                {order.order_number}
                              </td>
                              <td className="p-4">
                                <div className="text-sm text-foreground">{order.customer_name || 'N/A'}</div>
                                <div className="text-xs text-muted-foreground">{order.customer_email}</div>
                              </td>
                              <td className="p-4 text-sm font-medium price-text">₹{order.total_amount}</td>
                              <td className="p-4">
                                <span
                                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                                    order.status === 'completed' || order.status === 'paid'
                                      ? 'bg-secondary/10 text-secondary'
                                      : order.status === 'pending'
                                      ? 'bg-yellow-500/10 text-yellow-600'
                                      : 'bg-destructive/10 text-destructive'
                                  }`}
                                >
                                  {order.status}
                                </span>
                              </td>
                              <td className="p-4">
                                <span
                                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                                    order.delivery_status === 'delivered'
                                      ? 'bg-secondary/10 text-secondary'
                                      : order.delivery_status === 'pending'
                                      ? 'bg-yellow-500/10 text-yellow-600'
                                      : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  {order.delivery_status || 'pending'}
                                </span>
                              </td>
                              <td className="p-4 text-sm text-muted-foreground">
                                {order.created_at ? format(new Date(order.created_at), 'MMM d, yyyy') : 'N/A'}
                              </td>
                              <td className="p-4">
                                <OrderDetailsDialog order={order} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {(activeTab === 'customers' || activeTab === 'whatsapp' || activeTab === 'settings') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16"
              >
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  {activeTab === 'customers' && <Users className="h-8 w-8 text-muted-foreground" />}
                  {activeTab === 'whatsapp' && <MessageCircle className="h-8 w-8 text-muted-foreground" />}
                  {activeTab === 'settings' && <Settings className="h-8 w-8 text-muted-foreground" />}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2 capitalize">{activeTab}</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  This section is coming soon.
                </p>
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default AdminDashboard;
