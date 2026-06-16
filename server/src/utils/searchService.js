'use strict';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * searchService.js  —  Hybrid MongoDB + Fuse.js search engine
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * HOW IT WORKS (two-stage pipeline):
 *
 *   Stage A — MongoDB candidate retrieval  (ENHANCED: two-pass)
 *
 *     Pass 1 — Primary regex
 *       Searches all mongoFields with case-insensitive regex of the full query.
 *       Also adds 3-gram substrings from the query as extra $or conditions so
 *       that typos with partial overlap still return candidates.
 *
 *         "saloja" → 3-grams: ["sal","alo","loj","oja"]
 *         MongoDB finds "Saroja" because it contains "oja" and "sa".
 *
 *     Pass 2 — Fallback broad pool  (triggered when Pass 1 < FALLBACK_THRESHOLD)
 *       Fetches the user's most recent FALLBACK_POOL_SIZE records with NO text
 *       filter (only baseFilter: createdBy, status, etc.).
 *       This guarantees coverage for severe typos where even n-grams don't help.
 *       The two pools are merged (deduplicated by _id) before fuzzy ranking.
 *
 *   Stage B — Fuse.js in-memory fuzzy ranking
 *     Runs against the full merged candidate set.
 *     threshold: 0.4 catches up to ~2 character mutations in typical names.
 *     ignoreLocation: true lets matches appear anywhere in a field value.
 *
 *   Stage C — Result merging & ranking
 *     Priority tiers:
 *       1. Exact substring matches (score ≈ 0 or raw string contains query)
 *       2. Strong fuzzy  (score < 0.15)
 *       3. Moderate fuzzy (score 0.15–0.4)
 *     Deduplicated by _id, capped at MAX_RESULTS (50).
 *
 * Public API:
 *   hybridSearch(Model, q, fuseKeys, mongoFields, baseFilter, opts)
 *     → Promise<{ results: object[], total: number }>
 *
 * Utility exports:
 *   normalizeQuery, normalizeBhk, isPhoneQuery, buildMongoOr,
 *   buildCandidateFilter, generateNgrams
 * ─────────────────────────────────────────────────────────────────────────────
 */

const Fuse = require('fuse.js');

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum documents pulled from the primary regex pass. */
const CANDIDATE_LIMIT = 1000;

/** Maximum results returned after Fuse.js ranking. */
const MAX_RESULTS = 50;

/**
 * If the primary regex pass returns fewer than this many documents, the
 * fallback broad-pool pass is triggered.  This handles typos where even
 * n-gram-enhanced regex fails to surface the target record.
 */
const FALLBACK_THRESHOLD = 20;

/**
 * How many recent records to fetch in the fallback pass.
 * These are fetched with only the structured baseFilter (no text condition).
 * For a CRM where most users have < 500 records per collection, this covers
 * the entire active dataset in memory for fuzzy ranking.
 */
const FALLBACK_POOL_SIZE = 500;

/**
 * Fuse.js base configuration.
 *
 * threshold: 0.4
 *   Allows up to ~2 character mutations (insert / delete / substitute) in
 *   typical CRM name lengths (6–12 chars).
 *   Examples that now work:
 *     "saloja"  → Saroja   (1 edit: l→r)
 *     "rajndra" → Rajendra (1 missing char)
 *     "resma"   → Reshma   (1 missing char)
 *
 * ignoreLocation: true
 *   Matches anywhere in the field value, not just near position 0.
 *   Critical for long fields like address or propertyDescription.
 *
 * minMatchCharLength: 2
 *   Avoids single-character noise matches.
 */
const FUSE_BASE_OPTIONS = {
  includeScore      : true,
  shouldSort        : true,
  threshold         : 0.4,
  ignoreLocation    : true,
  minMatchCharLength: 2,
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
 * Recognises: "1bhk"  "1 bhk"  "1-bhk"  "1-BHK"  "1BHK"  "2 BHK"  "3-BHK"
 *
 * @param {string} q  Already-lowercased query
 * @returns {{ canonical: string, digit: number } | null}
 */
const normalizeBhk = (q) => {
  const match = q.match(/^(\d)\s*[-]?\s*bhk$/i);
  if (!match) return null;
  const digit = parseInt(match[1], 10);
  return { canonical: `${digit} bhk`, digit };
};

/**
 * Returns true when the query is a digit-only fragment (phone number search).
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

// ─── N-gram Generation ────────────────────────────────────────────────────────

/**
 * Generates all unique n-gram (sliding window of length n) substrings from str.
 *
 * Used to broaden candidate retrieval for typo-tolerant fuzzy search:
 *   "saloja" → 3-grams: ["sal", "alo", "loj", "oja"]
 *
 * The n-grams are searched alongside the full query in the MongoDB $or clause.
 * Because "Saroja" contains both "sa" and "oja", it becomes a candidate even
 * though the full regex /saloja/i would not match it.
 *
 * Only used for queries >= MIN_NGRAM_QUERY_LEN to avoid over-broad matches
 * from very short n-grams on short queries.
 *
 * @param {string} str   String to tokenise
 * @param {number} n     Token length (default 3)
 * @returns {string[]}   Unique n-gram tokens
 */
const generateNgrams = (str, n = 3) => {
  if (str.length <= n) return [str];
  const tokens = new Set();
  for (let i = 0; i <= str.length - n; i++) {
    tokens.add(str.substring(i, i + n));
  }
  return [...tokens];
};

/** Minimum query length before n-gram enhancement kicks in. */
const MIN_NGRAM_QUERY_LEN = 4;

// ─── MongoDB Candidate Stage ──────────────────────────────────────────────────

/**
 * Builds a MongoDB `$or` array for a single search term against all fields.
 *
 * @param {string}   term    The search term (escaped before use)
 * @param {string[]} fields  Field names
 * @returns {object[]}
 */
const buildMongoOr = (term, fields) => {
  const escaped = escapeRegex(term);
  return fields.map((field) => ({
    [field]: { $regex: escaped, $options: 'i' },
  }));
};

/**
 * Builds an ENHANCED $or array that includes:
 *   1. The full query regex (exact/partial match — fast)
 *   2. 3-gram substrings of the query (typo broadening)
 *
 * The 3-gram component ensures that a misspelled query like "saloja" still
 * retrieves "Saroja" from MongoDB because several 3-gram tokens overlap.
 *
 * N-gram clauses are only generated for queries >= MIN_NGRAM_QUERY_LEN chars
 * to prevent too-broad matching on very short queries.
 *
 * @param {string}   q       Normalised full query
 * @param {string[]} fields  Fields to search
 * @returns {object[]}
 */
const buildEnhancedMongoOr = (q, fields) => {
  // Start with the full-query regex clauses
  const clauses = buildMongoOr(q, fields);

  // Add 3-gram alternatives for typo tolerance
  if (q.length >= MIN_NGRAM_QUERY_LEN) {
    const ngrams = generateNgrams(q, 3);
    for (const gram of ngrams) {
      // Skip grams that are too generic on their own
      if (gram.length < 3) continue;
      const escaped = escapeRegex(gram);
      for (const field of fields) {
        clauses.push({ [field]: { $regex: escaped, $options: 'i' } });
      }
    }
  }

  return clauses;
};

/**
 * Builds the full MongoDB filter for candidate retrieval.
 *
 * Merges:
 *   1. baseFilter  — structured filters (createdBy, status, budget, dates…)
 *   2. $or clauses — enhanced regex (full query + n-grams) across all text fields
 *   3. BHK exact   — when query looks like "N bhk", also match numeric bhk field
 *   4. Phone exact — when query is all digits, target contactNumber field only
 *
 * @param {string}   q          Normalised query
 * @param {string[]} mongoFields Text fields to regex-search
 * @param {object}   baseFilter  Pre-built structured filter from controller
 * @returns {object}             MongoDB filter object
 */
const buildCandidateFilter = (q, mongoFields, baseFilter) => {
  if (!q) return baseFilter;

  const bhkInfo   = normalizeBhk(q);
  const phoneMode = isPhoneQuery(q);

  let orClauses;

  if (phoneMode) {
    // Phone-number fragment: target contactNumber / phone only (digits)
    const digits  = q.replace(/[\s\-]/g, '');
    const escaped = escapeRegex(digits);
    orClauses = ['contactNumber', 'phone'].map((f) => ({
      [f]: { $regex: escaped, $options: 'i' },
    }));
  } else {
    // Full text: use enhanced OR (full query + n-gram broadening)
    orClauses = buildEnhancedMongoOr(q, mongoFields);

    // BHK: additionally match the numeric bhk / bhkRequirement field
    if (bhkInfo) {
      orClauses.push({ bhk: bhkInfo.digit });
      orClauses.push({ bhkRequirement: bhkInfo.digit });
    }
  }

  // Merge with baseFilter safely — avoid MongoDB $or conflict
  if (baseFilter.$or) {
    return {
      ...baseFilter,
      $or : undefined,
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
 * Converts a Mongoose lean document into a plain JS object annotated with
 * a human-readable BHK string so Fuse.js can match "2 bhk" as text.
 *
 * @param {object} doc  Mongoose lean document
 * @returns {object}
 */
const prepareForFuse = (doc) => {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  if (obj.bhk           != null) obj._bhkStr = `${obj.bhk} bhk`;
  if (obj.bhkRequirement != null) obj._bhkStr = `${obj.bhkRequirement} bhk`;
  return obj;
};

/**
 * Runs Fuse.js fuzzy search against a candidate array and classifies results
 * into priority tiers.
 *
 * Tier 1 (exact)  — score ≈ 0 OR any field contains the query as a substring
 * Tier 2 (strong) — score < 0.15
 * Tier 3 (fuzzy)  — score < threshold (0.4)
 *
 * @param {object[]} candidates  Plain JS objects (from prepareForFuse)
 * @param {string}   q           Normalised query
 * @param {object[]} fuseKeys    Weighted key definitions
 * @returns {{ tier: number, score: number, item: object }[]}  Sorted flat list
 */
const runFuse = (candidates, q, fuseKeys) => {
  if (!candidates.length) return [];

  const fuse = new Fuse(candidates, { ...FUSE_BASE_OPTIONS, keys: fuseKeys });
  const fuseResults = fuse.search(q);

  const classified = fuseResults.map(({ item, score }) => {
    const s = score ?? 1;
    const isExact = isSubstringMatch(item, q);
    let tier;
    if (isExact || s < 0.01) tier = 1;
    else if (s < 0.15)       tier = 2;
    else                     tier = 3;
    return { tier, score: s, item };
  });

  // Sort: tier ASC, then score ASC (lower Fuse score = better)
  classified.sort((a, b) =>
    a.tier !== b.tier ? a.tier - b.tier : a.score - b.score
  );

  return classified;
};

/**
 * Returns true if any string/number field value in `obj` contains `q` as a
 * case-insensitive substring.  Used for Tier-1 (exact) classification.
 *
 * @param {object} obj
 * @param {string} q
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
 * Two-pass candidate retrieval strategy:
 *
 *   Pass 1 — Primary (n-gram enhanced regex)
 *     Searches mongoFields with full query + 3-gram alternatives.
 *     Retrieves up to candidateLimit (1 000) documents.
 *
 *   Pass 2 — Fallback (broad recent pool)
 *     Triggered when Pass 1 returns < FALLBACK_THRESHOLD results.
 *     Fetches baseFilter-only records (no text condition) sorted by createdAt.
 *     Merged with Pass 1 results (deduplicated by _id).
 *
 *   This two-pass design ensures that even severe typos ("saloja" → "Saroja",
 *   2-char mistakes in short names) find their target because the target record
 *   enters the candidate pool via the fallback, and Fuse.js then scores it
 *   correctly based on character-level similarity.
 *
 * @param {mongoose.Model} Model        Mongoose model to query
 * @param {string}         q            Raw query from ?q= (may be undefined)
 * @param {object[]}       fuseKeys     Fuse.js weighted key definitions
 * @param {string[]}       mongoFields  Fields for MongoDB $or regex
 * @param {object}         baseFilter   Pre-built structured filter
 * @param {object}         [opts]
 * @param {number}         [opts.candidateLimit=1000]
 * @param {number}         [opts.maxResults=50]
 * @param {string|object}  [opts.populate]  Mongoose populate config
 *
 * @returns {Promise<{ results: object[], total: number }>}
 */
const hybridSearch = async (Model, q, fuseKeys, mongoFields, baseFilter, opts = {}) => {
  const {
    candidateLimit = CANDIDATE_LIMIT,
    maxResults     = MAX_RESULTS,
    populate       = null,
  } = opts;

  const normalised = normalizeQuery(q);

  // ── If no query: return plain MongoDB results (no fuzzy pass) ───────────
  if (!normalised) {
    let query = Model.find(baseFilter).sort({ createdAt: -1 }).limit(candidateLimit).lean();
    if (populate) query = query.populate(populate);
    const docs = await query;
    return { results: docs, total: docs.length };
  }

  // ── Pass 1: Primary regex (n-gram enhanced) ──────────────────────────────
  const primaryFilter = buildCandidateFilter(normalised, mongoFields, baseFilter);

  let primaryQuery = Model.find(primaryFilter).sort({ createdAt: -1 }).limit(candidateLimit).lean();
  if (populate) primaryQuery = primaryQuery.populate(populate);
  const primaryCandidates = await primaryQuery;

  // ── Pass 2: Fallback broad pool (when primary is sparse) ────────────────
  // Triggered when the regex + n-gram pass returns too few documents to give
  // Fuse.js a meaningful candidate set.  We fetch the user's recent records
  // with only the structured base filter (createdBy, status, etc.) so that
  // any record in the user's dataset can be fuzzy-matched, regardless of
  // whether it contains a matching substring.
  let candidates = primaryCandidates;

  if (primaryCandidates.length < FALLBACK_THRESHOLD) {
    let fallbackQuery = Model.find(baseFilter)
      .sort({ createdAt: -1 })
      .limit(FALLBACK_POOL_SIZE)
      .lean();
    if (populate) fallbackQuery = fallbackQuery.populate(populate);
    const fallbackCandidates = await fallbackQuery;

    // Merge: primary first, then any fallback doc not already present
    const seen = new Set(primaryCandidates.map((d) => String(d._id)));
    const merged = [...primaryCandidates];
    for (const doc of fallbackCandidates) {
      const id = String(doc._id);
      if (!seen.has(id)) {
        seen.add(id);
        merged.push(doc);
      }
    }
    candidates = merged;
  }

  // ── Stage B: Prepare for Fuse.js ─────────────────────────────────────────
  const fuseReady = candidates.map(prepareForFuse);

  // ── Stage C: Fuse.js fuzzy ranking ──────────────────────────────────────
  const ranked = runFuse(fuseReady, normalised, fuseKeys);

  // ── Stage D: Deduplicate and cap ─────────────────────────────────────────
  const seen    = new Set();
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
  normalizeQuery,
  normalizeBhk,
  isPhoneQuery,
  buildMongoOr,
  buildCandidateFilter,
  generateNgrams,
  CANDIDATE_LIMIT,
  FALLBACK_THRESHOLD,
  FALLBACK_POOL_SIZE,
  MAX_RESULTS,
};
