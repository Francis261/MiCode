import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FloatingButtons } from "@/components/FloatingButtons";
import Index from "./pages/Index";
import Store from "./pages/Store";
import Services from "./pages/Services";
import ServiceDetail from "./pages/ServiceDetail";
import CustomOrder from "./pages/CustomOrder";
import OrderTracking from "./pages/OrderTracking";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Chat from "./pages/Chat";
import Cart from "./pages/Cart";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentPage from "./pages/PaymentPage"; // Import the new PaymentPage
import NotFound from "./pages/NotFound";
import { CartProvider } from "@/context/CartContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CartProvider>
        <BrowserRouter>
          <FloatingButtons />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/store" element={<Store />} />
            <Route path="/services" element={<Services />} />
            <Route path="/services/:id" element={<ServiceDetail />} />
            <Route path="/custom-order" element={<CustomOrder />} />
            <Route path="/track-order" element={<OrderTracking />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/payment" element={<PaymentPage />} /> {/* New Payment Page Route */}
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;