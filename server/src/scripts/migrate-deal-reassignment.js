'use strict';
/**
 * Migration script: migrate-deal-reassignment.js
 *
 * Run ONCE before deploying the new deal reassignment feature.
 *
 * What this does:
 *  1. Sets Deal.currentAgentId = Deal.agentId on all active (non-completed) deals
 *  2. Sets PropertyInterest.status = 'selected' for interests matching active deal agents
 *  3. Sets PropertyInterest.status = 'interested' for all other interests (default backfill)
 *  4. Creates initial DealAssignment records for all existing active deals
 *
 * Usage:
 *   node src/scripts/migrate-deal-reassignment.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');

// Models
const Deal = require('../models/Deal');
const DealAssignment = require('../models/DealAssignment');
const PropertyInterest = require('../models/PropertyInterest');

const connectDB = require('../config/db');

async function migrate() {
  await connectDB();
  console.log('✅ Connected to MongoDB');

  // ─── Step 1: Backfill currentAgentId on all Deals ────────────────────────────
  console.log('\n[1/4] Backfilling currentAgentId on deals...');
  const dealResult = await Deal.updateMany(
    { currentAgentId: null },
    [{ $set: { currentAgentId: '$agentId' } }]
  );
  console.log(`  ↳ Updated ${dealResult.modifiedCount} deals`);

  // ─── Step 2: Set PropertyInterest.status = 'interested' for all (default) ────
  console.log('\n[2/4] Backfilling PropertyInterest status to "interested"...');
  const interestResult = await PropertyInterest.updateMany(
    { status: { $exists: false } },
    { $set: { status: 'interested' } }
  );
  console.log(`  ↳ Updated ${interestResult.modifiedCount} interest records`);

  // ─── Step 3: Mark 'selected' for agents with active deals ────────────────────
  console.log('\n[3/4] Marking interest status = "selected" for active deal agents...');
  const activeDeals = await Deal.find({ status: { $in: ['ongoing', 'unassign_requested', 'pending_approval'] } });

  let selectedCount = 0;
  for (const deal of activeDeals) {
    if (!deal.currentAgentId) continue;
    const updated = await PropertyInterest.updateOne(
      { propertyId: deal.propertyId, agentId: deal.currentAgentId },
      { $set: { status: 'selected' } }
    );
    if (updated.modifiedCount) selectedCount++;

    // Set other interests for this property to 'waiting'
    await PropertyInterest.updateMany(
      {
        propertyId: deal.propertyId,
        agentId: { $ne: deal.currentAgentId },
        status: 'interested',
      },
      { $set: { status: 'waiting' } }
    );
  }
  console.log(`  ↳ Marked ${selectedCount} interests as "selected"`);

  // ─── Step 4: Create initial DealAssignment records for existing active deals ──
  console.log('\n[4/4] Creating DealAssignment history for existing deals...');
  let assignmentCount = 0;
  for (const deal of activeDeals) {
    if (!deal.currentAgentId) continue;
    const exists = await DealAssignment.findOne({ dealId: deal._id, assignmentType: 'initial' });
    if (!exists) {
      await DealAssignment.create({
        dealId: deal._id,
        propertyId: deal.propertyId,
        agentId: deal.currentAgentId,
        assignedBy: deal.currentAgentId, // best guess — admin not tracked on old deals
        assignmentType: 'initial',
        previousAgentId: null,
        reason: 'Migrated from pre-reassignment system',
      });
      assignmentCount++;
    }
  }
  console.log(`  ↳ Created ${assignmentCount} DealAssignment records`);

  console.log('\n✅ Migration complete!\n');
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
