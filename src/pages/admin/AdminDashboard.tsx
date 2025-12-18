import { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
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
  Edit,
  Eye,
  Search,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdminStore } from '@/lib/store';
import { useProducts } from '@/hooks/useProducts';
import AddProductDialog from '@/components/admin/AddProductDialog';
import DeleteProductDialog from '@/components/admin/DeleteProductDialog';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout } = useAdminStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: products, isLoading: productsLoading } = useProducts();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin');
    }
  }, [isAuthenticated, navigate]);

  const handleLogout = () => {
    logout();
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

  const recentOrders = [
    { id: 'ORD-001', customer: 'Rahul Kumar', product: 'Combo Pack', amount: '₹449', status: 'Completed', date: '2 hours ago' },
    { id: 'ORD-002', customer: 'Priya Singh', product: 'Complete Notes', amount: '₹299', status: 'Completed', date: '5 hours ago' },
    { id: 'ORD-003', customer: 'Amit Sharma', product: 'Mock Papers', amount: '₹199', status: 'Processing', date: '8 hours ago' },
    { id: 'ORD-004', customer: 'Neha Gupta', product: 'Combo Pack', amount: '₹449', status: 'Completed', date: '1 day ago' },
  ];

  if (!isAuthenticated) return null;

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
                    <Button variant="outline" size="sm">View All</Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Order ID</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Customer</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Product</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Amount</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.map((order) => (
                          <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                            <td className="p-4 text-sm font-medium text-foreground">{order.id}</td>
                            <td className="p-4 text-sm text-foreground">{order.customer}</td>
                            <td className="p-4 text-sm text-muted-foreground">{order.product}</td>
                            <td className="p-4 text-sm font-medium price-text">{order.amount}</td>
                            <td className="p-4">
                              <span
                                className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                                  order.status === 'Completed'
                                    ? 'bg-secondary/10 text-secondary'
                                    : 'bg-primary/10 text-primary'
                                }`}
                              >
                                {order.status}
                              </span>
                            </td>
                            <td className="p-4 text-sm text-muted-foreground">{order.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Edit className="h-4 w-4" />
                                </Button>
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

            {(activeTab === 'orders' || activeTab === 'customers' || activeTab === 'whatsapp' || activeTab === 'settings') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16"
              >
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  {activeTab === 'orders' && <ShoppingCart className="h-8 w-8 text-muted-foreground" />}
                  {activeTab === 'customers' && <Users className="h-8 w-8 text-muted-foreground" />}
                  {activeTab === 'whatsapp' && <MessageCircle className="h-8 w-8 text-muted-foreground" />}
                  {activeTab === 'settings' && <Settings className="h-8 w-8 text-muted-foreground" />}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2 capitalize">{activeTab}</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  This section requires backend integration. Connect to Supabase to enable full functionality.
                </p>
                <Button variant="outline" className="mt-4">
                  Connect Backend
                </Button>
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default AdminDashboard;
