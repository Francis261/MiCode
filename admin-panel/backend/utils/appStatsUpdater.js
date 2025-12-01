const Product = require('../models/Product');
const AppStats = require('../models/AppStats');

const updateAppStats = async () => {
  try {
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isHidden: false });

    await AppStats.findOneAndUpdate(
      {},
      {
        totalProducts,
        activeProducts,
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Error updating app stats:', error);
  }
};

const initializeAppStats = async () => {
  try {
    const existingStats = await AppStats.findOne();
    if (!existingStats) {
      await updateAppStats();
      console.log('✅ App stats initialized');
    }
  } catch (error) {
    console.error('Error initializing app stats:', error);
  }
};

module.exports = { updateAppStats, initializeAppStats };
