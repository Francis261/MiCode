import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Download, Home, Loader2, XCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { ProductOrder } from "@/types/product-order"; // Assuming ProductOrder type is available

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");

  // Fetch order status from backend
  const { data: order, isLoading, error } = useQuery<ProductOrder, Error>({
    queryKey: ["productOrder", orderId],
    queryFn: () => fetcher<ProductOrder>(`/payment/order-status/${orderId}`).then(res => res.order),
    enabled: !!orderId, // Only run query if orderId is available
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: 1000, // 1 second delay between retries
  });

  const handleDownload = () => {
    if (order?.downloadLink) {
      window.open(order.downloadLink, "_blank");
    } else {
      // This case should ideally not be hit if the backend correctly sets downloadLink
      console.error("Download link not available for this order.");
      alert("Download link not available. Please contact support.");
    }
  };

  let content;
  if (!orderId) {
    content = (
      <div className="space-y-4">
        <XCircle className="w-12 h-12 text-destructive mx-auto" />
        <h1 className="text-2xl font-display font-bold text-foreground">
          Invalid Order Link
        </h1>
        <p className="text-muted-foreground">
          The order ID is missing from the URL.
        </p>
      </div>
    );
  } else if (isLoading) {
    content = (
      <div className="space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
        <h1 className="text-2xl font-display font-bold text-foreground">
          Verifying Payment...
        </h1>
        <p className="text-muted-foreground">
          Please wait while we confirm your order.
        </p>
      </div>
    );
  } else if (error || !order) {
    content = (
      <div className="space-y-4">
        <XCircle className="w-12 h-12 text-destructive mx-auto" />
        <h1 className="text-2xl font-display font-bold text-foreground">
          Payment Not Confirmed
        </h1>
        <p className="text-muted-foreground">
          We could not confirm your payment for order ID: {orderId}.
          Please check your email for updates or contact support.
        </p>
      </div>
    );
  } else {
    // Payment is confirmed
    content = (
      <div className="space-y-6">
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="flex justify-center"
        >
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-primary" />
          </div>
        </motion.div>

        {/* Success Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-display font-bold text-foreground">
            Payment Successful!
          </h1>
          <p className="text-muted-foreground">
            Thank you for your purchase. Your order has been confirmed.
          </p>
        </div>

        {/* Order ID */}
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Order ID</p>
          <p className="font-mono text-foreground">{orderId}</p>
        </div>

        {/* Download Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={handleDownload}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2"
          >
            <Download className="w-5 h-5" />
            Download Product (.zip)
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] bg-background flex items-center justify-center py-12">
        <div className="container max-w-md mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm text-center">
              <CardContent className="pt-8 pb-8">
                {content}
                <Link to="/" className="block mt-6">
                  <Button
                    variant="outline"
                    className="w-full h-12 border-border/50 hover:bg-muted/50 gap-2"
                  >
                    <Home className="w-4 h-4" />
                    Back to Home
                  </Button>
                </Link>
                <p className="text-xs text-muted-foreground mt-4">
                  Need help? Contact our support team or use the chat feature.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default PaymentSuccess;