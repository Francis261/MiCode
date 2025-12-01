const mongoose = require('mongoose');

const appStatsSchema = new mongoose.Schema({
  totalProducts: { type: Number, default: 0 },
  activeProducts: { type: Number, default: 0 },
  totalServices: { type: Number, default: 0 },
  totalTestimonials: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('AppStats', appStatsSchema);
