'use strict';
const User = require('../models/User');
const { validationResult } = require('express-validator');

// ─── Controller Functions ──────────────────────────────────────────────────

/**
 * @desc    Get all agents
 * @route   GET /api/users/agents
 * @access  Private/Admin
 */
const getAllAgents = async (req, res, next) => {
  try {
    const agents = await User.find({ role: 'agent' }).select('-password').sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: agents.length,
      data: agents,
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
  updateAgent,
  deleteAgent,
};
