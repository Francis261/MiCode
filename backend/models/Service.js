const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  icon: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  features: [{ type: String }],
  actionButton: {
    label: { type: String },
    url: { type: String }
  },
  statusTag: { type: String, default: null },
  content: { type: String, default: '' },
  contentImages: [{ type: String }],
  isHidden: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);