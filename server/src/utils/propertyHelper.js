'use strict';
const DealAssignment = require('../models/DealAssignment');

/**
 * Strips seller information from properties for unauthorized agents.
 * Agents are authorized if:
 * 1. They are admins.
 * 2. They created the property.
 * 3. They were ever assigned to the property in a Deal (checked via DealAssignment).
 * 
 * @param {Array|Object} properties - Mongoose documents or plain objects
 * @param {Object} user - The req.user object
 * @returns {Array|Object} - The sanitized properties
 */
const sanitizePropertiesForUser = async (properties, user) => {
  if (!properties) return properties;
  if (user.role === 'admin') return properties;
  
  const isArray = Array.isArray(properties);
  const propsArray = isArray ? properties : [properties];
  
  if (propsArray.length === 0) return properties;

  const propertyIds = propsArray.map(p => p._id);

  // Find all DealAssignments for this agent and these properties
  const assignments = await DealAssignment.find({
    propertyId: { $in: propertyIds },
    agentId: user._id
  }).select('propertyId');

  const assignedPropertyIds = new Set(assignments.map(a => a.propertyId.toString()));

  const sanitized = propsArray.map(p => {
    // If it's a mongoose document, convert to object
    let prop = p.toObject ? p.toObject() : (p.toJSON ? p.toJSON() : { ...p });

    // Check if the agent created the property
    const creatorId = prop.createdByUserId && prop.createdByUserId._id 
      ? prop.createdByUserId._id.toString() 
      : (prop.createdByUserId ? prop.createdByUserId.toString() : null);
      
    const isCreator = creatorId === user._id.toString();
    const isAssigned = assignedPropertyIds.has(prop._id.toString());

    const isAuthorized = isCreator || isAssigned;

    if (!isAuthorized) {
      // Strip seller info
      delete prop.contactNumber;
      
      if (prop.sellerId) {
        if (typeof prop.sellerId === 'object') {
          delete prop.sellerId.sellerName;
          delete prop.sellerId.contactNumber;
          delete prop.sellerId.address;
          delete prop.sellerId.note;
        }
        prop.sellerId = null;
      }
    }

    return prop;
  });

  return isArray ? sanitized : sanitized[0];
};

module.exports = {
  sanitizePropertiesForUser
};
