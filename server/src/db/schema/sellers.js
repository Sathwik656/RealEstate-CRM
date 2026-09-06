'use strict';
const { pgTable, text, uuid, timestamp, index } = require('drizzle-orm/pg-core');
const { users } = require('./users');

const sellers = pgTable(
  'sellers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sellerId: text('seller_id').notNull().unique(),
    sellerName: text('seller_name').notNull(),
    contactNumber: text('contact_number').notNull(),
    address: text('address'),
    note: text('note'),
    createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id),
    referredByAgentId: uuid('referred_by_agent_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('sellers_created_by_user_id_idx').on(table.createdByUserId),
    index('sellers_referred_by_agent_id_idx').on(table.referredByAgentId),
    index('sellers_created_at_idx').on(table.createdAt),
  ]
);

module.exports = { sellers };