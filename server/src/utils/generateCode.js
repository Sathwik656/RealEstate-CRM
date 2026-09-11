'use strict';
const Counter = require('../models/Counter');

/**
 * Automatically generates a standard CRM code for an entity.
 * Formats: 
 *   Property: TVMP-[YY]-[LOCATION_CODE]-[SEQUENCE]
 *   Buyer:    TVMB-[YY]-[SEQUENCE]
 *   Seller:   TVMS-[YY]-[SEQUENCE]
 *   Agent:    TVMA-[YY]-[SEQUENCE]
 *
 * @param {string} entityType - 'Property', 'Buyer', 'Seller', or 'Agent'
 * @param {string} [locationCode] - Required only for 'Property'
 * @returns {Promise<{ code: string, seqNumber: number }>}
 */
const generateEntityCode = async (entityType, locationCode = null) => {
  let rolePrefix = '';
  switch (entityType) {
    case 'Property': rolePrefix = 'P'; break;
    case 'Buyer':    rolePrefix = 'B'; break;
    case 'Seller':   rolePrefix = 'S'; break;
    case 'Agent':    rolePrefix = 'A'; break;
    default: throw new Error(`Invalid entity type for code generation: ${entityType}`);
  }

  // Atomically increment the sequence counter for this specific entity type
  const counter = await Counter.findByIdAndUpdate(
    { _id: entityType },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const seqNumber = counter.seq;
  const seqStr = String(seqNumber).padStart(4, '0');
  const yy = String(new Date().getFullYear()).slice(-2);

  let code;
  if (entityType === 'Property') {
    if (!locationCode) throw new Error('locationCode is required for Property code generation');
    code = `TVM${rolePrefix}-${yy}-${locationCode}-${seqStr}`;
  } else {
    code = `TVM${rolePrefix}-${yy}-${seqStr}`;
  }

  return { code, seqNumber };
};

/**
 * Reconstructs a Property code when its location is updated, while preserving the existing sequence.
 * 
 * @param {number} existingSeqNumber 
 * @param {string} newLocationCode 
 * @returns {string} 
 */
const reconstructPropertyCode = (existingSeqNumber, newLocationCode) => {
  if (!existingSeqNumber || !newLocationCode) throw new Error('Missing arguments for code reconstruction');
  
  const seqStr = String(existingSeqNumber).padStart(4, '0');
  const yy = String(new Date().getFullYear()).slice(-2);
  
  return `TVMP-${yy}-${newLocationCode}-${seqStr}`;
};

/**
 * Generates a Deal ID.
 * Format: DEAL-[deal sequence]
 * 
 * @returns {Promise<string>}
 */
const generateDealCode = async () => {
  const counter = await Counter.findByIdAndUpdate(
    { _id: 'Deal' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const seqStr = String(counter.seq).padStart(5, '0'); // e.g., '00001'

  return `DEAL-${seqStr}`;
};

module.exports = {
  generateEntityCode,
  reconstructPropertyCode,
  generateDealCode
};
