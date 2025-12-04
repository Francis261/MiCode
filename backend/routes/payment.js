const express = require('express');
const router = express.Router();
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const ProductOrder = require('../models/ProductOrder'); // Import the new ProductOrder model

// OxaPay API endpoint for invoice generation
const OXAPAY_INVOICE_URL = 'https://api.oxapay.com/v1/payment/invoice';

// Configure iDrive E2 S3 client
const s3Client = new S3Client({
  endpoint: process.env.IDRIVE_E2_ENDPOINT,
  region: 'us-east-1', // iDrive E2 often uses a generic region or you might need to specify based on your setup
  credentials: {
    accessKeyId: process.env.IDRIVE_E2_ACCESS_KEY_ID,
    secretAccessKey: process.env.IDRIVE_E2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true, // Required for some S3-compatible storage providers
});

// Create payment
router.post('/create', async (req, res) => {
  try {
    const { name, email, amount, products } = req.body; // 'products' array now expected

    if (!name || !email || !amount || !products || products.length === 0) {
      return res.status(400).json({ message: 'Missing required fields: name, email, amount, and products' });
    }

    const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create a pending ProductOrder in your database
    const newProductOrder = new ProductOrder({
      orderId,
      clientName: name,
      clientEmail: email,
      totalAmount: amount,
      products: products.map(p => ({
        productId: p.id, // Use the static 'id' from the frontend product
        title: p.title,
        price: p.price,
        quantity: p.quantity,
        image: p.image,
        category: p.category,
      })),
      status: 'pending',
      paymentMethod: 'OxaPay',
    });
    await newProductOrder.save();

    const paymentData = {
      amount: amount,
      currency: 'USD', // Assuming USD as default, can be dynamic
      lifeTime: 30, // 30 minutes
      feePaidByPayer: 0, // Merchant pays fee
      underPaidCoverage: 2.5, // Acceptable inaccuracy
      callbackUrl: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/payment/callback`,
      returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:8080'}/payment-success?orderId=${orderId}`,
      description: `Purchase from DevForge: ${products.map(item => item.title).join(', ')}`,
      orderId: orderId,
      email: email,
      sandbox: process.env.NODE_ENV !== 'production', // Use sandbox in development
    };

    const response = await fetch(OXAPAY_INVOICE_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'merchant_api_key': process.env.OXAPAY_MERCHANT_API_KEY, // Use the new API key
      },
      body: JSON.stringify(paymentData),
    });

    const data = await response.json();

    if (data.status === 1 && data.payLink) { // OxaPay v1 uses 'status: 1' for success
      // Update the ProductOrder with OxaPay's trackId
      newProductOrder.transactionId = data.data.track_id;
      await newProductOrder.save();

      res.json({
        success: true,
        paymentUrl: data.payLink,
        orderId: orderId,
        trackId: data.data.track_id,
      });
    } else {
      // If OxaPay invoice creation fails, mark the order as failed
      newProductOrder.status = 'failed';
      newProductOrder.adminNotes = `OxaPay invoice creation failed: ${data.message || JSON.stringify(data.error)}`;
      await newProductOrder.save();

      res.status(400).json({
        success: false,
        message: data.message || 'Failed to create payment',
        errorDetails: data.error,
      });
    }
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Payment callback (webhook from OxaPay)
router.post('/callback', async (req, res) => {
  try {
    const { status, orderId, trackId, amount } = req.body;

    console.log('Payment callback received:', { status, orderId, trackId, amount });

    // IMPORTANT: Verify the callback is from OxaPay using HMAC verification
    // This is crucial for security and preventing fake payment notifications.
    // You would typically compare a hash generated from the payload and a shared secret
    // with a signature provided in the request headers.
    // Example: const isValid = verifyOxaPaySignature(req.headers['x-oxapay-signature'], req.body);
    // if (!isValid) { return res.status(403).json({ message: 'Invalid signature' }); }
    
    const productOrder = await ProductOrder.findOne({ orderId });

    if (!productOrder) {
      console.error(`Product order with ID ${orderId} not found for callback.`);
      return res.status(404).json({ success: false, message: 'Product order not found' });
    }

    if (status === 'Paid') { // Assuming 'Paid' is the status for successful payment
      productOrder.status = 'paid';
      productOrder.transactionId = trackId; // Ensure transactionId is updated if not set during creation
      // You might want to generate a download link here if it's dynamic
      // productOrder.downloadLink = `https://yourdomain.com/downloads/${orderId}.zip`;
      await productOrder.save();
      console.log(`Product Order ${orderId} has been paid`);
    } else if (status === 'Failed' || status === 'Canceled') { // Handle other statuses
      productOrder.status = 'failed';
      productOrder.adminNotes = `Payment failed/canceled via OxaPay callback. Status: ${status}`;
      await productOrder.save();
      console.log(`Product Order ${orderId} payment ${status}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Download endpoint (protected - should verify payment)
router.get('/download/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    // In a real application, you would verify the order exists and is paid
    const productOrder = await ProductOrder.findOne({ orderId, status: 'paid' });
    if (!productOrder) {
      return res.status(403).json({ message: 'Payment not verified or order not found' });
    }

    // If a downloadLink is stored in the order, use that directly
    if (productOrder.downloadLink) {
      return res.redirect(productOrder.downloadLink);
    }

    // Fallback to generating a pre-signed URL if no specific downloadLink is stored
    // This assumes a convention like `products/{orderId}.zip` or `products/{productId}.zip`
    // For simplicity, let's assume the first product in the order determines the file.
    const firstProduct = productOrder.products[0];
    if (!firstProduct) {
      return res.status(404).json({ message: 'No product found in order to download.' });
    }

    // Example: Assuming product files are named after their static 'id'
    const s3Key = `products/${firstProduct.productId}.zip`; 
    const bucketName = process.env.IDRIVE_E2_BUCKET_NAME;

    if (!bucketName) {
      return res.status(500).json({ message: 'S3 bucket name not configured.' });
    }

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
    });

    // Generate a pre-signed URL for direct download
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL valid for 1 hour

    // Redirect the user to the signed URL to download the file
    res.redirect(signedUrl);

  } catch (error) {
    console.error('Download error:', error);
    // Check if it's a NoSuchKey error (file not found)
    if (error.name === 'NoSuchKey') {
      return res.status(404).json({ message: 'Product file not found. Please contact support.', error: error.message });
    }
    res.status(500).json({ message: 'Internal server error during download.', error: error.message });
  }
});

module.exports = router;