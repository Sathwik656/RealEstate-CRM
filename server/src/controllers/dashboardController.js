'use strict';
const Property = require('../models/Property');
const Seller = require('../models/Seller');
const Buyer = require('../models/Buyer');
const Deal = require('../models/Deal');

/**
 * GET /api/dashboard/stats
 * Returns summary counts for all CRM entities.
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const propertyFilter = {};
    const isAdmin = req.user.role === 'admin';

    const [
      totalProperties,
      availableProperties,
      soldProperties,
      totalSellers,
      totalBuyers,
      activeBuyers,
      ongoingDeals,
      pendingApprovals,
    ] = await Promise.all([
      Property.countDocuments(propertyFilter),
      Property.countDocuments({ ...propertyFilter, propertyStatus: 'Available' }),
      Property.countDocuments({ ...propertyFilter, propertyStatus: 'Sold' }),
      Seller.countDocuments(isAdmin ? {} : { referredByAgentId: req.user._id }),
      Buyer.countDocuments(isAdmin ? {} : { referredByAgentId: req.user._id }),
      Buyer.countDocuments(isAdmin ? { status: 'Active' } : { status: 'Active', referredByAgentId: req.user._id }),
      // Deal counts — admin sees all, agent sees their own
      Deal.countDocuments(isAdmin ? { status: 'ongoing' } : { agentId: req.user._id, status: 'ongoing' }),
      Deal.countDocuments(isAdmin ? { status: 'pending_approval' } : { agentId: req.user._id, status: 'pending_approval' }),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Dashboard stats fetched successfully',
      data: {
        totalProperties,
        availableProperties,
        soldProperties,
        totalSellers,
        totalBuyers,
        activeBuyers,
        ongoingDeals,
        pendingApprovals,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/dashboard/charts
 * Returns aggregated chart data using MongoDB aggregation pipelines.
 */
const getDashboardCharts = async (req, res, next) => {
  try {
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(`${currentYear}-01-01T00:00:00.000Z`);
    const yearEnd = new Date(`${currentYear}-12-31T23:59:59.999Z`);

    const propertyFilter = {};

    const [
      monthlySalesRaw,
      propertyTypeDistribution,
      propertyStatusDistribution,
      buyerBudgetRangesRaw,
    ] = await Promise.all([
      // Monthly property creation count for the current year
      Property.aggregate([
        { $match: { createdAt: { $gte: yearStart, $lte: yearEnd }, ...propertyFilter } },
        {
          $group: {
            _id: { month: { $month: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.month': 1 } },
      ]),

      // Count of each property type
      Property.aggregate([
        { $match: propertyFilter },
        { $group: { _id: '$propertyType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Count of each property status
      Property.aggregate([
        { $match: propertyFilter },
        { $group: { _id: '$propertyStatus', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // Buyer budget ranges (bucketed)
      Buyer.aggregate([
        { $match: req.user.role === 'admin' ? {} : { referredByAgentId: req.user._id } },
        {
          $bucket: {
            groupBy: '$budgetMax',
            boundaries: [0, 1000000, 2500000, 5000000, 10000000, 25000000, 50000000],
            default: '50M+',
            output: { count: { $sum: 1 } },
          },
        },
      ]),
    ]);

    // Build full 12-month array (fill missing months with 0)
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const monthlySales = monthNames.map((month, idx) => {
      const found = monthlySalesRaw.find((m) => m._id.month === idx + 1);
      return { month, count: found ? found.count : 0 };
    });

    // Format bucket labels
    const bucketLabels = ['0-10L', '10L-25L', '25L-50L', '50L-1Cr', '1Cr-2.5Cr', '2.5Cr-5Cr', '5Cr+'];
    const buyerBudgetRanges = buyerBudgetRangesRaw.map((b, i) => ({
      range: bucketLabels[i] || '5Cr+',
      count: b.count,
    }));

    return res.status(200).json({
      success: true,
      message: 'Dashboard chart data fetched successfully',
      data: {
        monthlySales,
        propertyTypeDistribution: propertyTypeDistribution.map((p) => ({
          type: p._id,
          count: p.count,
        })),
        propertyStatusDistribution: propertyStatusDistribution.map((p) => ({
          status: p._id,
          count: p.count,
        })),
        buyerBudgetRanges,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboardStats, getDashboardCharts };
