'use strict';
const Report = require('../models/Report');
const ExcelJS = require('exceljs');

/**
 * GET /api/reports
 * Admin: all reports. Agent: only their own.
 */
const getAllReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, agentId, month, year } = req.query;
    const filter = req.user.role === 'admin' ? {} : { agentId: req.user._id };

    if (req.user.role === 'admin' && agentId) {
      filter.agentId = agentId;
    }

    if (month && year) {
      // month is 1-12
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
      filter.completedAt = { $gte: startOfMonth, $lte: endOfMonth };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Report.countDocuments(filter);
    const reports = await Report.find(filter)
      .sort({ completedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate({
        path: 'propertyId',
        populate: [
          { path: 'location' },
          { path: 'sellerId', select: 'sellerName contactNumber address' },
          { path: 'referredByAgentId', select: 'name email code' },
        ],
      })
      .populate('agentId', 'name email code')
      .populate('dealId', 'dealId status closingPrice createdAt completedAt markedDoneAt');

    return res.status(200).json({
      success: true,
      message: 'Reports fetched successfully',
      data: reports,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/:id
 * Admin: any report. Agent: only their own.
 */
const getReportById = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate({
        path: 'propertyId',
        populate: [
          { path: 'location' },
          { path: 'sellerId', select: 'sellerName contactNumber address' },
          { path: 'referredByAgentId', select: 'name email code' },
        ],
      })
      .populate('agentId', 'name email code')
      .populate('dealId');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    if (req.user.role === 'agent' && report.agentId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.status(200).json({
      success: true,
      message: 'Report fetched successfully',
      data: report,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/agents/:agentId/export
 * Admin: Export agent's reports to Excel
 */
const exportAgentReports = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { month, year } = req.query;

    const filter = { agentId };
    if (month && year) {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
      filter.completedAt = { $gte: startOfMonth, $lte: endOfMonth };
    }

    const reports = await Report.find(filter)
      .populate({
        path: 'propertyId',
        populate: [
          { path: 'location' },
          { path: 'sellerId', select: 'sellerName contactNumber address' },
          { path: 'referredByAgentId', select: 'name email code' },
        ],
      })
      .populate('agentId', 'name email code')
      .populate('dealId', 'dealId status closingPrice createdAt completedAt markedDoneAt')
      .sort({ completedAt: -1 });

    const agentName = reports.length > 0 ? reports[0].agentId.name : 'Agent';
    const monthName = month ? new Date(year, month - 1).toLocaleString('default', { month: 'long' }) : 'All_Months';
    const yearStr = year ? `_${year}` : '';
    const filename = `${agentName.replace(/\\s+/g, '_')}_${monthName}${yearStr}_Reports.xlsx`;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reports');

    worksheet.columns = [
      { header: 'Deal ID', key: 'dealId', width: 15 },
      { header: 'Property Code', key: 'propertyCode', width: 15 },
      { header: 'Property Title', key: 'propertyTitle', width: 25 },
      { header: 'Property Location', key: 'propertyLocation', width: 25 },
      { header: 'Agent Name', key: 'agentName', width: 20 },
      { header: 'Referred By', key: 'referredBy', width: 20 },
      { header: 'Owner (Seller)', key: 'ownerName', width: 20 },
      { header: 'Original Price', key: 'originalPrice', width: 15 },
      { header: 'Closing Price', key: 'closingPrice', width: 15 },
      { header: 'Completed Date', key: 'completedDate', width: 15 },
    ];

    reports.forEach(report => {
      worksheet.addRow({
        dealId: report.dealId?.dealId || 'N/A',
        propertyCode: report.propertyId?.code || 'N/A',
        propertyTitle: report.propertyId?.propertyTitle || 'N/A',
        propertyLocation: typeof report.propertyId?.location === 'object' ? report.propertyId?.location?.location : (report.propertyId?.location || 'N/A'),
        agentName: report.agentId?.name || 'N/A',
        referredBy: report.propertyId?.referredByAgentId?.name || 'N/A',
        ownerName: report.propertyId?.sellerId?.sellerName || 'N/A',
        originalPrice: report.originalPrice || 0,
        closingPrice: report.closingPrice || 0,
        completedDate: report.completedAt ? new Date(report.completedAt).toLocaleDateString() : 'N/A',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllReports, getReportById, exportAgentReports };
