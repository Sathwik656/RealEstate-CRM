'use strict';
const User = require('../models/User');
const Report = require('../models/Report');
const Property = require('../models/Property');
const Deal = require('../models/Deal');
const PropertyInterest = require('../models/PropertyInterest');
const DealAssignment = require('../models/DealAssignment');
const mongoose = require('mongoose');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

// ... (keep existing helper functions)
const getAgentStatsMap = async (agentIds) => {
  if (!agentIds || agentIds.length === 0) return {};

  const agentObjectIds = agentIds.map((id) => (typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id));

  const [reportStats, propertyStats] = await Promise.all([
    Report.aggregate([
      { $match: { agentId: { $in: agentObjectIds } } },
      {
        $group: {
          _id: '$agentId',
          propertiesSold: { $sum: 1 },
          revenue: { $sum: '$closingPrice' },
          propertyIds: { $push: '$propertyId' },
        },
      },
    ]),
    Property.aggregate([
      {
        $match: {
          propertyStatus: 'Sold',
          referredByAgentId: { $in: agentObjectIds },
        },
      },
      {
        $group: {
          _id: '$referredByAgentId',
          soldProperties: {
            $push: {
              _id: '$_id',
              price: { $ifNull: ['$price', 0] },
            },
          },
        },
      },
    ]),
  ]);

  const statsMap = {};
  agentIds.forEach((id) => {
    statsMap[id.toString()] = { propertiesSold: 0, revenue: 0 };
  });

  const reportMap = {};
  reportStats.forEach((r) => {
    const rId = r._id.toString();
    const propSet = new Set((r.propertyIds || []).map((p) => p.toString()));
    reportMap[rId] = {
      propertiesSold: r.propertiesSold,
      revenue: r.revenue,
      propertySet: propSet,
    };
    if (statsMap[rId]) {
      statsMap[rId].propertiesSold = r.propertiesSold;
      statsMap[rId].revenue = r.revenue;
    }
  });

  propertyStats.forEach((p) => {
    const pId = p._id.toString();
    const existingReportInfo = reportMap[pId];
    const propertySet = existingReportInfo ? existingReportInfo.propertySet : new Set();

    if (!statsMap[pId]) {
      statsMap[pId] = { propertiesSold: 0, revenue: 0 };
    }

    (p.soldProperties || []).forEach((prop) => {
      const propIdStr = prop._id.toString();
      if (!propertySet.has(propIdStr)) {
        statsMap[pId].propertiesSold += 1;
        statsMap[pId].revenue += prop.price;
      }
    });
  });

  return statsMap;
};

// ─── Controller Functions ──────────────────────────────────────────────────

const getAllAgents = async (req, res, next) => {
  try {
    const agents = await User.find({ role: 'agent' }).select('-password').sort({ createdAt: -1 });

    const agentIds = agents.map((a) => a._id);
    const statsMap = await getAgentStatsMap(agentIds);

    const agentsWithStats = agents.map((agent) => {
      const agentObj = agent.toObject();
      const stats = statsMap[agent._id.toString()] || { propertiesSold: 0, revenue: 0 };
      agentObj.propertiesSold = stats.propertiesSold;
      agentObj.revenue = stats.revenue;
      return agentObj;
    });

    return res.status(200).json({
      success: true,
      count: agentsWithStats.length,
      data: agentsWithStats,
    });
  } catch (error) {
    next(error);
  }
};

const getAgentById = async (req, res, next) => {
  try {
    const agent = await User.findOne({ _id: req.params.id, role: 'agent' }).select('-password');
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found.',
      });
    }

    const statsMap = await getAgentStatsMap([agent._id]);
    const agentObj = agent.toObject();
    const stats = statsMap[agent._id.toString()] || { propertiesSold: 0, revenue: 0 };
    agentObj.propertiesSold = stats.propertiesSold;
    agentObj.revenue = stats.revenue;

    return res.status(200).json({
      success: true,
      data: agentObj,
    });
  } catch (error) {
    next(error);
  }
};

const updateAgent = async (req, res, next) => {
  try {
    const { name, email } = req.body;

    const agent = await User.findOne({ _id: req.params.id, role: 'agent' });
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found.',
      });
    }

    if (email && email !== agent.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email is already in use by another account.',
        });
      }
    }

    if (name) agent.name = name;
    if (email) agent.email = email;

    await agent.save();

    const updatedAgent = agent.toObject();
    delete updatedAgent.password;

    return res.status(200).json({
      success: true,
      message: 'Agent updated successfully.',
      data: updatedAgent,
    });
  } catch (error) {
    next(error);
  }
};

const deleteAgent = async (req, res, next) => {
  try {
    const agent = await User.findOneAndDelete({ _id: req.params.id, role: 'agent' });
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Agent deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get agent-centric dashboard
 * @route   GET /api/users/agents/:id/dashboard
 * @access  Private/Admin
 */
const getAgentDashboard = async (req, res, next) => {
  try {
    const agentId = req.params.id;
    const agent = await User.findOne({ _id: agentId, role: 'agent' }).select('-password');
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found.' });
    }

    // 1. Current Properties (Deals)
    let currentProperties = await Deal.find({
      currentAgentId: agentId,
      status: { $ne: 'completed' },
    }).populate({ path: 'propertyId', populate: { path: 'location' } })
      .sort({ createdAt: -1 });
    currentProperties = currentProperties.filter(d => d.propertyId != null);

    // 2. Interested Properties (Waiting/Interested)
    let interestedProperties = await PropertyInterest.find({
      agentId,
      status: { $in: ['interested', 'waiting'] },
    }).populate({ 
      path: 'propertyId', 
      match: { propertyStatus: { $in: ['Available', 'In Allotment', 'In Deal'] } }, // Only show active properties
      populate: { path: 'location' } 
    }).sort({ createdAt: -1 });
    // Filter out deleted properties or properties that are no longer active (e.g. Sold)
    interestedProperties = interestedProperties.filter(i => i.propertyId != null);

    // 3. Completed Deals
    let completedDeals = await Deal.find({
      currentAgentId: agentId,
      status: 'completed',
    }).populate({ path: 'propertyId', populate: { path: 'location' } })
      .sort({ completedAt: -1 });
    completedDeals = completedDeals.filter(d => d.propertyId != null);

    // 4. Returned / Reassigned Properties
    let reassignedProperties = await DealAssignment.find({
      agentId,
      endedAt: { $ne: null },
    }).populate({ path: 'propertyId', populate: { path: 'location' } })
      .populate('dealId')
      .populate('assignedBy', 'name')
      .sort({ endedAt: -1 });
    reassignedProperties = reassignedProperties.filter(h => h.propertyId != null);
      
    // Populate the current deal's current agent if it exists for returned/reassigned
    for (let doc of reassignedProperties) {
      if (doc.dealId && doc.dealId.currentAgentId) {
        await doc.dealId.populate('currentAgentId', 'name code');
      }
    }

    // 5. Assignment History (All assignments involving this agent)
    let assignmentHistory = await DealAssignment.find({
      $or: [{ agentId }, { previousAgentId: agentId }],
    }).populate({ path: 'propertyId', populate: { path: 'location' } })
      .populate('agentId', 'name code')
      .populate('previousAgentId', 'name code')
      .populate('assignedBy', 'name')
      .populate('endedBy', 'name')
      .sort({ createdAt: -1 });
    assignmentHistory = assignmentHistory.filter(h => h.propertyId != null);

    const statsMap = await getAgentStatsMap([agent._id]);
    const agentObj = agent.toObject();
    const stats = statsMap[agent._id.toString()] || { propertiesSold: 0, revenue: 0 };
    agentObj.propertiesSold = stats.propertiesSold;
    agentObj.revenue = stats.revenue;

    return res.status(200).json({
      success: true,
      data: {
        agent: agentObj,
        currentProperties,
        interestedProperties,
        completedDeals,
        reassignedProperties,
        assignmentHistory,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
  getAgentDashboard,
};

const approveAgent = async (req, res, next) => {
  try {
    const agent = await User.findOne({ _id: req.params.id, role: 'agent' });
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found.' });

    agent.approvalStatus = 'approved';
    await agent.save();

    try {
      await resend.emails.send({
        from: `Veranda Realty <${RESEND_FROM_EMAIL}>`,
        to: agent.email,
        subject: 'Your Veranda Realty Agent Account Has Been Approved',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Account Approved</h2>
            <p>Your account has been approved by the administrator. You can now log in to your Verandah Reality account.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('Failed to send approval email:', emailErr);
    }

    return res.status(200).json({ success: true, message: 'Agent approved successfully.' });
  } catch (err) {
    next(err);
  }
};

const rejectAgent = async (req, res, next) => {
  try {
    const agent = await User.findOne({ _id: req.params.id, role: 'agent' });
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found.' });

    agent.approvalStatus = 'rejected';
    await agent.save();

    try {
      await resend.emails.send({
        from: `Veranda Realty <${RESEND_FROM_EMAIL}>`,
        to: agent.email,
        subject: 'Update Regarding Your Veranda Realty Agent Account',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Account Update</h2>
            <p>Your agent account has not been approved at this time. Please contact the administrator for further assistance.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('Failed to send rejection email:', emailErr);
    }

    return res.status(200).json({ success: true, message: 'Agent rejected successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
  getAgentDashboard,
  approveAgent,
  rejectAgent,
};
