const express = require('express');
const { authMiddleware, checkPermission } = require('../middleware/authMiddleware');
const Product = require('../../backend/models/Product');
const AppStats = require('../../backend/models/AppStats');

const router = express.Router();

// All dashboard routes require authentication and dashboard permission
router.use(authMiddleware);
router.use(checkPermission('dashboard'));

// Get Dashboard Stats
router.get('/stats', async (req, res) => {
  try {
    // Get app stats from the database
    const appStats = await AppStats.findOne();
    
    // Calculate mock data for sales and users (in real app, you'd have these collections)
    const totalProducts = appStats?.totalProducts || 0;
    const activeProducts = appStats?.activeProducts || 0;

    // Mock calculations (replace with real data from your database)
    const totalSales = '$45,231.89'; // This would come from an Orders collection
    const newUsers = '+201'; // This would come from a Users collection
    const salesChange = '+20.1% from last month';
    const usersChange = '+10.3% from last month';
    const productsChange = activeProducts > 0 ? `${activeProducts} active` : 'No active products';

    res.json({
      totalSales,
      newUsers,
      activeProducts,
      totalProducts,
      salesChange,
      usersChange,
      productsChange,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Error fetching dashboard stats' });
  }
});

// Get Sales Overview (Chart Data)
router.get('/sales-overview', async (req, res) => {
  try {
    // Mock data - replace with real sales data from Orders collection
    const salesOverview = [
      { name: 'Jan', sales: 4000 },
      { name: 'Feb', sales: 3000 },
      { name: 'Mar', sales: 5000 },
      { name: 'Apr', sales: 2780 },
      { name: 'May', sales: 1890 },
      { name: 'Jun', sales: 2390 },
    ];

    res.json(salesOverview);
  } catch (error) {
    console.error('Sales overview error:', error);
    res.status(500).json({ success: false, message: 'Error fetching sales overview' });
  }
});

// Get Product Performance (Chart Data)
router.get('/product-performance', async (req, res) => {
  try {
    // Get top 5 products by rating (in real app, you'd aggregate by sales)
    const topProducts = await Product.find({ isHidden: false })
      .sort({ rating: -1, reviews: -1 })
      .limit(5)
      .select('title rating reviews');

    const productPerformance = topProducts.map(product => ({
      name: product.title.substring(0, 20), // Truncate for chart display
      sales: product.reviews * 10, // Mock calculation (reviews * avg sale)
    }));

    res.json(productPerformance);
  } catch (error) {
    console.error('Product performance error:', error);
    res.status(500).json({ success: false, message: 'Error fetching product performance' });
  }
});

module.exports = router;
