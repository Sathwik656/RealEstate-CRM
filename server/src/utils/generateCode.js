'use strict';
const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Automatically generates a standard CRM code for an entity using a secure hexadecimal identifier.
 * Formats: 
 *   Property: TVMP-[YY]-[LOCATION_CODE]-[HEX_ID]
 *   Buyer:    TVMB-[YY]-[HEX_ID]
 *   Seller:   TVMS-[YY]-[HEX_ID]
 *   Agent:    TVMA-[YY]-[HEX_ID]
 *
 * @param {string} entityType - 'Property', 'Buyer', 'Seller', or 'Agent'
 * @param {string} [locationCode] - Required only for 'Property'
 * @returns {Promise<string>}
 */
const generateEntityCode = async (entityType, locationCode = null) => {
  let rolePrefix = '';
  let modelName = entityType;
  
  switch (entityType) {
    case 'Property': rolePrefix = 'P'; break;
    case 'Buyer':    rolePrefix = 'B'; break;
    case 'Seller':   rolePrefix = 'S'; break;
    case 'Agent':    
      rolePrefix = 'A'; 
      modelName = 'User';
      break;
    default: throw new Error(`Invalid entity type for code generation: ${entityType}`);
  }

  const Model = mongoose.model(modelName);
  const yy = String(new Date().getFullYear()).slice(-2);
  let code;
  let isUnique = false;

  while (!isUnique) {
    const hexId = crypto.randomBytes(3).toString('hex').toUpperCase();
    
    if (entityType === 'Property') {
      if (!locationCode) throw new Error('locationCode is required for Property code generation');
      code = `TVM${rolePrefix}-${yy}-${locationCode}-${hexId}`;
    } else {
      code = `TVM${rolePrefix}-${yy}-${hexId}`;
    }

    const existing = await Model.findOne({ code });
    if (!existing) {
      isUnique = true;
    }
  }

  return code;
};

/**
 * Reconstructs a Property code when its location is updated, while preserving the existing hexadecimal identifier.
 * 
 * @param {string} oldCode 
 * @param {string} newLocationCode 
 * @returns {string} 
 */
const reconstructPropertyCode = (oldCode, newLocationCode) => {
  if (!oldCode || !newLocationCode) throw new Error('Missing arguments for code reconstruction');
  
  const parts = oldCode.split('-');
  const hexId = parts[parts.length - 1];
  const yy = String(new Date().getFullYear()).slice(-2);
  
  return `TVMP-${yy}-${newLocationCode}-${hexId}`;
};

/**
 * Generates a Deal ID using a secure hexadecimal identifier.
 * Format: DEAL-[HEX_ID]
 * 
 * @returns {Promise<string>}
 */
const generateDealCode = async () => {
  const Deal = mongoose.model('Deal');
  let code;
  let isUnique = false;

  while (!isUnique) {
    const hexId = crypto.randomBytes(3).toString('hex').toUpperCase();
    code = `DEAL-${hexId}`;
    
    const existing = await Deal.findOne({ dealId: code });
    if (!existing) {
      isUnique = true;
    }
  }

  return code;
};

module.exports = {
  generateEntityCode,
  reconstructPropertyCode,
  generateDealCode
};
