import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import {
  Search, SlidersHorizontal, X, Building2, Users, UserSquare2,
  Home, UserCircle, Layers, ChevronRight, MapPin, Phone,
  IndianRupee, Maximize2, BedDouble, Tag,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchMode = 'properties' | 'sellers' | 'buyers' | 'tenants' | 'rentals' | 'global';

interface PropertyFilters {
  bhk: string;
  type: string;
  status: string;
  purpose: string;
  minBudget: string;
  maxBudget: string;
  minArea: string;
  maxArea: string;
}

interface GlobalData {
  properties: any[];
  sellers: any[];
  buyers: any[];
  tenants: any[];
  rentals: any[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MODES: { value: SearchMode; label: string; icon: any }[] = [
  { value: 'global',     label: 'All',        icon: Layers      },
  { value: 'properties', label: 'Properties', icon: Building2   },
  { value: 'sellers',    label: 'Sellers',    icon: Users        },
  { value: 'buyers',     label: 'Buyers',     icon: UserSquare2 },
  { value: 'tenants',    label: 'Tenants',    icon: UserCircle  },
  { value: 'rentals',    label: 'Rentals',    icon: Home        },
];

const PROPERTY_TYPES = [
  'Apartment/Flat', 'Independent House', 'Commercial Property',
  'Land', 'Agricultural Land', 'Industrial Property',
  'Rental Property', 'Lease Property',
];

const DEBOUNCE_MS = 400;

// ─── Helper: build query params for each collection mode ─────────────────────
//
// Sends BOTH:
//   ?q=<term>           → new universal multi-field search (updated backend)
//   legacy field params → old single-field params (Render / old backend)
// This guarantees search works regardless of which backend version is deployed.

function buildParams(mode: SearchMode, q: string, filters: PropertyFilters): Record<string, string> {
  const params: Record<string, string> = {};
  const term = q.trim();

  // ── Universal ?q= param (new backend) ────────────────────────────────────
  if (term) params.q = term;

  // ── Legacy field-specific params (old backend compatibility) ─────────────
  if (term) {
    switch (mode) {
      case 'properties':
        // Old backend used ?location= for property text search
        params.location = term;
        break;
      case 'sellers':
        // Old backend used ?name= for seller name search
        params.name = term;
        break;
      case 'buyers':
        // Old backend used ?location= for buyer preferredLocation search
        params.location = term;
        break;
      case 'tenants':
        // Old backend used ?location= for tenant preferredLocation search
        params.location = term;
        break;
      case 'rentals':
        // Old backend used ?location= for rental location search
        params.location = term;
        break;
    }
  }

  // ── Structured filters (properties only) ─────────────────────────────────
  if (mode === 'properties') {
    if (filters.bhk)       params.bhk       = filters.bhk;
    if (filters.type)      params.type      = filters.type;
    if (filters.status)    params.status    = filters.status;
    if (filters.purpose)   params.purpose   = filters.purpose;
    if (filters.minBudget) params.minBudget = filters.minBudget;
    if (filters.maxBudget) params.maxBudget = filters.maxBudget;
    if (filters.minArea)   params.minArea   = filters.minArea;
    if (filters.maxArea)   params.maxArea   = filters.maxArea;
  }

  return params;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const navigate = useNavigate();

  const [mode, setMode]         = useState<SearchMode>('global');
  const [inputVal, setInputVal] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters]   = useState<PropertyFilters>({
    bhk: '', type: '', status: '', purpose: '',
    minBudget: '', maxBudget: '', minArea: '', maxArea: '',
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce input → trigger query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(inputVal);
    }, DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [inputVal]);

  // Reset filters when mode changes
  const handleModeChange = useCallback((m: SearchMode) => {
    setMode(m);
    setShowFilters(false);
  }, []);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const clearFilters = () => {
    setFilters({ bhk: '', type: '', status: '', purpose: '', minBudget: '', maxBudget: '', minArea: '', maxArea: '' });
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  // Only trigger a query when there's a search term OR active filters
  const isEnabled = debouncedQ.trim().length > 0 || (mode === 'properties' && hasActiveFilters);

  // ── Single-collection query ─────────────────────────────────────────────
  const singleQuery = useQuery({
    queryKey: ['search', mode, debouncedQ, filters],
    queryFn: async () => {
      const params = buildParams(mode, debouncedQ, filters);
      const res = await api.get(`/search/${mode}`, { params });
      return res.data; // { success, data, pagination }
    },
    enabled: isEnabled && mode !== 'global',
    staleTime: 30_000,
  });

  // ── Global search query ─────────────────────────────────────────────────
  const globalQuery = useQuery({
    queryKey: ['search', 'global', debouncedQ],
    queryFn: async () => {
      const res = await api.get('/search/global', {
        params: { q: debouncedQ.trim(), limit: 6 },
      });
      return res.data; // { success, data: { properties, sellers, buyers, tenants, rentals }, meta }
    },
    enabled: mode === 'global' && debouncedQ.trim().length > 0,
    staleTime: 30_000,
  });

  const isLoading = mode === 'global' ? globalQuery.isLoading : singleQuery.isLoading;
  const isError   = mode === 'global' ? !!globalQuery.error   : !!singleQuery.error;

  // ── Result counts ───────────────────────────────────────────────────────
  const singleTotal   = singleQuery.data?.pagination?.total ?? 0;
  const globalMeta    = globalQuery.data?.meta?.totals;
  const globalTotal   = globalMeta
    ? Object.values(globalMeta as Record<string, number>).reduce((a, b) => a + b, 0)
    : 0;
  const totalCount    = mode === 'global' ? globalTotal : singleTotal;

  // ─── JSX ───────────────────────────────────────────────────────────────

  return (
    <div className="page-wrapper">

      {/* Page Header */}
      <div>
        <h1 className="page-title">Global Search</h1>
        <p className="page-subtitle">
          Search across all CRM modules instantly — type to see results
        </p>
      </div>

      {/* Search Card */}
      <div className="card">
        <div className="card-body space-y-4">

          {/* Mode Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-surface-alt rounded-lg w-fit">
            {MODES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => handleModeChange(value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all duration-200 ${
                  mode === value
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted hover:text-primary hover:bg-surface'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {/* Search Input Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={18} />
              <input
                id="global-search-input"
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder={
                  mode === 'global'
                    ? 'Type anything — searches names, locations, types...'
                    : `Search ${mode} by name, location, contact...`
                }
                className="form-input pl-11 pr-10"
                autoComplete="off"
                autoFocus
              />
              {inputVal && (
                <button
                  onClick={() => { setInputVal(''); setDebouncedQ(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Advanced Filters toggle (properties only) */}
            {mode === 'properties' && (
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`btn-icon border px-3 gap-1.5 flex items-center text-xs font-medium ${
                  showFilters || hasActiveFilters
                    ? 'bg-accent/10 text-accent border-accent/30'
                    : 'border-border bg-surface hover:bg-surface-alt text-muted'
                }`}
              >
                <SlidersHorizontal size={15} />
                Filters
                {hasActiveFilters && (
                  <span className="w-4 h-4 rounded-full bg-accent text-white text-[9px] flex items-center justify-center font-bold">
                    {Object.values(filters).filter(Boolean).length}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Advanced Filters Panel */}
          {mode === 'properties' && showFilters && (
            <div className="pt-4 border-t border-border animate-slide-up">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Advanced Filters
                </h4>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs text-muted hover:text-red-500 flex items-center gap-1 transition-colors"
                  >
                    <X size={11} /> Clear all
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
                <div className="form-group col-span-2 sm:col-span-1">
                  <label className="form-label text-[10px]">Property Type</label>
                  <select name="type" value={filters.type} onChange={handleFilterChange} className="form-select text-sm py-2">
                    <option value="">Any Type</option>
                    {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label text-[10px]">Status</label>
                  <select name="status" value={filters.status} onChange={handleFilterChange} className="form-select text-sm py-2">
                    <option value="">Any</option>
                    <option>Available</option>
                    <option>Sold</option>
                    <option>Rented</option>
                    <option>Leased</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label text-[10px]">Purpose</label>
                  <select name="purpose" value={filters.purpose} onChange={handleFilterChange} className="form-select text-sm py-2">
                    <option value="">Any</option>
                    <option>Sale</option>
                    <option>Rent</option>
                    <option>Lease</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label text-[10px]">BHK</label>
                  <input type="number" name="bhk" value={filters.bhk} onChange={handleFilterChange} className="form-input text-sm py-2" placeholder="e.g. 2" min="1" max="5" />
                </div>
                <div className="form-group">
                  <label className="form-label text-[10px]">Min Price (₹)</label>
                  <input type="number" name="minBudget" value={filters.minBudget} onChange={handleFilterChange} className="form-input text-sm py-2" placeholder="Min" />
                </div>
                <div className="form-group">
                  <label className="form-label text-[10px]">Max Price (₹)</label>
                  <input type="number" name="maxBudget" value={filters.maxBudget} onChange={handleFilterChange} className="form-input text-sm py-2" placeholder="Max" />
                </div>
                <div className="form-group">
                  <label className="form-label text-[10px]">Min Area (sqft)</label>
                  <input type="number" name="minArea" value={filters.minArea} onChange={handleFilterChange} className="form-input text-sm py-2" placeholder="Min" />
                </div>
                <div className="form-group">
                  <label className="form-label text-[10px]">Max Area (sqft)</label>
                  <input type="number" name="maxArea" value={filters.maxArea} onChange={handleFilterChange} className="form-input text-sm py-2" placeholder="Max" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Card */}
      <div className="card min-h-64">
        <div className="card-header">
          <h3 className="font-display font-semibold text-primary">
            {debouncedQ
              ? <>Results for <span className="text-accent">"{debouncedQ}"</span></>
              : 'Search Results'}
          </h3>
          {isEnabled && !isLoading && totalCount > 0 && (
            <span className="badge-gray">
              {totalCount.toLocaleString()} record{totalCount !== 1 ? 's' : ''} found
            </span>
          )}
        </div>

        <div className="card-body">
          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted">Searching...</p>
            </div>
          )}

          {/* Idle / empty state */}
          {!isLoading && !isEnabled && (
            <div className="text-center text-muted py-16">
              <Search size={44} className="mx-auto mb-4 opacity-20" />
              <p className="font-medium">Start typing to search</p>
              <p className="text-xs mt-1 opacity-60">
                Searches across names, locations, contact numbers and more
              </p>
            </div>
          )}

          {/* Error */}
          {isError && (
            <div className="alert-error">
              Something went wrong. Please try again.
            </div>
          )}

          {/* No results */}
          {!isLoading && isEnabled && !isError && totalCount === 0 && (
            <div className="text-center text-muted py-16">
              <Search size={44} className="mx-auto mb-4 opacity-20" />
              <p className="font-medium">No results found</p>
              <p className="text-xs mt-1 opacity-60">
                Try a different keyword or fewer filters
              </p>
            </div>
          )}

          {/* ── GLOBAL RESULTS ───────────────────────────────────────────── */}
          {!isLoading && mode === 'global' && globalQuery.data && totalCount > 0 && (
            <GlobalResults
              data={globalQuery.data.data as GlobalData}
              meta={globalQuery.data.meta}
              q={debouncedQ}
              onNavigate={navigate}
            />
          )}

          {/* ── SINGLE COLLECTION RESULTS ─────────────────────────────────── */}
          {!isLoading && mode !== 'global' && singleQuery.data && totalCount > 0 && (
            <CollectionResults
              items={singleQuery.data.data}
              mode={mode}
              pagination={singleQuery.data.pagination}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// GlobalResults — groups results by collection with section headers
// =============================================================================

const SECTION_CONFIG: Record<keyof GlobalData, { label: string; icon: any; route: string; idKey: string; nameKey: string }> = {
  properties : { label: 'Properties', icon: Building2,   route: '/properties', idKey: 'propertyId', nameKey: 'propertyTitle' },
  sellers    : { label: 'Sellers',    icon: Users,        route: '/sellers',    idKey: 'sellerId',   nameKey: 'sellerName'    },
  buyers     : { label: 'Buyers',     icon: UserSquare2,  route: '/buyers',     idKey: 'buyerId',    nameKey: 'buyerName'     },
  tenants    : { label: 'Tenants',    icon: UserCircle,   route: '/tenants',    idKey: 'tenantId',   nameKey: 'tenantName'    },
  rentals    : { label: 'Rentals',    icon: Home,         route: '/rentals',    idKey: '_id',        nameKey: 'location'      },
};

function GlobalResults({ data, meta, q, onNavigate }: {
  data: GlobalData;
  meta: any;
  q: string;
  onNavigate: (path: string) => void;
}) {
  const sections = Object.entries(SECTION_CONFIG) as [keyof GlobalData, typeof SECTION_CONFIG[keyof GlobalData]][];
  const hasAny = sections.some(([key]) => data[key]?.length > 0);

  if (!hasAny) return null;

  return (
    <div className="space-y-6">
      {sections.map(([key, cfg]) => {
        const items = data[key];
        const total = meta?.totals?.[key] ?? 0;
        if (!items?.length) return null;

        const Icon = cfg.icon;

        return (
          <div key={key}>
            {/* Section header */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Icon size={15} className="text-accent" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  {cfg.label}
                </span>
                <span className="badge-gray text-[10px] ml-1">{total}</span>
              </div>
              {total > items.length && (
                <button
                  onClick={() => onNavigate(`${cfg.route}?q=${encodeURIComponent(q)}`)}
                  className="text-xs text-accent hover:underline flex items-center gap-1 transition-colors"
                >
                  View all {total} <ChevronRight size={12} />
                </button>
              )}
            </div>

            {/* Items */}
            <ul className="space-y-2">
              {items.map((item: any, i: number) => (
                <ResultCard key={item._id ?? i} item={item} mode={key as SearchMode} cfg={cfg} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// CollectionResults — flat list for single-collection search
// =============================================================================

function CollectionResults({ items, mode, pagination }: {
  items: any[];
  mode: SearchMode;
  pagination: any;
}) {
  const cfg = SECTION_CONFIG[mode as keyof GlobalData];
  if (!cfg) return null;

  return (
    <div>
      <ul className="space-y-2">
        {items.map((item: any, i: number) => (
          <ResultCard key={item._id ?? i} item={item} mode={mode} cfg={cfg} />
        ))}
      </ul>

      {/* Pagination hint */}
      {pagination && pagination.pages > 1 && (
        <p className="text-xs text-muted text-center mt-4">
          Showing page {pagination.page} of {pagination.pages} — use individual module pages for full pagination
        </p>
      )}
    </div>
  );
}

// =============================================================================
// ResultCard — unified card for any record type
// =============================================================================

function ResultCard({ item, mode, cfg }: { item: any; mode: SearchMode; cfg: any }) {
  const name = item[cfg.nameKey] || item.propertyTitle || item.sellerName
    || item.buyerName || item.tenantName || item.location || `ID: ${item._id?.slice(-6)}`;

  const displayId = item[cfg.idKey] || item._id?.slice(-8);

  const subLine: string[] = [];
  if (item.location || item.preferredLocation) subLine.push(item.location || item.preferredLocation);
  if (item.address)          subLine.push(item.address);
  if (item.contactNumber)    subLine.push(item.contactNumber);
  if (item.email)            subLine.push(item.email);

  const price  = item.price || item.rentAmount || item.leaseAmount;
  const area   = item.area;
  const bhk    = item.bhk || item.bhkRequirement;
  const tag    = item.propertyType || item.propertyStatus || item.status
    || item.furnishing || item.purpose;

  return (
    <li className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 border border-border rounded-lg hover:border-accent/50 hover:shadow-sm hover:bg-surface-alt/50 transition-all duration-200 gap-2 group cursor-pointer">
      <div className="flex-1 min-w-0">
        {/* Name + badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-semibold text-sm text-primary group-hover:text-accent transition-colors truncate">
            {name}
          </h4>
          {bhk && (
            <span className="badge-gray text-[10px] flex items-center gap-0.5">
              <BedDouble size={9} /> {bhk} BHK
            </span>
          )}
          {tag && (
            <span className="badge-blue text-[10px]">{tag}</span>
          )}
        </div>

        {/* Sub-line */}
        <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted">
          {(item.location || item.preferredLocation) && (
            <span className="flex items-center gap-1">
              <MapPin size={10} className="text-accent/60" />
              {item.location || item.preferredLocation}
            </span>
          )}
          {item.contactNumber && (
            <span className="flex items-center gap-1">
              <Phone size={10} className="text-accent/60" />
              {item.contactNumber}
            </span>
          )}
          {price && (
            <span className="flex items-center gap-0.5 font-medium text-emerald-600">
              <IndianRupee size={10} />
              {price.toLocaleString('en-IN')}
            </span>
          )}
          {area && (
            <span className="flex items-center gap-1">
              <Maximize2 size={10} className="text-accent/60" />
              {area.toLocaleString()} sqft
            </span>
          )}
          {item.address && !item.location && (
            <span className="truncate max-w-xs">{item.address}</span>
          )}
        </div>
      </div>

      {/* ID badge */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="badge-gray font-mono text-[10px] self-start sm:self-center whitespace-nowrap">
          <Tag size={9} className="inline mr-1" />
          {displayId?.toString().slice(-8)}
        </span>
      </div>
    </li>
  );
}
