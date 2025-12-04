import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Download, Home } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId") || "N/A";

  const handleDownload = () => {
    // The backend /api/payment/download/:orderId endpoint will now look up the ProductOrder
    // and either use a stored downloadLink or generate a pre-signed URL based on product details.
    const downloadUrl = `/api/payment/download/${orderId}`;
    window.open(downloadUrl, "_blank");
  };

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
              <CardContent className="pt-8 pb-8 space-y-6">
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

                {/* Back to Home */}
                <Link to="/">
                  <Button
                    variant="outline"
                    className="w-full h-12 border-border/50 hover:bg-muted/50 gap-2"
                  >
                    <Home className="w-4 h-4" />
                    Back to Home
                  </Button>
                </Link>

                {/* Support Note */}
                <p className="text-xs text-muted-foreground">
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