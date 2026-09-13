'use strict';
const User = require('../models/User');
const Report = require('../models/Report');
const Property = require('../models/Property');
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');

// ─── Helper Functions ──────────────────────────────────────────────────────

/**
 * Calculates propertiesSold and total revenue for given agent IDs
 */
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

/**
 * @desc    Get all agents
 * @route   GET /api/users/agents
 * @access  Private/Admin
 */
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

/**
 * @desc    Get agent by ID
 * @route   GET /api/users/agents/:id
 * @access  Private/Admin
 */
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

/**
 * @desc    Update agent details
 * @route   PUT /api/users/agents/:id
 * @access  Private/Admin
 */
const updateAgent = async (req, res, next) => {
  try {
    const { name, email } = req.body;

    // Check if the user exists and is an agent
    const agent = await User.findOne({ _id: req.params.id, role: 'agent' });
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found.',
      });
    }

    // Check if new email is already in use by someone else
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

    // Do not return password
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

/**
 * @desc    Delete agent
 * @route   DELETE /api/users/agents/:id
 * @access  Private/Admin
 */
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

module.exports = {
  getAllAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
};
