import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import Products from "./pages/Products";
import Cart from "./pages/Cart";
import OrderSuccess from "./pages/OrderSuccess";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import McpTestClient from "./pages/admin/McpTestClient";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import RefundPolicy from "./pages/RefundPolicy";
import Disclaimer from "./pages/Disclaimer";
import AboutUs from "./pages/AboutUs";
import NotFound from "./pages/NotFound";
import Demo from "./pages/Demo";
import DemoSingle from "./pages/DemoSingle";
import WhatsAppOrder from "./pages/WhatsAppOrder";
import UPIPayment from "./pages/UPIPayment";
import Books from "./pages/Books";
import BookOrderSuccess from "./pages/BookOrderSuccess";
import ScrollToTop from "./components/ScrollToTop";
import ChatWidget from "./components/ChatWidget";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/products" element={<Products />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/demo/:id" element={<DemoSingle />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/order-success" element={<OrderSuccess />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/refund" element={<RefundPolicy />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/order-whatsapp" element={<WhatsAppOrder />} />
            <Route path="/pay-upi" element={<UPIPayment />} />
            <Route path="/books" element={<Books />} />
            <Route path="/book-order-success" element={<BookOrderSuccess />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ChatWidget />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
