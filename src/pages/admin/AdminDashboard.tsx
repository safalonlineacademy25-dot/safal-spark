import { useEffect, useState, useMemo, useCallback } from 'react';
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
  Mail,
  Settings,
  LogOut,
  BookOpen,
  TrendingUp,
  IndianRupee,
  Download,
  Eye,
  Search,
  Loader2,
  FileDown,
  CreditCard,
  AlertTriangle,
  RefreshCw,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, signOut } from '@/hooks/useAuth';
import { useProducts, prefetchProducts } from '@/hooks/useProducts';
import { useOrders, prefetchOrders } from '@/hooks/useOrders';
import { useCustomers, prefetchCustomers } from '@/hooks/useCustomers';
import AddProductDialog from '@/components/admin/AddProductDialog';
import EditProductDialog from '@/components/admin/EditProductDialog';
import DeleteProductDialog from '@/components/admin/DeleteProductDialog';
import OrderDetailsDialog from '@/components/admin/OrderDetailsDialog';
import ProductQRCodeDialog from '@/components/admin/ProductQRCodeDialog';
import DBSnapshotTab from '@/components/admin/DBSnapshotTab';
import PaginationControls from '@/components/admin/PaginationControls';
import { usePagination } from '@/hooks/usePagination';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Determine which data needs to be fetched based on active tab
  const needsProducts = activeTab === 'dashboard' || activeTab === 'products';
  const needsOrders = activeTab === 'dashboard' || activeTab === 'orders' || activeTab === 'payments' || activeTab === 'email' || activeTab === 'whatsapp';
  const needsCustomers = activeTab === 'customers';
  
  // Only fetch data when the relevant tab is active - improves initial load performance
  const { data: products, isLoading: productsLoading } = useProducts({ enabled: needsProducts });
  const { data: orders, isLoading: ordersLoading, refetch: refetchOrders } = useOrders({ enabled: needsOrders });
  const { data: customers, isLoading: customersLoading } = useCustomers({ enabled: needsCustomers });
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  const [resendingWhatsApp, setResendingWhatsApp] = useState<string | null>(null);

  // Prefetch data on tab hover for instant tab switching
  const handleTabHover = useCallback((tabId: string) => {
    switch (tabId) {
      case 'dashboard':
        prefetchProducts(queryClient);
        prefetchOrders(queryClient);
        break;
      case 'products':
        prefetchProducts(queryClient);
        break;
      case 'orders':
      case 'payments':
      case 'email':
      case 'whatsapp':
        prefetchOrders(queryClient);
        break;
      case 'customers':
        prefetchCustomers(queryClient);
        break;
    }
  }, [queryClient]);

  // Filtered data for specific tabs
  const failedPayments = useMemo(() => 
    orders?.filter(o => o.status === 'pending' || o.status === 'failed') || [],
    [orders]
  );
  const whatsappLogs = useMemo(() => 
    orders?.filter(o => o.whatsapp_optin && o.status === 'paid') || [],
    [orders]
  );
  const emailLogs = useMemo(() => 
    orders?.filter(o => o.status === 'paid') || [],
    [orders]
  );

  // Pagination for each tab
  const productsPagination = usePagination({ data: products, itemsPerPage: 15 });
  const ordersPagination = usePagination({ data: orders, itemsPerPage: 15 });
  const customersPagination = usePagination({ data: customers, itemsPerPage: 15 });
  const paymentsPagination = usePagination({ data: failedPayments, itemsPerPage: 15 });
  const whatsappPagination = usePagination({ data: whatsappLogs, itemsPerPage: 15 });
  const emailPagination = usePagination({ data: emailLogs, itemsPerPage: 15 });

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
    { id: 'payments', label: 'Failed Payments', icon: CreditCard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'email', label: 'Email Logs', icon: Mail },
    { id: 'whatsapp', label: 'WhatsApp Logs', icon: MessageCircle },
    { id: 'dbsnapshot', label: 'DB Snapshot', icon: Database },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Calculate real stats from database
  const totalRevenue = orders?.filter(o => o.status === 'paid' || o.status === 'completed')
    .reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
  const totalOrders = orders?.length || 0;
  const totalDownloads = products?.reduce((sum, p) => sum + (p.download_count || 0), 0) || 0;
  const uniqueCustomers = orders ? new Set(orders.map(o => o.customer_email)).size : 0;

  const stats = [
    { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: IndianRupee, color: 'text-secondary' },
    { label: 'Total Orders', value: totalOrders.toString(), icon: ShoppingCart, color: 'text-primary' },
    { label: 'Downloads', value: totalDownloads.toLocaleString(), icon: Download, color: 'text-secondary' },
    { label: 'Customers', value: uniqueCustomers.toString(), icon: Users, color: 'text-primary' },
  ];

  // Get recent orders from actual data
  const recentOrders = orders?.slice(0, 5) || [];

  const exportCustomersToCSV = () => {
    if (!customers || customers.length === 0) {
      toast.error('No customers to export');
      return;
    }
    
    const headers = ['Name', 'Email', 'Phone', 'WhatsApp Opt-in', 'Joined Date'];
    const csvRows = [
      headers.join(','),
      ...customers.map(customer => [
        `"${customer.name || 'N/A'}"`,
        `"${customer.email}"`,
        `"${customer.phone}"`,
        customer.whatsapp_optin ? 'Yes' : 'No',
        customer.created_at ? format(new Date(customer.created_at), 'yyyy-MM-dd') : 'N/A'
      ].join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customers-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Customers exported successfully');
  };

  // Helper to get or create download tokens for an order
  const getOrCreateDownloadTokens = async (orderId: string) => {
    // First try to get existing tokens
    const { data: existingTokens, error: tokensError } = await supabase
      .from('download_tokens')
      .select('token, product_id, products:product_id(name)')
      .eq('order_id', orderId);

    if (tokensError) throw tokensError;

    // If tokens exist, return them
    if (existingTokens && existingTokens.length > 0) {
      return existingTokens.map((t: any) => ({
        name: t.products?.name || 'Product',
        downloadToken: t.token,
      }));
    }

    // No tokens exist - create them from order_items
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('product_id, product_name')
      .eq('order_id', orderId);

    if (itemsError) throw itemsError;

    if (!orderItems || orderItems.length === 0) {
      throw new Error('No products found for this order');
    }

    // Create download tokens for each product
    const newTokens = [];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    for (const item of orderItems) {
      if (!item.product_id) continue;
      
      const token = crypto.randomUUID();
      const { error: insertError } = await supabase
        .from('download_tokens')
        .insert({
          order_id: orderId,
          product_id: item.product_id,
          token,
          expires_at: expiresAt.toISOString(),
          download_count: 0,
        });

      if (insertError) throw insertError;

      newTokens.push({
        name: item.product_name,
        downloadToken: token,
      });
    }

    if (newTokens.length === 0) {
      throw new Error('No valid products to create download tokens for');
    }

    return newTokens;
  };

  // Resend email delivery
  const handleResendEmail = async (orderId: string) => {
    setResendingEmail(orderId);
    try {
      const order = orders?.find(o => o.id === orderId);
      if (!order) throw new Error('Order not found');

      const products = await getOrCreateDownloadTokens(orderId);

      const { data, error } = await supabase.functions.invoke('send-download-email', {
        body: {
          orderId,
          customerEmail: order.customer_email,
          customerName: order.customer_name,
          products,
        },
      });

      if (error) throw error;

      toast.success('Email resent successfully', {
        description: `Download link sent to ${order.customer_email}`,
      });
      refetchOrders();
    } catch (error: any) {
      console.error('Resend email error:', error);
      toast.error('Failed to resend email', {
        description: error.message || 'Please try again',
      });
    } finally {
      setResendingEmail(null);
    }
  };

  // Resend WhatsApp delivery
  const handleResendWhatsApp = async (orderId: string) => {
    setResendingWhatsApp(orderId);
    try {
      const order = orders?.find(o => o.id === orderId);
      if (!order) throw new Error('Order not found');

      const products = await getOrCreateDownloadTokens(orderId);

      const { data, error } = await supabase.functions.invoke('send-whatsapp-download', {
        body: {
          orderId,
          customerPhone: order.customer_phone,
          customerName: order.customer_name,
          products,
        },
      });

      if (error) throw error;

      toast.success('WhatsApp message resent successfully', {
        description: `Download link sent to ${order.customer_phone}`,
      });
      refetchOrders();
    } catch (error: any) {
      console.error('Resend WhatsApp error:', error);
      toast.error('Failed to resend WhatsApp message', {
        description: error.message || 'Please try again',
      });
    } finally {
      setResendingWhatsApp(null);
    }
  };

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
                onMouseEnter={() => handleTabHover(item.id)}
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
                    <>
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
                          {productsPagination.paginatedData.map((product) => (
                            <tr key={product.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg">
                                    {product.category === 'notes' && '📚'}
                                    {product.category === 'mock-papers' && '📝'}
                                    {product.category === 'pune-university' && '🎓'}
                                    {product.category === 'engineering' && '⚙️'}
                                    {product.category === 'iit' && '🏛️'}
                                    {product.category === 'others' && '📦'}
                                  </div>
                                  <span className="font-medium text-foreground">{product.name}</span>
                                </div>
                              </td>
                              <td className="p-4 text-sm text-muted-foreground capitalize">{product.category}</td>
                              <td className="p-4 text-sm font-medium price-text">₹{product.price}</td>
                              <td className="p-4 text-sm text-muted-foreground">{product.download_count?.toLocaleString() || 0}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <ProductQRCodeDialog productId={product.id} productName={product.name} />
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
                      <PaginationControls
                        currentPage={productsPagination.currentPage}
                        totalPages={productsPagination.totalPages}
                        startIndex={productsPagination.startIndex}
                        endIndex={productsPagination.endIndex}
                        totalItems={productsPagination.totalItems}
                        onPrevPage={productsPagination.prevPage}
                        onNextPage={productsPagination.nextPage}
                        onGoToPage={productsPagination.goToPage}
                      />
                    </>
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
                          {ordersPagination.paginatedData.map((order) => (
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
                      <PaginationControls
                        currentPage={ordersPagination.currentPage}
                        totalPages={ordersPagination.totalPages}
                        startIndex={ordersPagination.startIndex}
                        endIndex={ordersPagination.endIndex}
                        totalItems={ordersPagination.totalItems}
                        onPrevPage={ordersPagination.prevPage}
                        onNextPage={ordersPagination.nextPage}
                        onGoToPage={ordersPagination.goToPage}
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'customers' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">All Customers</h2>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {customers?.length || 0} total customers
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportCustomersToCSV}
                      disabled={!customers || customers.length === 0}
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>

                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  {customersLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : !customers || customers.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No customers found yet. Customers will appear here after placing orders.
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border bg-muted/30">
                              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Customer</th>
                              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Email</th>
                              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Phone</th>
                              <th className="text-left p-4 text-sm font-medium text-muted-foreground">WhatsApp Opt-in</th>
                              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Joined</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customersPagination.paginatedData.map((customer) => (
                              <tr key={customer.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                      <Users className="h-5 w-5 text-primary" />
                                    </div>
                                    <span className="font-medium text-foreground">{customer.name || 'N/A'}</span>
                                  </div>
                                </td>
                                <td className="p-4 text-sm text-foreground">{customer.email}</td>
                                <td className="p-4 text-sm text-muted-foreground">{customer.phone}</td>
                                <td className="p-4">
                                  <span
                                    className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                                      customer.whatsapp_optin
                                        ? 'bg-secondary/10 text-secondary'
                                        : 'bg-muted text-muted-foreground'
                                    }`}
                                  >
                                    {customer.whatsapp_optin ? 'Yes' : 'No'}
                                  </span>
                                </td>
                                <td className="p-4 text-sm text-muted-foreground">
                                  {customer.created_at ? format(new Date(customer.created_at), 'MMM d, yyyy') : 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <PaginationControls
                        currentPage={customersPagination.currentPage}
                        totalPages={customersPagination.totalPages}
                        startIndex={customersPagination.startIndex}
                        endIndex={customersPagination.endIndex}
                        totalItems={customersPagination.totalItems}
                        onPrevPage={customersPagination.prevPage}
                        onNextPage={customersPagination.nextPage}
                        onGoToPage={customersPagination.goToPage}
                      />
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'payments' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Failed Payment Logs</h2>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {orders?.filter(o => o.status === 'pending' || o.status === 'failed').length || 0} unsuccessful payments
                    </span>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-card rounded-xl border border-border p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-yellow-500/10">
                        <CreditCard className="h-5 w-5 text-yellow-600" />
                      </div>
                      <span className="text-sm text-muted-foreground">Pending</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {orders?.filter(o => o.status === 'pending').length || 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Payment not completed</p>
                  </div>
                  <div className="bg-card rounded-xl border border-border p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-destructive/10">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      </div>
                      <span className="text-sm text-muted-foreground">Failed</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {orders?.filter(o => o.status === 'failed').length || 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Payment rejected or error</p>
                  </div>
                </div>

                <div className="bg-card rounded-xl border border-destructive/20 overflow-hidden">
                  <div className="p-4 border-b border-border bg-destructive/5 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <h3 className="font-medium text-foreground">Unsuccessful Transactions</h3>
                  </div>
                  {ordersLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : !orders || orders.filter(o => o.status === 'pending' || o.status === 'failed').length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary/10 flex items-center justify-center">
                        <CreditCard className="h-8 w-8 text-secondary" />
                      </div>
                      <p className="font-medium text-foreground mb-1">No failed payments</p>
                      <p className="text-sm">All payment transactions are successful! 🎉</p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Order #</th>
                              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Customer</th>
                              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Amount</th>
                              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Razorpay Order ID</th>
                              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Payment ID</th>
                              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paymentsPagination.paginatedData.map((order) => (
                              <tr 
                                key={order.id} 
                                className={`border-b border-border last:border-0 hover:bg-muted/30 ${
                                  order.status === 'failed' ? 'bg-destructive/5' : 'bg-yellow-500/5'
                                }`}
                              >
                                <td className="p-4 text-sm font-medium text-foreground font-mono">
                                  {order.order_number}
                                </td>
                                <td className="p-4">
                                  <div className="text-sm text-foreground">{order.customer_email}</div>
                                  <div className="text-xs text-muted-foreground">{order.customer_phone}</div>
                                </td>
                                <td className="p-4 text-sm font-medium price-text">₹{order.total_amount}</td>
                                <td className="p-4">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                                      order.status === 'pending'
                                        ? 'bg-yellow-500/10 text-yellow-600'
                                        : 'bg-destructive/10 text-destructive'
                                    }`}
                                  >
                                    <AlertTriangle className="h-3 w-3" />
                                    {order.status}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <code className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                                    {order.razorpay_order_id || 'N/A'}
                                  </code>
                                </td>
                                <td className="p-4">
                                  {order.razorpay_payment_id ? (
                                    <code className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                                      {order.razorpay_payment_id}
                                    </code>
                                  ) : (
                                    <span className="text-xs text-destructive italic">Not received</span>
                                  )}
                                </td>
                                <td className="p-4 text-sm text-muted-foreground">
                                  {order.created_at ? format(new Date(order.created_at), 'MMM d, yyyy h:mm a') : 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <PaginationControls
                        currentPage={paymentsPagination.currentPage}
                        totalPages={paymentsPagination.totalPages}
                        startIndex={paymentsPagination.startIndex}
                        endIndex={paymentsPagination.endIndex}
                        totalItems={paymentsPagination.totalItems}
                        onPrevPage={paymentsPagination.prevPage}
                        onNextPage={paymentsPagination.nextPage}
                        onGoToPage={paymentsPagination.goToPage}
                      />
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'whatsapp' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">WhatsApp Delivery Logs</h2>
                  <div className="text-sm text-muted-foreground">
                    {orders?.filter(o => o.whatsapp_optin).length || 0} WhatsApp opt-ins
                  </div>
                </div>

                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  {ordersLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : whatsappLogs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No WhatsApp deliveries yet. Messages will appear here after paid orders with WhatsApp opt-in.
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border bg-muted/30">
                              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Order #</th>
                              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Phone</th>
                              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Customer</th>
                              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Delivery Status</th>
                              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {whatsappPagination.paginatedData.map((order) => (
                              <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                                <td className="p-4 text-sm font-medium text-foreground font-mono">{order.order_number}</td>
                                <td className="p-4">
                                  <div className="flex items-center gap-2">
                                    <MessageCircle className="h-4 w-4 text-green-500" />
                                    <span className="text-sm text-foreground">{order.customer_phone}</span>
                                  </div>
                                </td>
                                <td className="p-4 text-sm text-muted-foreground">{order.customer_name || order.customer_email}</td>
                                <td className="p-4">
                                  <span
                                    className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                                      order.delivery_status === 'sent'
                                        ? 'bg-secondary/10 text-secondary'
                                        : order.delivery_status === 'failed'
                                        ? 'bg-destructive/10 text-destructive'
                                        : 'bg-yellow-500/10 text-yellow-600'
                                    }`}
                                  >
                                    {order.delivery_status || 'pending'}
                                  </span>
                                </td>
                                <td className="p-4 text-sm text-muted-foreground">
                                  {order.created_at ? format(new Date(order.created_at), 'MMM d, h:mm a') : 'N/A'}
                                </td>
                                <td className="p-4">
                                  {(order.delivery_status === 'failed' || order.delivery_status === 'pending') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleResendWhatsApp(order.id)}
                                      disabled={resendingWhatsApp === order.id}
                                      className="gap-1.5"
                                    >
                                      {resendingWhatsApp === order.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <RefreshCw className="h-3.5 w-3.5" />
                                      )}
                                      Resend
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <PaginationControls
                        currentPage={whatsappPagination.currentPage}
                        totalPages={whatsappPagination.totalPages}
                        startIndex={whatsappPagination.startIndex}
                        endIndex={whatsappPagination.endIndex}
                        totalItems={whatsappPagination.totalItems}
                        onPrevPage={whatsappPagination.prevPage}
                        onNextPage={whatsappPagination.nextPage}
                        onGoToPage={whatsappPagination.goToPage}
                      />
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'email' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Email Delivery Logs</h2>
                  <div className="text-sm text-muted-foreground">
                    {emailLogs.length} emails sent
                  </div>
                </div>

                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  {ordersLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : emailLogs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No email deliveries yet. Emails will appear here after paid orders.
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border bg-muted/30">
                              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Order #</th>
                              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Email</th>
                              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Customer</th>
                              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Delivery Status</th>
                              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {emailPagination.paginatedData.map((order) => (
                              <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                                <td className="p-4 text-sm font-medium text-foreground font-mono">{order.order_number}</td>
                                <td className="p-4">
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-primary" />
                                    <span className="text-sm text-foreground">{order.customer_email}</span>
                                  </div>
                                </td>
                                <td className="p-4 text-sm text-muted-foreground">{order.customer_name || order.customer_phone}</td>
                                <td className="p-4">
                                  <span
                                    className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                                      order.delivery_status === 'sent'
                                        ? 'bg-secondary/10 text-secondary'
                                        : order.delivery_status === 'failed'
                                        ? 'bg-destructive/10 text-destructive'
                                        : 'bg-yellow-500/10 text-yellow-600'
                                    }`}
                                  >
                                    {order.delivery_status || 'pending'}
                                  </span>
                                </td>
                                <td className="p-4 text-sm text-muted-foreground">
                                  {order.created_at ? format(new Date(order.created_at), 'MMM d, h:mm a') : 'N/A'}
                                </td>
                                <td className="p-4">
                                  {(order.delivery_status === 'failed' || order.delivery_status === 'pending') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleResendEmail(order.id)}
                                      disabled={resendingEmail === order.id}
                                      className="gap-1.5"
                                    >
                                      {resendingEmail === order.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <RefreshCw className="h-3.5 w-3.5" />
                                      )}
                                      Resend
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <PaginationControls
                        currentPage={emailPagination.currentPage}
                        totalPages={emailPagination.totalPages}
                        startIndex={emailPagination.startIndex}
                        endIndex={emailPagination.endIndex}
                        totalItems={emailPagination.totalItems}
                        onPrevPage={emailPagination.prevPage}
                        onNextPage={emailPagination.nextPage}
                        onGoToPage={emailPagination.goToPage}
                      />
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'dbsnapshot' && (
              <DBSnapshotTab isActive={activeTab === 'dbsnapshot'} />
            )}

            {activeTab === 'settings' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16"
              >
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Settings className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Settings</h3>
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
