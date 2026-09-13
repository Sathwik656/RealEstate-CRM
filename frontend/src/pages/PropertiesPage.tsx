import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Plus, Edit, Trash2, Search, Eye, Handshake, Download, SlidersHorizontal, X, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { CreateProperty } from '@/components/forms/CreateProperty';
import { PropertyDetailView } from '@/components/views/PropertyDetailView';
import { useAuth } from '@/context/AuthContext';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { EmptyState } from '@/components/ui/EmptyState';
import { GridSkeleton } from '@/components/ui/GridSkeleton';
import { PropertyCard } from '@/components/views/cards/PropertyCard';

export default function PropertiesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [viewingItem, setViewingItem] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [expressingInterestId, setExpressingInterestId] = useState<string | null>(null);
  const [view, setView] = useState<'list'|'grid'>((localStorage.getItem('crm_propertiesView') as 'list'|'grid') || 'grid');

  const handleViewChange = (v: 'list'|'grid') => {
    setView(v);
    localStorage.setItem('crm_propertiesView', v);
  };

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    bhk: '', type: '', purpose: '', minBudget: '', maxBudget: '', minArea: '', maxArea: ''
  });

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFilters(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value 
    }));
  };

  const clearFilters = () => {
    setFilters({ bhk: '', type: '', purpose: '', minBudget: '', maxBudget: '', minArea: '', maxArea: '' });
    setStatusFilter('');
  };

  const hasActiveFilters = statusFilter !== '' || Object.values(filters).some(v => v !== '');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['properties', statusFilter, searchQuery, searchMode, filters],
    queryFn: async () => {
      const endpoint = (searchQuery && searchMode === 'all') ? '/search/properties' : '/properties';
      
      const params: any = { 
        limit: 10000, 
        status: statusFilter || undefined,
        type: filters.type || undefined,
        purpose: filters.purpose || undefined,
        bhk: filters.bhk || undefined,
        minPrice: filters.minBudget || undefined,
        maxPrice: filters.maxBudget || undefined,
        minArea: filters.minArea || undefined,
        maxArea: filters.maxArea || undefined
      };
      if (searchQuery) {
        if (searchMode === 'location') {
          params.locationCode = searchQuery;
        } else {
          params.q = searchQuery;
        }
      }

      const res = await api.get(endpoint, { params });
      return res.data;
    },
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this property?')) return;
    try {
      await api.delete(`/properties/${id}`);
      refetch();
    } catch (err) {
      console.error('Failed to delete property:', err);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) {
        if (searchMode === 'location') {
          params.append('locationCode', searchQuery);
        } else {
          params.append('q', searchQuery);
        }
      }
      if (statusFilter) params.append('status', statusFilter);
      if (filters.type) params.append('type', filters.type);
      if (filters.purpose) params.append('purpose', filters.purpose);
      if (filters.bhk) params.append('bhk', filters.bhk);
      if (filters.minBudget) params.append('minPrice', filters.minBudget);
      if (filters.maxBudget) params.append('maxPrice', filters.maxBudget);
      if (filters.minArea) params.append('minArea', filters.minArea);
      if (filters.maxArea) params.append('maxArea', filters.maxArea);
      
      const res = await api.get('/properties/export?' + params.toString(), { responseType: 'blob' });
      
      let filename = 'Properties_Export.xlsx';
      const disposition = res.headers['content-disposition'] as string | undefined;
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      const contentType = (res.headers['content-type'] as string) || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const blob = new Blob([res.data], { type: contentType });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Failed to export properties:', err);
    }
  };

  const expressInterestMutation = useMutation({
    mutationFn: (propertyId: string) => api.post(`/allotments/${propertyId}/interest`),
    onSuccess: () => {
      setExpressingInterestId(null);
      refetch();
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      alert('Interest registered successfully! Admin will review the allotment.');
    },
    onError: (e: any) => {
      setExpressingInterestId(null);
      alert(e?.response?.data?.message || 'Failed to express interest. The property may no longer be available.');
    },
  });

  const handleExpressInterest = (propertyId: string) => {
    if (!window.confirm('Express interest in this property? It will go into Allotment for the Admin to review.')) return;
    setExpressingInterestId(propertyId);
    expressInterestMutation.mutate(propertyId);
  };

  if (isCreating || editingItem) {
    return (
      <CreateProperty
        initialData={editingItem}
        onSuccess={() => { setIsCreating(false); setEditingItem(null); refetch(); }}
        onCancel={() => { setIsCreating(false); setEditingItem(null); }}
      />
    );
  }

  if (viewingItem) {
    const currentItem = data?.data?.find((item: any) => item._id === viewingItem._id) || viewingItem;
    return (
      <PropertyDetailView
        property={currentItem}
        onBack={() => setViewingItem(null)}
        onEdit={() => { setEditingItem(currentItem); setViewingItem(null); }}
        onExpressInterest={handleExpressInterest}
        expressingInterestId={expressingInterestId}
        isExpressInterestPending={expressInterestMutation.isPending}
      />
    );
  }

  return (
    <>
    <div className="hidden lg:block page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Properties</h1>
          <p className="page-subtitle">Manage your real estate listings</p>
        </div>
        {user?.role === 'admin' && (
          <button className="btn-accent" onClick={() => setIsCreating(true)}>
            <Plus size={16} />
          </button>
        )}
      </div>

      <div className="card">
        {/* Filters & Search */}
        <div className="card-header bg-surface-alt flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between w-full">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-wrap">
              <div className="relative flex-1 sm:min-w-[200px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-muted" />
                </div>
                <input
                  type="text"
                  placeholder={searchMode === 'location' ? "Enter Location Code..." : "Search properties..."}
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); }}
                  className="form-input pl-10 w-full"
                />
              </div>
              <select
                value={searchMode}
                onChange={(e) => { setSearchMode(e.target.value); }}
                className="form-select w-full sm:w-32"
              >
                <option value="all">Search All</option>
                <option value="location">By Location</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); }}
                className="form-select w-full sm:w-32"
              >
                <option value="">All Statuses</option>
                <option value="Available">Available</option>
                <option value="In Deal">In Deal</option>
                <option value="Sold">Sold</option>
              </select>
              
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`btn-icon border px-3 gap-1.5 flex items-center text-xs font-medium ${showFilters || hasActiveFilters
                  ? 'bg-accent/10 text-accent border-accent/30'
                  : 'border-border bg-surface hover:bg-surface-alt text-muted'
                  }`}
              >
                <SlidersHorizontal size={15} />
                Filters
                {hasActiveFilters && (
                  <span className="w-4 h-4 rounded-full bg-accent text-white text-[9px] flex items-center justify-center font-bold">
                    {(statusFilter ? 1 : 0) + Object.values(filters).filter(v => v !== '').length}
                  </span>
                )}
              </button>

              {data?.data?.length > 0 && (
                <button 
                  className="btn-outline flex items-center gap-2 px-3 text-xs"
                  onClick={handleExport}
                >
                  <Download size={14} /> Export Excel
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted whitespace-nowrap hidden sm:block">
                {data?.pagination?.total ?? 0} properties
              </span>
              <ViewToggle view={view} onChange={handleViewChange} />
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
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
                    {['Land', 'Shop', 'Independent House', 'Flat', 'Store', 'Garage'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label text-[10px]">Purpose</label>
                  <select name="purpose" value={filters.purpose} onChange={handleFilterChange} className="form-select text-sm py-2">
                    <option value="">Any</option>
                    <option>Sale</option>
                    <option>Rent</option>
                  </select>
                </div>
                {(!filters.type || ['Independent House', 'Flat'].includes(filters.type)) && (
                  <div className="form-group">
                    <label className="form-label text-[10px]">BHK</label>
                    <input type="number" name="bhk" value={filters.bhk} onChange={handleFilterChange} className="form-input text-sm py-2" placeholder="e.g. 2" min="1" max="5" />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label text-[10px]">Min Price (₹)</label>
                  <input type="number" name="minBudget" value={filters.minBudget} onChange={handleFilterChange} className="form-input text-sm py-2" placeholder="Min" />
                </div>
                <div className="form-group">
                  <label className="form-label text-[10px]">Max Price (₹)</label>
                  <input type="number" name="maxBudget" value={filters.maxBudget} onChange={handleFilterChange} className="form-input text-sm py-2" placeholder="Max" />
                </div>
                <div className="form-group">
                  <label className="form-label text-[10px]">Min Area</label>
                  <input type="number" name="minArea" value={filters.minArea} onChange={handleFilterChange} className="form-input text-sm py-2" placeholder="Min" />
                </div>
                <div className="form-group">
                  <label className="form-label text-[10px]">Max Area</label>
                  <input type="number" name="maxArea" value={filters.maxArea} onChange={handleFilterChange} className="form-input text-sm py-2" placeholder="Max" />
                </div>
              </div>
            </div>
          )}
        </div>

        {view === 'grid' ? (
          <div className="p-4 sm:p-6 bg-surface">
            {isLoading ? (
              <GridSkeleton count={8} />
            ) : !data?.data?.length ? (
              <EmptyState title="No properties found" description="There are no properties matching your current search." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {data.data.map((p: any) => (
                  <PropertyCard 
                    key={p._id} 
                    property={p} 
                    onView={() => setViewingItem(p)} 
                    onEdit={() => setEditingItem(p)} 
                    onExpressInterest={handleExpressInterest}
                    expressingInterestId={expressingInterestId}
                    isExpressInterestPending={expressInterestMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID/Title</th>
                <th>Type &amp; Purpose</th>
                <th>Price &amp; Area</th>
                <th>Location</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="py-12 text-center text-muted">Loading properties...</td></tr>
              ) : !data?.data?.length ? (
                <tr><td colSpan={6} className="py-12 text-center text-muted">No properties found.</td></tr>
              ) : data.data.map((p: any) => (
                <tr
                  key={p._id}
                  className="cursor-pointer"
                  onClick={() => setViewingItem(p)}
                >
                  <td>
                    <div className="font-semibold">{p.propertyTitle}</div>
                    <div className="text-[10px] text-muted font-mono mt-0.5">{p.code}</div>
                  </td>
                  <td>
                    <span className="text-muted">{p.propertyType}</span>
                    {p.purpose && <span className="ml-2 badge badge-blue text-[10px]">{p.purpose}</span>}
                  </td>
                  <td className="font-medium">
                    ₹{p.price?.toLocaleString('en-IN')}
                    {p.area && <div className="text-xs text-muted">{p.area.toLocaleString()} sqft</div>}
                  </td>
                  <td className="text-muted text-xs truncate max-w-[120px]">
                    {p.location?.location || p.location}
                    {p.mainDoorDirection && (
                      <div className="text-[10px] text-muted opacity-75 mt-0.5" title={p.mainDoorDirection}>
                        Door: {p.mainDoorDirection}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={clsx('badge',
                      p.propertyStatus === 'Available' ? 'badge-green' :
                        p.propertyStatus === 'In Allotment' ? 'badge-blue' :
                          p.propertyStatus === 'In Deal' ? 'badge-amber' :
                            p.propertyStatus === 'Sold' ? 'badge-red' : 'badge-gray'
                    )}>
                      {p.propertyStatus}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-icon hover:text-accent hover:bg-accent/10"
                        title="View details"
                        onClick={() => setViewingItem(p)}
                      >
                        <Eye size={15} />
                      </button>
                      {/* Express Interest — agent only, available or in-allotment properties only */}
                      {user?.role === 'agent' && (p.propertyStatus === 'Available' || p.propertyStatus === 'In Allotment') && (
                        <button
                          className={clsx("btn btn-sm", p.isApplied ? "bg-emerald-500/10 text-emerald-600 cursor-default hover:bg-emerald-500/10" : "bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50")}
                          title={p.isApplied ? "You have already applied" : "Express interest in this property"}
                          disabled={p.isApplied || expressingInterestId === p._id || expressInterestMutation.isPending}
                          onClick={() => !p.isApplied && handleExpressInterest(p._id)}
                        >
                          <Handshake size={13} />
                          {p.isApplied ? 'Applied' : 'Interested'}
                        </button>
                      )}
                      {/* Edit & Delete — admin only */}
                      {user?.role === 'admin' && (
                        <>
                          <button
                            className="btn-icon hover:text-blue-600 hover:bg-blue-50"
                            title="Edit"
                            onClick={() => setEditingItem(p)}
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            className="btn-icon hover:text-red-600 hover:bg-red-50"
                            title="Delete"
                            onClick={() => handleDelete(p._id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
    
    <div className="block lg:hidden w-full pb-6 font-sans">
      {/* Mobile Top Bar */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Properties</h1>
          {user?.role === 'admin' && (
            <button className="p-2 rounded-full bg-slate-900 text-white shadow-sm" onClick={() => setIsCreating(true)}>
              <Plus size={18} />
            </button>
          )}
        </div>
        
        {/* Search Bar & Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search size={16} className="text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search properties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 text-sm text-slate-900 rounded-full border border-transparent focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-200/50 transition-all"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={clsx("p-2.5 rounded-full transition-colors flex-shrink-0 relative", showFilters || hasActiveFilters ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600")}
          >
            <SlidersHorizontal size={18} />
            {hasActiveFilters && !showFilters && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
            )}
          </button>
        </div>

        {/* Mobile Filter Dropdown (simplified inline) */}
        {showFilters && (
          <div className="mt-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-3 animate-slide-up">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-semibold text-slate-900">Filters</span>
              <button onClick={clearFilters} className="text-xs text-slate-500 font-medium">Clear</button>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 bg-slate-50 text-sm rounded-lg border border-slate-200"
            >
              <option value="">All Statuses</option>
              <option value="Available">Available</option>
              <option value="In Deal">In Deal</option>
              <option value="Sold">Sold</option>
            </select>
            <select name="type" value={filters.type} onChange={handleFilterChange} className="w-full p-2 bg-slate-50 text-sm rounded-lg border border-slate-200">
              <option value="">Any Type</option>
              <option>Land</option><option>Shop</option><option>Independent House</option><option>Flat</option>
            </select>
          </div>
        )}
      </div>

      {/* Mobile Property List */}
      <div className="px-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-10 text-sm text-slate-500">Loading...</div>
        ) : !data?.data?.length ? (
          <div className="text-center py-10 text-sm text-slate-500">No properties found.</div>
        ) : (
          data.data.map((prop: any) => {
            let badgeColor = 'bg-slate-100 text-slate-600';
            if (prop.propertyStatus === 'Available') badgeColor = 'bg-[#E7F7ED] text-[#137A3B]';
            if (prop.propertyStatus === 'Sold') badgeColor = 'bg-[#FEE2E2] text-[#B91C1C]';
            if (prop.propertyStatus === 'In Allotment') badgeColor = 'bg-[#E0E7FF] text-[#4338CA]';
            if (prop.propertyStatus === 'In Deal') badgeColor = 'bg-[#FEF3C7] text-[#B45309]';

            const tags = [prop.propertyType, prop.purpose, prop.area ? `${prop.area} sqft` : null].filter(Boolean).join(' · ');

            return (
              <div 
                key={prop._id} 
                onClick={() => setViewingItem(prop)}
                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100/50 flex flex-col gap-2 relative cursor-pointer active:scale-[0.99] transition-transform"
              >
                <div className="flex justify-between items-start pr-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 truncate pr-2">{prop.propertyTitle}</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">{prop.location?.location || prop.location}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900 flex-shrink-0">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(prop.price)}
                  </p>
                </div>
                
                <div className="flex justify-between items-end mt-1">
                  <p className="text-[10px] text-slate-400 font-medium">{tags}</p>
                  <span className={clsx('px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wide', badgeColor)}>
                    {prop.propertyStatus}
                  </span>
                </div>

                {/* Express Interest — Agent only */}
                {user?.role === 'agent' && (prop.propertyStatus === 'Available' || prop.propertyStatus === 'In Allotment') && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={prop.isApplied || expressingInterestId === prop._id || expressInterestMutation.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!prop.isApplied) handleExpressInterest(prop._id);
                      }}
                      className={clsx(
                        "w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors",
                        prop.isApplied
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-200/50 cursor-default"
                          : "bg-amber-500 text-white active:bg-amber-600 shadow-sm disabled:opacity-50"
                      )}
                    >
                      <Handshake size={14} />
                      {prop.isApplied ? 'Applied' : 'Interested'}
                    </button>
                  </div>
                )}
                
                <div className="absolute right-3 top-4 text-slate-300">
                  <ChevronRight size={18} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
    </>
  );
}
