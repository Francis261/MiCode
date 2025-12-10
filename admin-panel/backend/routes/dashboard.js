const express = require('express');
const { authMiddleware, checkPermission } = require('../middleware/authMiddleware');
const Product = require('../models/Product');
const AppStats = require('../models/AppStats'); // Corrected import path for AppStats
const ProductOrder = require('../models/ProductOrder'); // Import ProductOrder model
const ChatUser = require('../models/ChatUser');

const router = express.Router();

// All dashboard routes require authentication and dashboard permission
router.use(authMiddleware);
router.use(checkPermission('dashboard'));

// Get Dashboard Stats
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

    // Get app stats from the database
    const appStats = await AppStats.findOne();
    
    // Calculate real data for sales and users
    const totalSalesResult = await ProductOrder.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalSales = totalSalesResult.length > 0 ? totalSalesResult[0].total : 0;

    const sales24HrsResult = await ProductOrder.aggregate([
      { $match: { status: 'paid', createdAt: { $gte: twentyFourHoursAgo } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const sales24Hrs = sales24HrsResult.length > 0 ? sales24HrsResult[0].total : 0;

    const totalUsers = await ChatUser.countDocuments();
    const newUsers24Hrs = await ChatUser.countDocuments({ createdAt: { $gte: twentyFourHoursAgo } });

    const totalProducts = appStats?.totalProducts || 0;
    const activeProducts = appStats?.activeProducts || 0;

    res.json({
      totalSales: totalSales.toFixed(2),
      sales24Hrs: sales24Hrs.toFixed(2),
      newUsers24Hrs,
      totalUsers,
      activeProducts,
      totalProducts,
      // Removed mock change percentages, frontend can calculate if needed or they can be added here
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Error fetching dashboard stats' });
  }
});

// Get Sales Overview (Chart Data)
router.get('/sales-overview', async (req, res) => {
  try {
    const salesOverview = await ProductOrder.aggregate([
      { $match: { status: 'paid' } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          totalSales: { $sum: '$totalAmount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          name: {
            $dateToString: {
              format: '%b', // Abbreviated month name
              date: {
                $dateFromParts: {
                  year: '$_id.year',
                  month: '$_id.month',
                  day: 1,
                },
              },
            },
          },
          sales: '$totalSales',
        },
      },
    ]);

    res.json(salesOverview);
  } catch (error) {
    console.error('Sales overview error:', error);
    res.status(500).json({ success: false, message: 'Error fetching sales overview' });
  }
});

// Get Product Performance (Chart Data)
router.get('/product-performance', async (req, res) => {
  try {
    const productPerformance = await ProductOrder.aggregate([
      { $match: { status: 'paid' } },
      { $unwind: '$products' },
      {
        $group: {
          _id: '$products.title',
          totalSales: { $sum: { $multiply: ['$products.price', '$products.quantity'] } },
        },
      },
      { $sort: { totalSales: -1 } },
      { $limit: 5 }, // Top 5 products
      {
        $project: {
          _id: 0,
          name: '$_id',
          sales: '$totalSales',
        },
      },
    ]);

    res.json(productPerformance);
  } catch (error) {
    console.error('Product performance error:', error);
    res.status(500).json({ success: false, message: 'Error fetching product performance' });
  }
});

module.exports = router;