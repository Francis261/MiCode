import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Copy, Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
// Removed: import QRCode from "qrcode.react"; // No longer needed
import { fetcher } from "@/lib/api";
import { ProductOrder } from "@/types/product-order";
import { useQuery } from "@tanstack/react-query"; // Still needed for order status check

interface CoinOption {
  name: string;
  currency: string;
  network: string;
  icon: string; // Path to icon image
}

const coinOptions: CoinOption[] = [
  { name: "USDT TRC20", currency: "USDT", network: "TRC20", icon: "/assets/usdt_icon.png" }, // Corrected network to TRC20
  { name: "Bitcoin", currency: "BTC", network: "BITCOIN", icon: "/assets/bitcoin_icon.png" },
  { name: "BNB BEP20", currency: "BNB", network: "BEP20", icon: "/assets/bnb_icon.png" },
  { name: "Dogecoin", currency: "DOGE", network: "DOGE", icon: "/assets/dogecoin-icon.png" },
  { name: "Tron TRC20", currency: "TRX", network: "TRC20", icon: "/assets/tron_icon.png" },
];

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Use useState to hold the values from location.state for stability
  const [currentOrderId, setCurrentOrderId] = useState<string | undefined>(location.state?.orderId);
  const [currentClientName, setCurrentClientName] = useState<string | undefined>(location.state?.clientName);
  const [currentClientEmail, setCurrentClientEmail] = useState<string | undefined>(location.state?.clientEmail);
  const [currentTotalAmount, setCurrentTotalAmount] = useState<number | undefined>(location.state?.totalAmount);
  const [currentProducts, setCurrentProducts] = useState<any[] | undefined>(location.state?.products);

  const [selectedCoin, setSelectedCoin] = useState<CoinOption | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [cryptoAmount, setCryptoAmount] = useState<number | null>(null);
  const [qrCodeImageUrl, setQrCodeImageUrl] = useState<string | null>(null); // State for QR code image URL from backend
  const [isGeneratingAddress, setIsGeneratingAddress] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Effect to handle missing payment details and redirect
  useEffect(() => {
    if (!currentOrderId || !currentClientEmail || !currentTotalAmount || !currentProducts) {
      toast.error("Payment details missing. Please go through the cart again.");
      navigate("/cart");
    }
  }, [currentOrderId, currentClientEmail, currentTotalAmount, currentProducts, navigate]);

  // Removed: useQuery for cryptoPrices as it's no longer needed.
  // The backend's generate-static-address endpoint now handles the crypto amount calculation.

  const handleCoinSelect = async (coin: CoinOption) => {
    // Ensure we have the order details before proceeding
    if (!currentOrderId || !currentClientEmail) {
      toast.error("Order details are missing. Please refresh the page or go back to cart.");
      return;
    }

    setSelectedCoin(coin);
    setWalletAddress(null);
    setCryptoAmount(null);
    setQrCodeImageUrl(null); // Reset QR code image URL
    setError(null);
    setIsGeneratingAddress(true);

    console.log("Attempting to generate address with:", {
      orderId: currentOrderId,
      clientEmail: currentClientEmail,
      network: coin.network,
      currency: coin.currency,
    });

    try {
      const response = await fetcher<{
        success: boolean;
        message?: string;
        address?: string;
        network?: string;
        currency?: string;
        trackId?: string;
        cryptoAmount?: number;
        qrCodeUrl?: string; // Expect qrCodeUrl from backend
      }>("/payment/generate-static-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: currentOrderId,
          clientEmail: currentClientEmail,
          network: coin.network,
          currency: coin.currency,
        }),
      });

      if (response.success && response.address && response.cryptoAmount !== undefined) {
        setWalletAddress(response.address);
        setCryptoAmount(response.cryptoAmount);
        setQrCodeImageUrl(response.qrCodeUrl || null); // Set QR code image URL from backend
        toast.success(`Static address generated for ${coin.name}`);
      } else {
        setError(response.message || "Failed to generate wallet address.");
        toast.error(response.message || "Failed to generate wallet address.");
      }
    } catch (err) {
      console.error("Error generating address:", err);
      setError("Failed to connect to payment service. Please try again.");
      toast.error("Failed to connect to payment service. Please try again.");
    } finally {
      setIsGeneratingAddress(false);
    }
  };

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      toast.success("Wallet address copied to clipboard!");
    }
  };

  const handleCheckPayment = async () => {
    if (!currentOrderId) return;

    setIsCheckingPayment(true);
    setError(null);

    try {
      const response = await fetcher<{ success: boolean; order?: ProductOrder }>(
        `/payment/order-status/${currentOrderId}`
      );

      if (response.success && response.order?.status === "paid") {
        setPaymentConfirmed(true);
        toast.success("Payment confirmed! Redirecting to success page...");
        navigate(`/payment-success?orderId=${currentOrderId}`);
      } else {
        setError("Payment not yet confirmed. Please wait a moment and try again.");
        toast.warning("Payment not yet confirmed. Please wait a moment and try again.");
      }
    } catch (err) {
      console.error("Error checking payment status:", err);
      setError("Failed to check payment status. Please try again.");
      toast.error("Failed to check payment status. Please try again.");
    } finally {
      setIsCheckingPayment(false);
    }
  };

  if (!currentOrderId) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-8 pb-8">
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h1 className="text-2xl font-display font-bold text-foreground">
                Missing Order Information
              </h1>
              <p className="text-muted-foreground mt-2">
                Please start a new order from the cart page.
              </p>
              <Link to="/cart" className="block mt-6">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Go to Cart
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] bg-background py-8">
        <div className="container max-w-4xl mx-auto px-4">
          <Link
            to="/cart"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Cart
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-display font-bold mb-8 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-primary" />
              Complete Your Payment
            </h1>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Order Summary */}
              <Card className="md:col-span-1 border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Order ID</p>
                    <p className="font-mono text-foreground">{currentOrderId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Client Name</p>
                    <p className="font-medium">{currentClientName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Client Email</p>
                    <p className="font-medium">{currentClientEmail}</p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Items</p>
                    {currentProducts?.map((product: any) => (
                      <div key={product.id} className="flex justify-between text-sm">
                        <span>{product.title} (x{product.quantity})</span>
                        <span>${(product.price * product.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Amount</span>
                    <span className="text-2xl font-bold text-primary">
                      ${currentTotalAmount?.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method & Details */}
              <Card className="md:col-span-2 border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Select Cryptocurrency</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Coin Selection */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {coinOptions.map((coin) => (
                      <Button
                        key={coin.currency + coin.network}
                        variant={selectedCoin?.currency === coin.currency && selectedCoin?.network === coin.network ? "default" : "outline"}
                        onClick={() => handleCoinSelect(coin)}
                        disabled={isGeneratingAddress || isCheckingPayment}
                        className="flex flex-col h-auto py-4 px-2 items-center justify-center text-center"
                      >
                        <img src={coin.icon} alt={coin.name} className="w-8 h-8 mb-2" />
                        <span className="text-sm font-medium">{coin.name}</span>
                      </Button>
                    ))}
                  </div>

                  {/* Wallet Address & QR Code */}
                  {selectedCoin && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4 p-4 border border-border rounded-lg bg-background"
                    >
                      <h3 className="font-semibold text-lg">
                        Deposit {selectedCoin.currency} ({selectedCoin.network})
                      </h3>
                      {isGeneratingAddress ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                          Generating address...
                        </div>
                      ) : walletAddress && cryptoAmount !== null ? (
                        <div className="space-y-4">
                          {qrCodeImageUrl && ( // Only render img if qrCodeImageUrl is available
                            <div className="flex justify-center p-4 bg-white rounded-md">
                              <img src={qrCodeImageUrl} alt="QR Code" className="w-[180px] h-[180px]" />
                            </div>
                          )}
                          <div>
                            <Label htmlFor="wallet-address">Wallet Address</Label>
                            <div className="flex gap-2 mt-1">
                              <Input
                                id="wallet-address"
                                value={walletAddress}
                                readOnly
                                className="flex-1 bg-muted/50"
                              />
                              <Button variant="outline" size="icon" onClick={handleCopyAddress}>
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-yellow-500 bg-yellow-500/10 p-3 rounded-md">
                            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                            <span>
                              **IMPORTANT:** Only send **{cryptoAmount.toFixed(8)} {selectedCoin.currency}** on the **{selectedCoin.network}** network.
                              Sending any other coin or using a different network will result in loss of funds.
                            </span>
                          </div>
                        </div>
                      ) : (
                        error && (
                          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                            <span>{error}</span>
                          </div>
                        )
                      )}
                    </motion.div>
                  )}

                  {/* Check Payment Button */}
                  {walletAddress && (
                    <Button
                      onClick={handleCheckPayment}
                      disabled={isCheckingPayment || paymentConfirmed}
                      className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    >
                      {isCheckingPayment ? (
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-5 w-5 mr-2" />
                      )}
                      {isCheckingPayment ? "Checking Payment..." : "I Have Paid"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}