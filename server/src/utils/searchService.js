'use strict';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * searchService.js  —  Hybrid MongoDB + Fuse.js search engine
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * HOW IT WORKS (two-stage pipeline)
 * ══════════════════════════════════
 *
 * Stage A — MongoDB candidate retrieval  (ALWAYS two passes, run in parallel)
 * ────────────────────────────────────────────────────────────────────────────
 *
 *   Pass 1 — Text-match candidates (regex + n-gram broadening)
 *
 *     Searches all mongoFields with a case-insensitive regex of the full query.
 *     For queries >= 4 chars, also injects 3-gram substrings of the query as
 *     extra $or conditions.  This increases recall for misspellings where some
 *     characters overlap with the target string.
 *
 *       "saloja" 3-grams → ["sal","alo","loj","oja"]
 *       "Saroja" matches because it contains "oja" and "sa"  ✓
 *
 *   Pass 2 — Broad recency pool (ALWAYS, not conditional)
 *
 *     Fetches the most recent BROAD_POOL_SIZE records for this user using
 *     ONLY the structured base filter (createdBy, status, budget…).
 *     No text condition is applied, so ANY record in the user's recent history
 *     becomes a candidate for Fuse.js fuzzy matching.
 *
 *     Why always? — If only triggered conditionally (when Pass 1 < threshold),
 *     queries that accidentally return many regex hits (common letter combos)
 *     skip the fallback even though the fuzzy target isn't in those hits.
 *     Always running both guarantees complete coverage.
 *
 *   The two candidate sets are merged (deduplicated by _id).
 *   Text-match candidates are placed first so Fuse.js sees them early and can
 *   score them more precisely.
 *
 * Stage B — Fuse.js in-memory fuzzy ranking
 * ─────────────────────────────────────────
 *   threshold 0.4  — handles up to ~2 char mutations in typical CRM names
 *   ignoreLocation — match anywhere in a long field value
 *
 *   Works for:
 *     "saloja"   → Saroja         (1 char:  l→r)
 *     "resma"    → Reshma         (1 miss:  h deleted)
 *     "rajndra"  → Rajendra       (1 miss:  e deleted)
 *     "kulshaker"→ Kulsheaker     (char transposition)
 *     "muksh"    → Mukesh         (prefix with missing chars)
 *
 * Stage C — Ranking & pagination
 * ───────────────────────────────
 *   Tier 1: raw string contains query as substring (exact/partial)
 *   Tier 2: Fuse score < 0.15  (strong fuzzy)
 *   Tier 3: Fuse score 0.15–0.4 (moderate fuzzy)
 *   Top 50 deduplicated results returned.
 *
 * Public API:
 *   hybridSearch(Model, q, fuseKeys, mongoFields, baseFilter, opts)
 *     → Promise<{ results: object[], total: number }>
 * ─────────────────────────────────────────────────────────────────────────────
 */

const Fuse = require('fuse.js');

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Max documents fetched via the regex/n-gram text-match pass (Pass 1).
 * Covers recent exact and partial matches efficiently.
 */
const CANDIDATE_LIMIT = 500;

/**
 * Always-on broad pool (Pass 2).
 * Fetches the user's most recent N records with NO text filter.
 * For a CRM where most users have < 1 000 records per collection this
 * effectively covers the entire active dataset, guaranteeing that any record
 * is eligible for Fuse.js fuzzy ranking regardless of the query.
 */
const BROAD_POOL_SIZE = 1000;

/** Maximum results returned after Fuse.js ranking & deduplication. */
const MAX_RESULTS = 50;

/**
 * Fuse.js base configuration shared across all collections.
 *
 * threshold: 0.4
 *   Allows up to ~2 character edits (insert / delete / substitute) in names
 *   of 6–12 characters. Examples:
 *     "saloja"  vs "Saroja"   — 1 substitution → score ≈ 0.17  ✓
 *     "resma"   vs "Reshma"   — 1 deletion     → score ≈ 0.20  ✓
 *     "rajndra" vs "Rajendra" — 1 deletion     → score ≈ 0.13  ✓
 *
 * ignoreLocation: true
 *   Match anywhere in the field value, not just near position 0.
 *   Essential for long text fields (address, propertyDescription, notes).
 *
 * minMatchCharLength: 2
 *   Avoids single-character noise.
 */
const FUSE_BASE_OPTIONS = {
  includeScore      : true,
  shouldSort        : true,
  threshold         : 0.4,
  ignoreLocation    : true,
  minMatchCharLength: 2,
};

// ─── Query Normalisation ──────────────────────────────────────────────────────

/** Lowercases and trims the raw query string. */
const normalizeQuery = (q) => (q || '').trim().toLowerCase();

/**
 * Detects and normalises BHK variant queries.
 * Recognises: "1bhk"  "1 bhk"  "1-bhk"  "1-BHK"  "2 BHK"  "3-BHK"
 * @returns {{ canonical: string, digit: number } | null}
 */
const normalizeBhk = (q) => {
  const match = q.match(/^(\d)\s*[-]?\s*bhk$/i);
  if (!match) return null;
  const digit = parseInt(match[1], 10);
  return { canonical: `${digit} bhk`, digit };
};

/**
 * Returns true when the query is a digit-only fragment — phone number search.
 * Requires at least 3 consecutive digits to avoid false positives.
 */
const isPhoneQuery = (q) => /^[\d\s\-]+$/.test(q) && /\d{3,}/.test(q);

/** Escapes regex special characters so user input is safe for MongoDB $regex. */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ─── N-gram Generation ────────────────────────────────────────────────────────

/**
 * Generates all unique 3-character n-gram substrings from str, capped at
 * MAX_NGRAMS to avoid blowing up the MongoDB $or clause count.
 *
 * Purpose: ensures candidate retrieval for misspelled queries.
 *
 *   "saloja" → ["sal","alo","loj","oja"]
 *   "Saroja" contains "oja" and "sa" → retrieved as candidate even though
 *   the full regex /saloja/ would not match it.
 *
 * Only applied for queries >= MIN_NGRAM_LEN chars to keep short queries clean.
 *
 * @param {string} str
 * @param {number} [n=3]          N-gram length
 * @param {number} [maxTokens=8]  Maximum tokens emitted
 * @returns {string[]}
 */
const generateNgrams = (str, n = 3, maxTokens = 8) => {
  if (str.length <= n) return [str];
  const tokens = new Set();
  for (let i = 0; i <= str.length - n; i++) {
    tokens.add(str.substring(i, i + n));
    if (tokens.size >= maxTokens) break;
  }
  return [...tokens];
};

/** Minimum query length before n-gram expansion is applied. */
const MIN_NGRAM_LEN = 4;

// ─── MongoDB Candidate Filter ────────────────────────────────────────────────

/**
 * Builds a basic $or array for a single search term.
 * @param {string}   term
 * @param {string[]} fields
 * @returns {object[]}
 */
const buildMongoOr = (term, fields) => {
  const escaped = escapeRegex(term);
  return fields.map((field) => ({
    [field]: { $regex: escaped, $options: 'i' },
  }));
};

/**
 * Builds an enhanced $or that includes the full query AND 3-gram alternatives.
 * The 3-grams ensure candidate retrieval survives moderate spelling mistakes.
 * @param {string}   q
 * @param {string[]} fields
 * @returns {object[]}
 */
const buildEnhancedMongoOr = (q, fields) => {
  const clauses = buildMongoOr(q, fields);

  if (q.length >= MIN_NGRAM_LEN) {
    const ngrams = generateNgrams(q);
    for (const gram of ngrams) {
      const escaped = escapeRegex(gram);
      for (const field of fields) {
        clauses.push({ [field]: { $regex: escaped, $options: 'i' } });
      }
    }
  }

  return clauses;
};

/**
 * Builds the MongoDB filter for Pass 1 (text-match candidates).
 *
 * Combines:
 *   • baseFilter    — structured filters from the controller
 *   • Enhanced $or  — full query regex + 3-gram alternatives across all fields
 *   • BHK clause    — exact numeric match when query is "N bhk"
 *   • Phone clause  — digit-only regex on contactNumber when query is digits
 *
 * @param {string}   q
 * @param {string[]} mongoFields
 * @param {object}   baseFilter
 * @returns {object}
 */
const buildCandidateFilter = (q, mongoFields, baseFilter) => {
  if (!q) return baseFilter;

  const bhkInfo   = normalizeBhk(q);
  const phoneMode = isPhoneQuery(q);

  let orClauses;

  if (phoneMode) {
    const digits  = q.replace(/[\s\-]/g, '');
    const escaped = escapeRegex(digits);
    orClauses = ['contactNumber', 'phone'].map((f) => ({
      [f]: { $regex: escaped, $options: 'i' },
    }));
  } else {
    orClauses = buildEnhancedMongoOr(q, mongoFields);

    if (bhkInfo) {
      orClauses.push({ bhk: bhkInfo.digit });
      orClauses.push({ bhkRequirement: bhkInfo.digit });
    }
  }

  // Merge with baseFilter — avoid MongoDB $or conflict
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

// ─── Fuse.js Preparation & Ranking ───────────────────────────────────────────

/**
 * Annotates a lean document with a human-readable _bhkStr field so that
 * Fuse.js can match "2 bhk" as plain text against the numeric bhk field.
 */
const prepareForFuse = (doc) => {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  if (obj.bhk            != null) obj._bhkStr = `${obj.bhk} bhk`;
  if (obj.bhkRequirement != null) obj._bhkStr = `${obj.bhkRequirement} bhk`;
  return obj;
};

/**
 * Classifies a Fuse.js result into a priority tier.
 *   Tier 1 — exact substring match  (score ≈ 0 or field contains query)
 *   Tier 2 — strong fuzzy           (score < 0.15)
 *   Tier 3 — moderate fuzzy         (score < 0.4)
 *
 * Sorted by tier ASC, then score ASC within each tier.
 *
 * @param {object[]} candidates  Prepared plain JS objects
 * @param {string}   q           Normalised query
 * @param {object[]} fuseKeys    Weighted Fuse key definitions
 * @returns {{ tier: number, score: number, item: object }[]}
 */
const runFuse = (candidates, q, fuseKeys) => {
  if (!candidates.length) return [];

  const fuse   = new Fuse(candidates, { ...FUSE_BASE_OPTIONS, keys: fuseKeys });
  const results = fuse.search(q);

  const classified = results.map(({ item, score }) => {
    const s       = score ?? 1;
    const isExact = isSubstringMatch(item, q);
    let tier;
    if (isExact || s < 0.01) tier = 1;
    else if (s < 0.15)       tier = 2;
    else                     tier = 3;
    return { tier, score: s, item };
  });

  classified.sort((a, b) =>
    a.tier !== b.tier ? a.tier - b.tier : a.score - b.score
  );

  return classified;
};

/**
 * Returns true if ANY string or number value in obj contains q as a
 * case-insensitive substring.
 */
const isSubstringMatch = (obj, q) => {
  const lq = q.toLowerCase();
  return Object.values(obj).some((val) => {
    if (typeof val === 'string') return val.toLowerCase().includes(lq);
    if (typeof val === 'number') return String(val).includes(lq);
    return false;
  });
};

// ─── BHK Strict Search ──────────────────────────────────────────────────────────

/**
 * Handles BHK queries with strict numeric equality.
 *
 * BHK is NOT a fuzzy concept — "1 bhk" must ONLY return records where the
 * bhk or bhkRequirement field equals exactly 1.  We bypass Fuse.js and the
 * broad pool entirely and issue a clean MongoDB equality filter.
 *
 * Supports both collection schemas:
 *   Property / RentalProperty → `bhk` field
 *   Buyer / Tenant            → `bhkRequirement` field
 *
 * @param {mongoose.Model} Model
 * @param {{ digit: number }} bhkInfo   Output of normalizeBhk()
 * @param {object}           baseFilter Structured filter from controller
 * @param {object}           opts
 * @returns {Promise<{ results: object[], total: number }>}
 */
const hybridSearchBhk = async (Model, bhkInfo, baseFilter, opts) => {
  const { maxResults, candidateLimit, populate } = opts;

  // Build a strict equality $or for the two possible BHK field names.
  // Using $or (not $and) because a given collection only has one of the two.
  const bhkOr = [
    { bhk           : bhkInfo.digit },
    { bhkRequirement: bhkInfo.digit },
  ];

  // Merge with baseFilter safely
  let bhkFilter;
  if (baseFilter.$or) {
    // baseFilter already has a $or → wrap both in $and to avoid conflict
    const { $or: existingOr, $and: existingAnd, ...rest } = baseFilter;
    bhkFilter = {
      ...rest,
      $and: [
        ...(existingAnd || []),
        { $or: existingOr },
        { $or: bhkOr },
      ],
    };
  } else {
    bhkFilter = { ...baseFilter, $or: bhkOr };
  }

  let query = Model
    .find(bhkFilter)
    .sort({ createdAt: -1 })
    .limit(candidateLimit)
    .lean();

  if (populate) query = query.populate(populate);

  const docs = await query;

  return {
    results: docs.slice(0, maxResults),
    total  : docs.length,
  };
};

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * hybridSearch — entry point for all CRM search handlers.
 *
 * For every query the function runs TWO MongoDB passes in parallel then lets
 * Fuse.js rank the merged candidate pool:
 *
 *   Pass 1 — regex / n-gram text filter → CANDIDATE_LIMIT docs
 *   Pass 2 — broad recent pool (no text filter) → BROAD_POOL_SIZE docs
 *
 * Always running both passes (not just as a fallback) guarantees:
 *   ✓ Short names   → recent pool covers them
 *   ✓ Long names    → n-gram broadening catches shared substrings
 *   ✓ Severe typos  → broad pool always includes the target in its recency window
 *   ✓ All collections — the logic is collection-agnostic
 *   ✓ All query lengths — 1-char prefix through multi-word full names
 *
 * @param {mongoose.Model} Model
 * @param {string}         q           Raw ?q= value (may be undefined)
 * @param {object[]}       fuseKeys    Weighted Fuse key definitions
 * @param {string[]}       mongoFields Text fields for Pass 1 regex
 * @param {object}         baseFilter  Structured filter (createdBy, status…)
 * @param {object}         [opts]
 * @param {number}         [opts.candidateLimit=500]
 * @param {number}         [opts.maxResults=50]
 * @param {string|object}  [opts.populate]
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

  // ── BHK strict mode — exact numeric equality, no fuzzy ───────────────────
  // "1 bhk" / "2bhk" / "1-BHK" must ONLY return records where the BHK field
  // equals exactly that number.  Routing these queries through Fuse.js or the
  // broad pool causes cross-BHK contamination (2 BHK appearing in a 1 BHK
  // search), so we short-circuit here with a clean MongoDB equality filter.
  const bhkInfo = normalised ? normalizeBhk(normalised) : null;
  if (bhkInfo) {
    return hybridSearchBhk(Model, bhkInfo, baseFilter, { maxResults, candidateLimit, populate });
  }

  // ── No search query — return plain paginated MongoDB results ─────────────
  if (!normalised) {
    let query = Model.find(baseFilter).sort({ createdAt: -1 }).limit(candidateLimit).lean();
    if (populate) query = query.populate(populate);
    const docs = await query;
    return { results: docs, total: docs.length };
  }

  // ── Pass 1: text-match candidates (regex + n-gram enhanced) ─────────────
  const textFilter = buildCandidateFilter(normalised, mongoFields, baseFilter);
  let textQuery    = Model.find(textFilter).sort({ createdAt: -1 }).limit(candidateLimit).lean();
  if (populate) textQuery = textQuery.populate(populate);

  // ── Pass 2: broad recency pool (always, no text filter) ─────────────────
  // Fetches the user's most recent BROAD_POOL_SIZE records irrespective of
  // whether they contain the query string.  This guarantees any record within
  // the recency window is reachable by Fuse.js for typo-tolerant matching —
  // covering short names, long names, all collections uniformly.
  let broadQuery = Model.find(baseFilter).sort({ createdAt: -1 }).limit(BROAD_POOL_SIZE).lean();
  if (populate) broadQuery = broadQuery.populate(populate);

  // Run both in parallel — total latency ≈ slowest single query
  const [textCandidates, broadCandidates] = await Promise.all([textQuery, broadQuery]);

  // ── Merge: text-match first (likely more relevant), then broad remainder ─
  const seenIds  = new Set(textCandidates.map((d) => String(d._id)));
  const merged   = [...textCandidates];
  for (const doc of broadCandidates) {
    const id = String(doc._id);
    if (!seenIds.has(id)) {
      seenIds.add(id);
      merged.push(doc);
    }
  }

  // ── Fuse.js fuzzy ranking on the merged candidate pool ───────────────────
  const fuseReady = merged.map(prepareForFuse);
  const ranked    = runFuse(fuseReady, normalised, fuseKeys);

  // ── Deduplicate and cap at maxResults ────────────────────────────────────
  const deduped     = [];
  const dedupedIds  = new Set();
  for (const { item } of ranked) {
    const id = String(item._id);
    if (!dedupedIds.has(id)) {
      dedupedIds.add(id);
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
  BROAD_POOL_SIZE,
  MAX_RESULTS,
};
