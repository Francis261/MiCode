import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, CreditCard, ArrowLeft, MinusCircle, PlusCircle, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom"; // Import useNavigate
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";

const Cart = () => {
  const { cartItems, removeItemFromCart, addItemToCart, clearCart, cartTotal } = useCart();
  const [isLoading, setIsLoading] = useState(false); // Keep for potential future use or other loading states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const navigate = useNavigate(); // Initialize useNavigate

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();

    if (cartItems.length === 0) {
      toast.error("Your cart is empty. Please add items before checking out.");
      return;
    }

    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Navigate to the new PaymentPage, passing cart details as state
    navigate("/payment", {
      state: {
        orderId: `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`, // Generate a temporary order ID here
        clientName: formData.name,
        clientEmail: formData.email,
        totalAmount: cartTotal,
        products: cartItems,
      },
    });
    // Note: The cart is cleared on successful payment confirmation on the PaymentSuccess page, not here.
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] bg-background py-8">
        <div className="container max-w-4xl mx-auto px-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-display font-bold mb-8 flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-primary" />
              Your Cart
            </h1>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Cart Items */}
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Your Items</CardTitle>
                  {cartItems.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive/80">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear Cart
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {cartItems.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Your cart is empty.</p>
                  ) : (
                    <div className="space-y-4">
                      {cartItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between border-b border-border pb-4 last:border-b-0 last:pb-0">
                          <div className="flex items-center gap-4">
                            <img src={item.image} alt={item.title} className="w-16 h-16 object-cover rounded-md" />
                            <div>
                              <h3 className="font-medium">{item.title}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItemFromCart(item.id)}>
                                  <MinusCircle className="h-4 w-4" />
                                </Button>
                                <span className="text-sm font-medium">{item.quantity}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => addItemToCart(item)}>
                                  <PlusCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          <span className="font-semibold text-primary">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-2 border-t border-border">
                        <span className="text-lg font-semibold">Total</span>
                        <span className="text-2xl font-bold text-primary">
                          ${cartTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Checkout Form */}
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Your Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProceedToPayment} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="bg-muted/50 border-border/50"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="bg-muted/50 border-border/50"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                      disabled={cartItems.length === 0}
                    >
                      Proceed to Payment
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      Secure payment powered by OxaPay
                    </p>
                  </form>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default Cart;