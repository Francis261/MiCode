const express = require('express');
const router = express.Router();

// OxaPay API endpoint
const OXAPAY_API_URL = 'https://api.oxapay.com/merchants/request';

// Create payment
router.post('/create', async (req, res) => {
  try {
    const { name, email, amount, productName } = req.body;

    if (!name || !email || !amount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const paymentData = {
      merchant: process.env.OXAPAY_MERCHANT_KEY,
      amount: amount,
      currency: 'USD',
      lifeTime: 30, // 30 minutes
      feePaidByPayer: 0,
      underPaidCover: 2.5,
      callbackUrl: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/payment/callback`,
      returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:8080'}/payment-success?orderId=${orderId}`,
      description: productName || 'Digital Product',
      orderId: orderId,
      email: email,
    };

    const response = await fetch(OXAPAY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData),
    });

    const data = await response.json();

    if (data.result === 100 && data.payLink) {
      // Store order in database (you should implement this)
      // await Order.create({ orderId, name, email, amount, status: 'pending' });

      res.json({
        success: true,
        paymentUrl: data.payLink,
        orderId: orderId,
        trackId: data.trackId,
      });
    } else {
      res.status(400).json({
        success: false,
        message: data.message || 'Failed to create payment',
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

    // Verify the callback is from OxaPay (you should add HMAC verification)
    
    if (status === 'Paid') {
      // Update order status in database
      // await Order.findOneAndUpdate({ orderId }, { status: 'paid' });
      
      console.log(`Order ${orderId} has been paid`);
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

    // Verify the order exists and is paid
    // const order = await Order.findOne({ orderId, status: 'paid' });
    // if (!order) {
    //   return res.status(403).json({ message: 'Payment not verified' });
    // }

    // For demo purposes, send a sample file
    // In production, you would serve the actual product file
    const filePath = './downloads/product.zip'; // Path to your product file
    
    // Check if file exists, otherwise send a message
    const fs = require('fs');
    if (fs.existsSync(filePath)) {
      res.download(filePath, 'product.zip');
    } else {
      res.status(404).json({ 
        message: 'Product file not found. Please contact support.',
        orderId 
      });
    }
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
