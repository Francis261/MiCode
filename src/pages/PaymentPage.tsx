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
import * as QRCodeModule from "qrcode.react"; // Import as namespace
import { fetcher } from "@/lib/api";
import { ProductOrder } from "@/types/product-order"; // Assuming ProductOrder type is available
import { useQuery } from "@tanstack/react-query"; // Import useQuery

const QRCode = (QRCodeModule as any).default || (QRCodeModule as any).QRCode; // Access default or named export

interface CoinOption {
  name: string;
  currency: string;
  network: string;
  icon: string; // Path to icon image
}

const coinOptions: CoinOption[] = [
  { name: "USDT TRC20", currency: "USDT", network: "TRON", icon: "/assets/usdt_icon.png" },
  { name: "Bitcoin", currency: "BTC", network: "BITCOIN", icon: "/assets/bitcoin_icon.png" },
  { name: "BNB BEP20", currency: "BNB", network: "BSC", icon: "/assets/bnb_icon.png" },
  { name: "Dogecoin", currency: "DOGE", network: "DOGE", icon: "/assets/dogecoin-icon.png" },
  { name: "Tron TRC20", currency: "TRX", network: "TRON", icon: "/assets/tron_icon.png" }, // Changed currency to TRX
];

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderId, clientName, clientEmail, totalAmount, products } = location.state || {};

  const [selectedCoin, setSelectedCoin] = useState<CoinOption | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [cryptoAmount, setCryptoAmount] = useState<number | null>(null); // New state for crypto amount
  const [isGeneratingAddress, setIsGeneratingAddress] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch crypto prices using React Query
  const { data: cryptoPrices, isLoading: isLoadingPrices, error: pricesError } = useQuery<{ [key: string]: number }, Error>({
    queryKey: ["cryptoPrices"],
    queryFn: () => fetcher<{ success: boolean; prices: { [key: string]: number } }>("/payment/prices").then(res => res.prices),
    staleTime: 5 * 60 * 1000, // Prices are fresh for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep prices in cache for 10 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  useEffect(() => {
    if (!orderId || !clientEmail || !totalAmount || !products) {
      toast.error("Payment details missing. Please go through the cart again.");
      navigate("/cart");
    }
  }, [orderId, clientEmail, totalAmount, products, navigate]);

  const handleCoinSelect = async (coin: CoinOption) => {
    setSelectedCoin(coin);
    setWalletAddress(null);
    setCryptoAmount(null); // Reset crypto amount
    setError(null);
    setIsGeneratingAddress(true);

    try {
      const response = await fetcher<{
        success: boolean;
        message?: string;
        address?: string;
        network?: string;
        currency?: string;
        trackId?: string;
        cryptoAmount?: number; // Expect cryptoAmount from backend
      }>("/payment/generate-static-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          clientEmail,
          network: coin.network,
          currency: coin.currency, // Send intended currency to backend for calculation
        }),
      });

      if (response.success && response.address && response.cryptoAmount !== undefined) {
        setWalletAddress(response.address);
        setCryptoAmount(response.cryptoAmount); // Set calculated crypto amount
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
    if (!orderId) return;

    setIsCheckingPayment(true);
    setError(null);

    try {
      const response = await fetcher<{ success: boolean; order?: ProductOrder }>(
        `/payment/order-status/${orderId}`
      );

      if (response.success && response.order?.status === "paid") {
        setPaymentConfirmed(true);
        toast.success("Payment confirmed! Redirecting to success page...");
        navigate(`/payment-success?orderId=${orderId}`);
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

  if (!orderId) {
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
                    <p className="font-mono text-foreground">{orderId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Client Name</p>
                    <p className="font-medium">{clientName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Client Email</p>
                    <p className="font-medium">{clientEmail}</p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Items</p>
                    {products?.map((product: any) => (
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
                      ${totalAmount?.toFixed(2)}
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
                        disabled={isGeneratingAddress || isCheckingPayment || isLoadingPrices}
                        className="flex flex-col h-auto py-4 px-2 items-center justify-center text-center"
                      >
                        <img src={coin.icon} alt={coin.name} className="w-8 h-8 mb-2" />
                        <span className="text-sm font-medium">{coin.name}</span>
                        {isLoadingPrices && <Loader2 className="h-4 w-4 animate-spin mt-1" />}
                        {pricesError && <span className="text-destructive text-xs mt-1">Error</span>}
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
                          <div className="flex justify-center p-4 bg-white rounded-md">
                            <QRCode value={walletAddress} size={180} level="H" />
                          </div>
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