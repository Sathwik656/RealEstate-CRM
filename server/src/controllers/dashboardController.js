'use strict';
const Property = require('../models/Property');
const Seller = require('../models/Seller');
const Buyer = require('../models/Buyer');
const Tenant = require('../models/Tenant');
const Lease = require('../models/Lease');
const RentalProperty = require('../models/RentalProperty');

/**
 * GET /api/dashboard/stats
 * Returns summary counts for all CRM entities.
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const [
      totalProperties,
      availableProperties,
      soldProperties,
      rentedProperties,
      leasedProperties,
      totalSellers,
      totalBuyers,
      activeBuyers,
      totalTenants,
      activeTenants,
      totalLeases,
      activeLeases,
      expiredLeases,
      totalRentals,
      availableRentals,
      occupiedRentals,
      todayFollowUps,
      upcomingFollowUps,
      expiringLeases,
    ] = await Promise.all([
      Property.countDocuments({ createdBy: req.user._id }),
      Property.countDocuments({ propertyStatus: 'Available', createdBy: req.user._id }),
      Property.countDocuments({ propertyStatus: 'Sold', createdBy: req.user._id }),
      Property.countDocuments({ propertyStatus: 'Rented', createdBy: req.user._id }),
      Property.countDocuments({ propertyStatus: 'Leased', createdBy: req.user._id }),
      Seller.countDocuments({ createdBy: req.user._id }),
      Buyer.countDocuments({ createdBy: req.user._id }),
      Buyer.countDocuments({ status: 'Active', createdBy: req.user._id }),
      Tenant.countDocuments({ createdBy: req.user._id }),
      Tenant.countDocuments({ status: 'Active', createdBy: req.user._id }),
      Lease.countDocuments({ createdBy: req.user._id }),
      Lease.countDocuments({ status: 'Active', createdBy: req.user._id }),
      Lease.countDocuments({ status: 'Expired', createdBy: req.user._id }),
      RentalProperty.countDocuments({ createdBy: req.user._id }),
      RentalProperty.countDocuments({ propertyStatus: 'Available', createdBy: req.user._id }),
      RentalProperty.countDocuments({ propertyStatus: 'Occupied', createdBy: req.user._id }),
      Buyer.countDocuments({
        followUpDate: { $gte: today, $lt: tomorrow },
        status: { $ne: 'Closed' },
        createdBy: req.user._id,
      }),
      Buyer.countDocuments({
        followUpDate: { $gt: tomorrow, $lte: nextWeek },
        status: { $ne: 'Closed' },
        createdBy: req.user._id,
      }),
      Lease.countDocuments({
        status: 'Active',
        leaseEndDate: { $gte: today, $lte: thirtyDaysFromNow },
        createdBy: req.user._id,
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Dashboard stats fetched successfully',
      data: {
        totalProperties,
        availableProperties,
        soldProperties,
        rentedProperties,
        leasedProperties,
        totalSellers,
        totalBuyers,
        activeBuyers,
        totalTenants,
        activeTenants,
        totalLeases,
        activeLeases,
        expiredLeases,
        totalRentals,
        availableRentals,
        occupiedRentals,
        todayFollowUps,
        upcomingFollowUps,
        expiringLeases,
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

    const [
      monthlySalesRaw,
      propertyTypeDistribution,
      propertyStatusDistribution,
      rentalFurnishingDistribution,
      buyerBudgetRangesRaw,
    ] = await Promise.all([
      // Monthly property creation count for the current year
      Property.aggregate([
        { $match: { createdAt: { $gte: yearStart, $lte: yearEnd }, createdBy: req.user._id } },
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
        { $match: { createdBy: req.user._id } },
        { $group: { _id: '$propertyType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Count of each property status
      Property.aggregate([
        { $match: { createdBy: req.user._id } },
        { $group: { _id: '$propertyStatus', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // Furnishing distribution for rental properties
      RentalProperty.aggregate([
        { $match: { createdBy: req.user._id } },
        { $group: { _id: '$furnishing', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Buyer budget ranges (bucketed)
      Buyer.aggregate([
        { $match: { createdBy: req.user._id } },
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
        rentalFurnishingDistribution: rentalFurnishingDistribution.map((r) => ({
          furnishing: r._id || 'Not Specified',
          count: r.count,
        })),
        buyerBudgetRanges,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboardStats, getDashboardCharts };
