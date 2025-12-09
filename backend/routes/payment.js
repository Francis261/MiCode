const express = require('express');
const router = express.Router();
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const ProductOrder = require('../models/ProductOrder');

// OxaPay API endpoint for static address generation
const OXAPAY_STATIC_ADDRESS_URL = 'https://api.oxapay.com/v1/payment/static-address';

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

// NEW: Endpoint to create a ProductOrder in the database
router.post('/create-product-order', async (req, res) => {
  try {
    const { clientName, clientEmail, totalAmount, products } = req.body;

    if (!clientName || !clientEmail || !totalAmount || !products || products.length === 0) {
      return res.status(400).json({ message: 'Missing required fields: clientName, clientEmail, totalAmount, and products' });
    }

    const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const newProductOrder = new ProductOrder({
      orderId,
      clientName,
      clientEmail,
      totalAmount,
      products: products.map(p => ({
        productId: p.id,
        title: p.title,
        price: p.price,
        quantity: p.quantity,
        image: p.image,
        category: p.category,
      })),
      status: 'pending',
      paymentMethod: 'OxaPay', // Default payment method
    });
    await newProductOrder.save();

    res.status(201).json({
      success: true,
      message: 'Product order created successfully.',
      orderId: newProductOrder.orderId,
      _id: newProductOrder._id, // Return MongoDB _id as well
    });

  } catch (error) {
    console.error('Error creating product order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// New endpoint to generate a static wallet address
router.post('/generate-static-address', async (req, res) => {
  try {
    const { orderId, clientEmail, network, to_currency } = req.body; // Keep to_currency in req.body for now

    if (!orderId || !clientEmail || !network) { // Removed to_currency from required fields for the API call
      return res.status(400).json({ message: 'Missing required fields: orderId, clientEmail, and network' });
    }

    let productOrder = await ProductOrder.findOne({ orderId });

    if (!productOrder) {
      return res.status(404).json({ message: 'Product order not found.' });
    }

    // Check if a static address for this currency/network already exists for this order
    if (productOrder.staticWalletAddress && productOrder.paymentNetwork === network && productOrder.paymentCurrency === to_currency) {
      return res.json({
        success: true,
        message: 'Existing static address retrieved.',
        address: productOrder.staticWalletAddress,
        network: productOrder.paymentNetwork,
        currency: productOrder.paymentCurrency,
        trackId: productOrder.transactionId,
        qrCodeUrl: productOrder.qrCodeUrl, // Return existing QR code URL if available
      });
    }

    const callbackUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/payment/callback`;

    const paymentData = {
      network: network,
      // Removed to_currency from here to prevent 'invalid_to_currency' error
      auto_withdrawal: 0, // 0 indicates amount will be credited to OxaPay balance
      callback_url: callbackUrl,
      email: clientEmail,
      order_id: orderId,
      description: `Payment for DevGorge Order: ${orderId}`,
    };

    const response = await fetch(OXAPAY_STATIC_ADDRESS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'merchant_api_key': process.env.OXAPAY_MERCHANT_API_KEY,
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OxaPay Static Address API raw error response:', errorText);
      throw new Error(`OxaPay API returned non-OK status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.status === 200 && data.data && data.data.address) {
      productOrder.staticWalletAddress = data.data.address;
      productOrder.paymentNetwork = data.data.network;
      productOrder.paymentCurrency = data.data.to_currency; // OxaPay will return the actual currency it generated the address for
      productOrder.transactionId = data.data.track_id; // OxaPay's track_id for static address
      // OxaPay doesn't return a QR code URL directly, frontend will generate it.
      // productOrder.qrCodeUrl = data.data.qr_code_url; // If OxaPay ever adds this

      await productOrder.save();

      res.json({
        success: true,
        message: 'Static address generated successfully!',
        address: data.data.address,
        network: data.data.network,
        currency: data.data.to_currency, // Use the currency returned by OxaPay
        trackId: data.data.track_id,
        // qrCodeUrl: data.data.qr_code_url, // If OxaPay ever adds this
      });
    } else {
      productOrder.adminNotes = `OxaPay static address generation failed: ${data.message || JSON.stringify(data.error || data)}`;
      await productOrder.save(); // Save notes even if failed

      res.status(400).json({
        success: false,
        message: data.message || 'Failed to generate static address',
        errorDetails: data.error || data,
      });
    }
  } catch (error) {
    console.error('Generate static address error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Payment callback (webhook from OxaPay) - Updated to handle static address payments
router.post('/callback', async (req, res) => {
  try {
    const { status, orderId, trackId, amount, to_currency, network } = req.body; // Added to_currency, network

    console.log('Payment callback received:', { status, orderId, trackId, amount, to_currency, network });

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

    // For static addresses, the trackId from the callback should match the one stored
    if (productOrder.transactionId !== trackId) {
      console.warn(`Callback trackId mismatch for order ${orderId}. Expected ${productOrder.transactionId}, got ${trackId}`);
      // This might indicate a different payment or a security issue. Handle accordingly.
      // For now, we'll proceed but log the warning.
    }

    if (status === 'Paid') {
      productOrder.status = 'paid';
      // Ensure transactionId, paymentNetwork, paymentCurrency are updated if not set during generation
      productOrder.transactionId = trackId;
      productOrder.paymentNetwork = network;
      productOrder.paymentCurrency = to_currency;
      
      // Set the downloadLink to our internal download endpoint
      productOrder.downloadLink = `/api/payment/download/${orderId}`;
      
      await productOrder.save();
      console.log(`Product Order ${orderId} has been paid and download link set.`);
    } else if (status === 'Failed' || status === 'Canceled') {
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

// Public endpoint to get product order status for client-side verification
router.get('/order-status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const productOrder = await ProductOrder.findOne({ orderId }).select('-adminNotes'); // Exclude admin notes

    if (!productOrder) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Return full order details including static address info
    res.json({ success: true, order: productOrder });
  } catch (error) {
    console.error('Error fetching order status:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
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

    const firstProduct = productOrder.products[0];
    if (!firstProduct) {
      return res.status(404).json({ message: 'No product found in order to download.' });
    }

    const s3Key = `products/${firstProduct.productId}.zip`; 
    const bucketName = process.env.IDRIVE_E2_BUCKET_NAME;

    if (!bucketName) {
      return res.status(500).json({ message: 'S3 bucket name not configured.' });
    }

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL valid for 1 hour
    return res.redirect(signedUrl);

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