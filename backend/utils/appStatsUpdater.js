const AppStats = require('../models/AppStats');
const Product = require('../models/Product');

// Function to initialize AppStats if it doesn't exist or to recalculate
async function initializeAppStats() {
  try {
    let stats = await AppStats.findOne();
    if (!stats) {
      console.log('AppStats document not found, initializing...');
      const totalProducts = await Product.countDocuments();
      const activeProducts = await Product.countDocuments({ isHidden: false });
      stats = new AppStats({ totalProducts, activeProducts });
      await stats.save();
      console.log('AppStats initialized:', stats);
    } else {
      // Optionally, you could add logic here to periodically re-sync counts
      // if there's a risk of them getting out of sync due to external changes.
      // For now, we assume updates are always through our routes.
      console.log('AppStats already exists:', stats);
    }
  } catch (error) {
    console.error('Error initializing AppStats:', error);
  }
}

// Function to increment product counts
async function incrementProductCounts(isProductHidden = false) {
  try {
    await AppStats.findOneAndUpdate(
      {},
      { $inc: { totalProducts: 1, ...(isProductHidden ? {} : { activeProducts: 1 }) } },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Error incrementing product counts:', error);
  }
}

// Function to decrement product counts
async function decrementProductCounts(wasProductHidden = false) {
  try {
    await AppStats.findOneAndUpdate(
      {},
      { $inc: { totalProducts: -1, ...(wasProductHidden ? {} : { activeProducts: -1 }) } },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Error decrementing product counts:', error);
  }
}

// Function to update active product count when visibility changes
async function updateProductVisibilityCounts(oldIsHidden, newIsHidden) {
  try {
    if (oldIsHidden === newIsHidden) return; // No change in visibility

    if (oldIsHidden && !newIsHidden) { // Product changed from hidden to visible
      await AppStats.findOneAndUpdate({}, { $inc: { activeProducts: 1 } }, { upsert: true, new: true });
    } else if (!oldIsHidden && newIsHidden) { // Product changed from visible to hidden
      await AppStats.findOneAndUpdate({}, { $inc: { activeProducts: -1 } }, { upsert: true, new: true });
    }
  } catch (error) {
    console.error('Error updating product visibility counts:', error);
  }
}

module.exports = {
  initializeAppStats,
  incrementProductCounts,
  decrementProductCounts,
  updateProductVisibilityCounts,
};