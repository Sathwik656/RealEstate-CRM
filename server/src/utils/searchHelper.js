'use strict';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * searchHelper.js  —  Reusable MongoDB regex search utilities
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Provides:
 *   SEARCH_FIELDS        — canonical searchable-field lists per collection
 *   buildSearchOr(q, fields) → MongoDB $or clause array
 *   buildSearchFilter(q, fields, baseFilter) → merged Mongoose query filter
 *   parsePage / parseLimit  — safe integer parsers with bounds
 *   buildPagination         — standard pagination envelope
 *
 * Design rules:
 *   • Requires ONLY standard MongoDB / Mongoose — no external dependencies.
 *   • `?q=` expands the match set via $or;  all other filter params narrow it
 *     because MongoDB ANDs top-level fields with the $or clause together.
 *   • An empty / whitespace-only `?q=` is treated as "no text search" so that
 *     callers that always pass the param don't break filter-only queries.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Searchable Field Definitions ────────────────────────────────────────────
// Each array lists every string field that should participate in ?q= matching.
// Add or remove fields here to change search scope without touching controllers.

const SEARCH_FIELDS = {
  /**
   * Property collection
   * Covers the human-readable title, type, purpose, geographic fields and owner.
   */
  property: [
    'propertyTitle',
    'propertyType',
    'purpose',
    'location',
    'landmark',
    'address',
    'propertyDescription',
    'ownerName',
  ],

  /**
   * Seller collection
   * Names, contact details, and location are the most common search targets.
   */
  seller: [
    'sellerName',
    'contactNumber',
    'address',
  ],

  /**
   * Buyer collection
   * Search by person name, contact, or location preferences.
   */
  buyer: [
    'buyerName',
    'contactNumber',
    'preferredLocation',
    'address',
    'landmarkPreference',
  ],

  /**
   * Tenant collection
   * Same pattern as buyers — name, contact, location, employer context.
   */
  tenant: [
    'tenantName',
    'contactNumber',
    'preferredLocation',
    'occupation',
    'companyName',
    'email',
  ],

  /**
   * RentalProperty collection
   * Location and furnishing are the primary discovery fields.
   */
  rental: [
    'location',
    'furnishing',
  ],
};

// ─── buildSearchOr ────────────────────────────────────────────────────────────

/**
 * Builds a MongoDB `$or` array that tests `q` against every field in `fields`
 * using a case-insensitive partial regex.
 *
 * Example:
 *   buildSearchOr('sem', ['location', 'address'])
 *   →  [
 *        { location: { $regex: 'sem', $options: 'i' } },
 *        { address:  { $regex: 'sem', $options: 'i' } },
 *      ]
 *
 * @param {string}   q       Raw query string from ?q=
 * @param {string[]} fields  Field names to search across
 * @returns {object[]}       Array of MongoDB regex condition objects
 */
const buildSearchOr = (q, fields) => {
  // Escape regex special characters so user input like "a.b" or "a*b" is safe
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return fields.map((field) => ({
    [field]: { $regex: escaped, $options: 'i' },
  }));
};

// ─── buildSearchFilter ────────────────────────────────────────────────────────

/**
 * Merges an optional `?q=` global text search with an existing Mongoose filter
 * object that contains numeric / enum / date conditions.
 *
 * Behaviour:
 *   - If `q` is absent or blank → returns `baseFilter` unchanged.
 *   - If `q` is present → attaches `$or` to `baseFilter`.
 *     MongoDB evaluates top-level fields as AND conditions, so the $or clause
 *     works together with any existing filters:
 *
 *     { status: 'Active', $or: [{ location: /sem/i }, { address: /sem/i }] }
 *          ↑  narrowing filter       ↑ expanding text search
 *     Result: only Active records whose location OR address contains "sem"
 *
 * @param {string|undefined} q          Value of ?q= query param
 * @param {string[]}         fields     Searchable fields for this collection
 * @param {object}           baseFilter Already-built Mongoose filter (mutated-safe copy returned)
 * @returns {object}                    Final merged Mongoose filter
 */
const buildSearchFilter = (q, fields, baseFilter = {}) => {
  if (!q || !q.trim()) return baseFilter;

  const orClauses = buildSearchOr(q.trim(), fields);

  // Safety: if baseFilter already has $or (unusual but possible), wrap both
  // in an $and so neither is lost.
  if (baseFilter.$or) {
    return {
      ...baseFilter,
      $and: [
        { $or: baseFilter.$or },
        { $or: orClauses },
      ],
      $or: undefined, // remove the top-level $or to avoid MongoDB conflict
    };
  }

  return { ...baseFilter, $or: orClauses };
};

// ─── Pagination helpers ───────────────────────────────────────────────────────

/** Safely parse page number; clamp to ≥ 1. */
const parsePage  = (p)  => Math.max(1, parseInt(p,  10) || 1);

/** Safely parse limit; clamp to [1, 100]. */
const parseLimit = (l)  => Math.min(100, Math.max(1, parseInt(l, 10) || 10));

/**
 * Returns the standard pagination envelope used across all search responses.
 * @returns {{ total: number, page: number, limit: number, pages: number }}
 */
const buildPagination = (total, page, limit) => ({
  total,
  page,
  limit,
  pages: Math.ceil(total / limit),
});

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  SEARCH_FIELDS,
  buildSearchOr,
  buildSearchFilter,
  parsePage,
  parseLimit,
  buildPagination,
};
