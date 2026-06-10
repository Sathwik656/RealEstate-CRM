import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Search, SlidersHorizontal, X } from 'lucide-react';

export default function SearchPage() {
  const [searchType, setSearchType] = useState('properties');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Advanced filters for properties
  const [showFilters, setShowFilters] = useState(false);
  const [propertyFilters, setPropertyFilters] = useState({
    bhk: '',
    type: '',
    minBudget: '',
    maxBudget: '',
    minArea: '',
    maxArea: '',
  });

  const [submittedQuery, setSubmittedQuery] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['search', searchType, submittedQuery],
    queryFn: async () => {
      if (!submittedQuery) return { data: [] };
      const params: Record<string, string> = {};
      
      if (searchType === 'sellers') params.name = submittedQuery.term;
      else params.location = submittedQuery.term;

      // Add property filters if applicable
      if (searchType === 'properties' && submittedQuery.filters) {
        Object.entries(submittedQuery.filters).forEach(([key, val]) => {
          if (val) params[key] = String(val);
        });
      }

      const res = await api.get(`/search/${searchType}`, { params });
      return res.data;
    },
    enabled: !!submittedQuery,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedQuery({
      term: searchTerm,
      filters: searchType === 'properties' ? { ...propertyFilters } : null,
    });
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setPropertyFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const clearFilters = () => {
    setPropertyFilters({
      bhk: '', type: '', minBudget: '', maxBudget: '', minArea: '', maxArea: ''
    });
  };

  return (
    <div className="page-wrapper">
      <div>
        <h1 className="page-title">Global Search</h1>
        <p className="page-subtitle">Search and filter across all CRM modules</p>
      </div>

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="form-select w-full sm:w-44 flex-shrink-0"
              >
                <option value="properties">Properties</option>
                <option value="sellers">Sellers</option>
                <option value="buyers">Buyers</option>
                <option value="rentals">Rentals</option>
                <option value="tenants">Tenants</option>
              </select>

              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`Search ${searchType}... (e.g. location, name)`}
                  className="form-input pl-11"
                />
              </div>

              <div className="flex gap-2">
                {searchType === 'properties' && (
                  <button 
                    type="button" 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`btn-icon border border-border px-3 ${showFilters ? 'bg-accent/10 text-accent border-accent/20' : 'bg-surface hover:bg-surface-alt'}`}
                    title="Toggle Advanced Filters"
                  >
                    <SlidersHorizontal size={18} />
                  </button>
                )}
                <button type="submit" className="btn-primary px-8">
                  Search
                </button>
              </div>
            </div>

            {/* Advanced Filters Section */}
            {searchType === 'properties' && showFilters && (
              <div className="pt-4 border-t border-border animate-slide-up">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-primary">Advanced Property Filters</h4>
                  <button type="button" onClick={clearFilters} className="text-xs text-muted hover:text-red-500 flex items-center gap-1">
                    <X size={12} /> Clear Filters
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  <div className="form-group">
                    <label className="form-label text-[10px]">Property Type</label>
                    <select name="type" value={propertyFilters.type} onChange={handleFilterChange} className="form-select text-sm py-2">
                      <option value="">Any Type</option>
                      <option>Apartment/Flat</option>
                      <option>Independent House</option>
                      <option>Commercial Property</option>
                      <option>Land</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label text-[10px]">BHK</label>
                    <input type="number" name="bhk" value={propertyFilters.bhk} onChange={handleFilterChange} className="form-input text-sm py-2" placeholder="e.g. 3" min="1" />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-[10px]">Min Price (₹)</label>
                    <input type="number" name="minBudget" value={propertyFilters.minBudget} onChange={handleFilterChange} className="form-input text-sm py-2" placeholder="Min" />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-[10px]">Max Price (₹)</label>
                    <input type="number" name="maxBudget" value={propertyFilters.maxBudget} onChange={handleFilterChange} className="form-input text-sm py-2" placeholder="Max" />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-[10px]">Min Area (sqft)</label>
                    <input type="number" name="minArea" value={propertyFilters.minArea} onChange={handleFilterChange} className="form-input text-sm py-2" placeholder="Min Area" />
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      <div className="card min-h-64">
        <div className="card-header">
          <h3 className="font-display font-semibold text-primary">Search Results</h3>
          {data?.data?.length > 0 && (
            <span className="badge-gray">{data.data.length} found</span>
          )}
        </div>
        <div className="card-body">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !submittedQuery ? (
            <div className="text-center text-muted py-12">
              <Search size={40} className="mx-auto mb-3 opacity-30" />
              <p>Enter search criteria to find records.</p>
            </div>
          ) : !data?.data?.length ? (
            <div className="text-center text-muted py-12">
              No results found for your search criteria.
            </div>
          ) : (
            <ul className="space-y-3">
              {data.data.map((item: any, i: number) => (
                <li key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg hover:border-accent hover:shadow-card transition-all duration-200 cursor-pointer group gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-primary group-hover:text-accent transition-colors">
                        {item.propertyTitle || item.sellerName || item.buyerName || item.tenantName || `Record ${item._id}`}
                      </h4>
                      {item.bhk && <span className="badge-gray text-[10px]">{item.bhk} BHK</span>}
                      {item.propertyType && <span className="badge-blue text-[10px]">{item.propertyType}</span>}
                    </div>
                    <p className="text-sm text-muted mt-1 flex items-center gap-3 flex-wrap">
                      <span>{item.location || item.address || item.preferredLocation || item.contactNumber || '—'}</span>
                      {item.price && <span className="font-medium text-emerald-600">₹{item.price.toLocaleString('en-IN')}</span>}
                      {item.area && <span>{item.area} sqft</span>}
                    </p>
                  </div>
                  <span className="badge-gray font-mono text-xs self-start sm:self-center">
                    {item.propertyId || item.sellerId || item.buyerId || item.tenantId || item.rentalId || item._id?.slice(-6)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
