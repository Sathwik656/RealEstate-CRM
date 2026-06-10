'use strict';

/**
 * Generates a unique ID with a given prefix.
 * Format: PREFIX-XXXXXX (6 random uppercase alphanumeric characters)
 * Examples: PROP-A3F7K2, SEL-XB92LM, BUY-KP34MZ
 *
 * @param {string} prefix - The prefix string (e.g., "PROP", "SEL", "BUY")
 * @returns {string} Generated ID
 */
const generateId = (prefix) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return `${prefix}-${result}`;
};

module.exports = { generateId };
