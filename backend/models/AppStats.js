const mongoose = require('mongoose');

const appStatsSchema = new mongoose.Schema({
  totalProducts: {
    type: Number,
    default: 0,
  },
  activeProducts: { // Products that are not hidden
    type: Number,
    default: 0,
  },
  // Add other global stats here as needed
}, { timestamps: true });

module.exports = mongoose.model('AppStats', appStatsSchema);