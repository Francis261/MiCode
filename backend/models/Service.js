const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  icon: { type: String, required: true }, // Storing icon name as string, frontend will map to LucideIcon
  title: { type: String, required: true },
  description: { type: String, required: true },
  features: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);