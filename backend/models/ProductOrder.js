const mongoose = require('mongoose');

const productItemSchema = new mongoose.Schema({
  productId: { type: String, required: true }, // The static 'id' from the Product model
  title: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, default: 1 },
  image: { type: String },
  category: { type: String },
});

const productOrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
  },
  clientName: {
    type: String,
    required: true,
  },
  clientEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    default: 'OxaPay', // Assuming OxaPay is the primary method
  },
  transactionId: { // OxaPay's track_id
    type: String,
    unique: true,
    sparse: true, // Allow multiple nulls, but unique if present
  },
  products: [productItemSchema],
  downloadLink: { // For digital products, can be a pre-signed URL or a reference
    type: String,
  },
  adminNotes: {
    type: String,
  },
  // New fields for static address payment
  staticWalletAddress: {
    type: String,
    sparse: true, // Allow multiple nulls, but unique if present
  },
  paymentNetwork: {
    type: String,
  },
  paymentCurrency: {
    type: String,
  },
  cryptoAmount: { // New field to store the calculated crypto amount
    type: Number,
  },
  qrCodeUrl: { // To store the QR code image URL if OxaPay provides one, or if we generate and store it
    type: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('ProductOrder', productOrderSchema);