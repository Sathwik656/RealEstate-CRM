'use strict';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * searchService.js  —  Hybrid MongoDB + Fuse.js search engine
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * HOW IT WORKS (two-stage pipeline):
 *
 *   Stage A — MongoDB candidate retrieval
 *     • Builds a broad $or regex query across all searchable fields.
 *     • Fetches up to CANDIDATE_LIMIT (1 000) documents that MIGHT match.
 *     • Applies baseFilter (createdBy, status, dates, etc.) so only the
 *       current user's records enter the fuzzy stage.
 *     • Special handling for BHK queries and phone-number fragments.
 *
 *   Stage B — Fuse.js in-memory fuzzy ranking
 *     • Runs against the candidate set (plain JS objects, not Mongoose docs).
 *     • Weighted keys ensure names/phones score higher than notes/descriptions.
 *     • threshold: 0.35 allows ~1-2 character typos (resma → Reshma).
 *     • ignoreLocation: true lets matches appear anywhere in a long string.
 *
 *   Stage C — Result merging & ranking
 *     • Splits results into three priority tiers:
 *         1. Exact  — raw string contains query as a substring (score ≈ 0)
 *         2. Strong — Fuse score < 0.15
 *         3. Fuzzy  — Fuse score 0.15–0.35
 *     • Deduplicates by MongoDB _id.
 *     • Returns top MAX_RESULTS (50) items as lean Mongoose documents.
 *
 * Public API:
 *   hybridSearch(Model, q, fuseKeys, mongoFields, baseFilter, opts)
 *     → Promise<{ results: Document[], total: number }>
 *
 * Utility exports (also available for use in controllers):
 *   normalizeQuery(q)   → trimmed lowercase string
 *   normalizeBhk(q)     → canonical "N bhk" or null
 *   isPhoneQuery(q)     → true when query is digit-only fragment
 *   buildMongoOr(q, fields) → MongoDB $or clause array
 * ─────────────────────────────────────────────────────────────────────────────
 */

const Fuse = require('fuse.js');

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum documents pulled from MongoDB before fuzzy ranking. */
const CANDIDATE_LIMIT = 1000;

/** Maximum results returned after Fuse.js ranking. */
const MAX_RESULTS = 50;

/**
 * Fuse.js base configuration.
 * threshold: 0.35 — tolerates up to ~35 % character-level difference,
 *   which covers 1-2 char typos in typical CRM name lengths (7–12 chars).
 * ignoreLocation: true — match anywhere in the field value, not just at start.
 * minMatchCharLength: 2 — avoids noise from single-character searches.
 */
const FUSE_BASE_OPTIONS = {
  includeScore : true,
  shouldSort   : true,
  threshold    : 0.35,
  ignoreLocation : true,
  minMatchCharLength : 2,
};

// ─── Query Normalisation Utilities ────────────────────────────────────────────

/**
 * Lowercases and trims the raw query string.
 * @param {string} q
 * @returns {string}
 */
const normalizeQuery = (q) => (q || '').trim().toLowerCase();

/**
 * Detects and normalises BHK variant queries.
 *
 * Recognises all of:
 *   "1bhk"  "1 bhk"  "1-bhk"  "1-BHK"  "1BHK"  "2 BHK"  "3-BHK"
 *
 * Returns canonical form "N bhk" (e.g. "2 bhk") or null if not a BHK query.
 *
 * @param {string} q  Already-lowercased query
 * @returns {{ canonical: string, digit: number } | null}
 */
const normalizeBhk = (q) => {
  // Matches optional digit, optional separator, "bhk"
  const match = q.match(/^(\d)\s*[-]?\s*bhk$/i);
  if (!match) return null;
  const digit = parseInt(match[1], 10);
  return { canonical: `${digit} bhk`, digit };
};

/**
 * Returns true when the query is composed entirely of digits (after stripping
 * spaces and dashes) — indicating a phone number fragment search.
 *
 * @param {string} q  Already-lowercased query
 * @returns {boolean}
 */
const isPhoneQuery = (q) => /^[\d\s\-]+$/.test(q) && /\d{3,}/.test(q);

/**
 * Escapes regex special characters so user input is safe for MongoDB $regex.
 * @param {string} str
 * @returns {string}
 */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ─── MongoDB Candidate Stage ──────────────────────────────────────────────────

/**
 * Builds a MongoDB `$or` array that tests `q` against every field in `fields`
 * using a case-insensitive partial regex.
 *
 * @param {string}   q       Normalised query string
 * @param {string[]} fields  Field names to search across
 * @returns {object[]}
 */
const buildMongoOr = (q, fields) => {
  const escaped = escapeRegex(q);
  return fields.map((field) => ({
    [field]: { $regex: escaped, $options: 'i' },
  }));
};

/**
 * Builds the full MongoDB filter for the candidate-retrieval stage.
 *
 * Merges:
 *   1. baseFilter  — structured filters (createdBy, status, budget, dates…)
 *   2. $or clauses — broad regex across all searchable text fields
 *   3. BHK exact   — when query looks like "N bhk", also match numeric bhk field
 *   4. Phone exact — when query is all digits, target contactNumber only
 *
 * If baseFilter already contains a $or, both are wrapped in $and to avoid
 * MongoDB conflict (MongoDB only allows one top-level $or per document).
 *
 * @param {string}   q          Normalised query
 * @param {string[]} mongoFields Text fields to regex-search
 * @param {object}   baseFilter  Pre-built structured filter from controller
 * @returns {object}             MongoDB filter object
 */
const buildCandidateFilter = (q, mongoFields, baseFilter) => {
  if (!q) return baseFilter;

  const bhkInfo = normalizeBhk(q);
  const phoneMode = isPhoneQuery(q);

  let orClauses;

  if (phoneMode) {
    // Phone-number fragment: search contactNumber / phone fields only
    const digits = q.replace(/[\s\-]/g, '');
    const escaped = escapeRegex(digits);
    orClauses = ['contactNumber', 'phone'].map((f) => ({
      [f]: { $regex: escaped, $options: 'i' },
    }));
  } else {
    orClauses = buildMongoOr(q, mongoFields);

    // BHK: additionally match the numeric bhk/bhkRequirement field
    if (bhkInfo) {
      orClauses.push({ bhk: bhkInfo.digit });
      orClauses.push({ bhkRequirement: bhkInfo.digit });
    }
  }

  // Merge with baseFilter safely
  if (baseFilter.$or) {
    // If baseFilter already has $or (unusual but possible from controllers),
    // wrap both in $and so neither is dropped.
    return {
      ...baseFilter,
      $or: undefined,
      $and: [
        ...(baseFilter.$and || []),
        { $or: baseFilter.$or },
        { $or: orClauses },
      ],
    };
  }

  return { ...baseFilter, $or: orClauses };
};

// ─── Fuse.js Ranking Stage ────────────────────────────────────────────────────

/**
 * Converts a Mongoose document (or lean object) into a plain JS object
 * suitable for Fuse.js indexing. Also pre-processes BHK fields into a
 * human-readable string so fuzzy matching works naturally.
 *
 * e.g. { bhk: 2 } → { bhk: 2, _bhkStr: "2 bhk" }
 *
 * @param {object} doc  Mongoose lean document
 * @returns {object}    Annotated plain object
 */
const prepareForFuse = (doc) => {
  const obj = doc.toObject ? doc.toObject() : { ...doc };

  // Stringify numeric BHK fields so Fuse can match "2 bhk" as text
  if (obj.bhk != null) {
    obj._bhkStr = `${obj.bhk} bhk`;
  }
  if (obj.bhkRequirement != null) {
    obj._bhkStr = `${obj.bhkRequirement} bhk`;
  }

  return obj;
};

/**
 * Runs Fuse.js fuzzy search against a candidate array and returns ranked
 * results split into priority tiers.
 *
 * Tier definitions (lower Fuse score = better match):
 *   Tier 1 (exact)  — score === 0, OR the raw field value contains `q` as a
 *                      plain substring (case-insensitive). Catches cases where
 *                      Fuse assigns a non-zero score to clear substrings.
 *   Tier 2 (strong) — score < 0.15
 *   Tier 3 (fuzzy)  — score < threshold (0.35)
 *
 * @param {object[]} candidates  Plain JS objects (from prepareForFuse)
 * @param {string}   q           Normalised query
 * @param {object[]} fuseKeys    Weighted key definitions
 * @returns {{ tier: number, score: number, item: object }[]}  Sorted flat list
 */
const runFuse = (candidates, q, fuseKeys) => {
  if (!candidates.length) return [];

  const fuse = new Fuse(candidates, {
    ...FUSE_BASE_OPTIONS,
    keys: fuseKeys,
  });

  const fuseResults = fuse.search(q);

  // ── Classify into tiers ──────────────────────────────────────────────────
  const classified = fuseResults.map(({ item, score }) => {
    const s = score ?? 1;

    // Tier 1: any field contains q as a plain substring
    const isExact = isSubstringMatch(item, q);

    let tier;
    if (isExact || s < 0.01) {
      tier = 1;
    } else if (s < 0.15) {
      tier = 2;
    } else {
      tier = 3;
    }

    return { tier, score: s, item };
  });

  // Sort: tier ASC, then score ASC (better Fuse scores first within tier)
  classified.sort((a, b) =>
    a.tier !== b.tier ? a.tier - b.tier : a.score - b.score
  );

  return classified;
};

/**
 * Returns true if any string value in `obj` contains `q` as a case-insensitive
 * substring. Used to detect exact/partial matches for tier classification.
 *
 * @param {object} obj  Plain JS document object
 * @param {string} q    Normalised query
 * @returns {boolean}
 */
const isSubstringMatch = (obj, q) => {
  const lq = q.toLowerCase();
  return Object.values(obj).some((val) => {
    if (typeof val === 'string') return val.toLowerCase().includes(lq);
    if (typeof val === 'number') return String(val).includes(lq);
    return false;
  });
};

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * hybridSearch — the main entry point for all CRM search handlers.
 *
 * @param {mongoose.Model} Model        Mongoose model to query
 * @param {string}         q            Raw query from ?q= (may be undefined)
 * @param {object[]}       fuseKeys     Fuse.js weighted key definitions
 * @param {string[]}       mongoFields  Fields to include in MongoDB $or regex
 * @param {object}         baseFilter   Pre-built structured filter (from controller)
 * @param {object}         [opts]       Optional overrides
 * @param {number}         [opts.candidateLimit=1000]  Max docs from MongoDB
 * @param {number}         [opts.maxResults=50]        Max results after Fuse
 * @param {object}         [opts.populate]             Mongoose populate config
 *
 * @returns {Promise<{ results: object[], total: number }>}
 *   results — ranked array of lean Mongoose documents (up to maxResults)
 *   total   — count of Fuse-ranked results (before slicing for pagination)
 */
const hybridSearch = async (Model, q, fuseKeys, mongoFields, baseFilter, opts = {}) => {
  const {
    candidateLimit = CANDIDATE_LIMIT,
    maxResults = MAX_RESULTS,
    populate = null,
  } = opts;

  const normalised = normalizeQuery(q);

  // ── Stage A: MongoDB candidate retrieval ─────────────────────────────────
  const candidateFilter = buildCandidateFilter(normalised, mongoFields, baseFilter);

  let query = Model.find(candidateFilter)
    .sort({ createdAt: -1 })
    .limit(candidateLimit)
    .lean();        // lean() returns plain JS objects — faster, and Fuse-compatible

  if (populate) {
    query = query.populate(populate);
  }

  const candidates = await query;

  // If no query string, return MongoDB results as-is (no fuzzy pass needed)
  if (!normalised) {
    return { results: candidates, total: candidates.length };
  }

  // ── Stage B: Prepare candidates for Fuse.js ──────────────────────────────
  const fuseReady = candidates.map(prepareForFuse);

  // ── Stage C: Fuse.js fuzzy ranking ──────────────────────────────────────
  const ranked = runFuse(fuseReady, normalised, fuseKeys);

  // ── Stage D: Deduplicate and cap ─────────────────────────────────────────
  const seen = new Set();
  const deduped = [];

  for (const { item } of ranked) {
    const id = String(item._id);
    if (!seen.has(id)) {
      seen.add(id);
      deduped.push(item);
    }
    if (deduped.length >= maxResults) break;
  }

  return { results: deduped, total: deduped.length };
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  hybridSearch,
  // Utility exports — useful in controllers or tests
  normalizeQuery,
  normalizeBhk,
  isPhoneQuery,
  buildMongoOr,
  buildCandidateFilter,
  CANDIDATE_LIMIT,
  MAX_RESULTS,
};
