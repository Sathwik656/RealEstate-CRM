'use strict';

/**
 * Calculates a weighted match percentage between a buyer's requirements and a property.
 * @param {Object} buyer - The buyer document
 * @param {Object} property - The property document
 * @returns {number} matchPercentage (0-100)
 */
const calculateMatchPercentage = (buyer, property) => {
  let score = 0;
  let maxPossible = 0;
  
  if (buyer.purpose) {
    maxPossible += 30;
    if (property.purpose === buyer.purpose) score += 30;
  }
  
  if (buyer.preferredPropertyDivisions && buyer.preferredPropertyDivisions.length > 0) {
    maxPossible += 10;
    if (buyer.preferredPropertyDivisions.includes(property.propertyDivision)) score += 10;
  }
  
  if (buyer.preferredPropertyTypes && buyer.preferredPropertyTypes.length > 0) {
    maxPossible += 15;
    if (buyer.preferredPropertyTypes.includes(property.propertyType)) score += 15;
  }
  
  if (buyer.preferredLocation) {
    maxPossible += 20;
    const locName = property.location?.location?.toLowerCase() || '';
    const locCode = property.location?.code?.toLowerCase() || '';
    const pref = buyer.preferredLocation.toLowerCase();
    if (locName.includes(pref) || pref.includes(locName) || locCode === pref) {
      score += 20;
    }
  }
  
  if (buyer.budgetMax) {
    maxPossible += 15;
    if (property.price && property.price <= buyer.budgetMax) {
      score += 15;
    } else if (property.price && property.price <= buyer.budgetMax * 1.1) {
      score += 7.5; // Half points for being slightly over budget
    }
  }
  
  if (buyer.bhkRequirement) {
    maxPossible += 5;
    if (property.bhk === buyer.bhkRequirement) score += 5;
  }
  
  if (buyer.areaRequirement) {
    if (property.area !== undefined && property.area !== null) {
      maxPossible += 5;
      if (property.area >= buyer.areaRequirement) score += 5;
    }
  }

  if (buyer.minArea || buyer.maxArea) {
    if (property.area !== undefined && property.area !== null) {
      maxPossible += 5;
      let areaScore = 5;
      if (buyer.minArea && property.area < buyer.minArea) areaScore = 0;
      if (buyer.maxArea && property.area > buyer.maxArea) areaScore = 0;
      score += areaScore;
    }
  }
  
  return maxPossible > 0 ? Math.round((score / maxPossible) * 100) : 0;
};

module.exports = {
  calculateMatchPercentage
};
