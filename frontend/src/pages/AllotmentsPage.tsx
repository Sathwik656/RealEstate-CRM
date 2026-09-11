import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { ClipboardCheck, Handshake, Users, Building2, MapPin, User, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="py-2.5 border-b border-border last:border-0">
      <dt className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-0.5">{label}</dt>
      <dd className={clsx('text-sm', value ? 'text-primary font-medium' : 'text-muted italic')}>{value || 'Not set'}</dd>
    </div>
  );
}

function Section({ title, icon: Icon, children, accent = false }: { title: string; icon: any; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className={clsx('rounded-lg border overflow-hidden', accent ? 'border-accent bg-accent/5' : 'border-border bg-surface')}>
      <div className={clsx('px-4 py-3 border-b flex items-center gap-2', accent ? 'border-accent/40 bg-accent/10' : 'border-border bg-surface-alt')}>
        <Icon size={14} className={clsx('flex-shrink-0', accent ? 'text-accent' : 'text-muted')} />
        <h4 className={clsx('text-xs font-bold uppercase tracking-wider', accent ? 'text-accent' : 'text-muted')}>{title}</h4>
      </div>
      <dl className="px-4">{children}</dl>
    </div>
  );
}

function AllotModal({ allotment, onClose, onAllotted }: { allotment: any; onClose: () => void; onAllotted: () => void }) {
  const qc = useQueryClient();
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  
  const p = allotment.property;
  const interests = allotment.interests;
  const seller = p?.sellerId;
  const location = typeof p?.location === 'object' ? `${p.location?.location}${p.location?.code ? ` (${p.location.code})` : ''}` : p?.location;

  const allotMutation = useMutation({
    mutationFn: (agentId: string) => api.post(`/allotments/${p._id}/allot`, { agentId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['allotments'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      alert('Property allotted successfully! It has been moved to the agent\'s deals.');
      onAllotted();
      onClose();
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'Failed to allot property.');
    }
  });

  const handleAllot = () => {
    if (!selectedAgentId) return;
    if (!window.confirm('Are you sure you want to allot this property to the selected agent? This will create a Deal.')) return;
    allotMutation.mutate(selectedAgentId);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-4xl my-auto flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 rounded-t-xl flex-shrink-0" style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #252b3b 100%)' }}>
          <p className="text-white/50 text-xs font-mono mb-1">{p.code}</p>
          <h2 className="text-white font-display font-bold text-xl">Allot Property</h2>
          <p className="text-white/50 text-xs mt-1">Select an interested agent to assign this property to</p>
        </div>

        <div className="p-5 overflow-y-auto flex-1 flex flex-col lg:flex-row gap-6">
          {/* Left Column - Property Details */}
          <div className="flex-1 space-y-4">
            <Section title="Property Details" icon={Building2}>
              <InfoRow label="Title" value={p.propertyTitle} />
              <InfoRow label="Type" value={p.propertyType} />
              <InfoRow label="Original Price" value={p.price ? `₹${p.price.toLocaleString('en-IN')}` : null} />
              <InfoRow label="Location" value={location} />
            </Section>

            <Section title="Owner (Seller)" icon={User}>
              {seller ? (
                <>
                  <InfoRow label="Name" value={seller.sellerName} />
                  <InfoRow label="Contact" value={seller.contactNumber} />
                </>
              ) : (
                <InfoRow label="Seller" value={null} />
              )}
            </Section>
          </div>

          {/* Right Column - Interested Agents */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} className="text-accent" />
              <h3 className="font-bold uppercase tracking-wider text-sm">Interested Agents</h3>
            </div>
            
            <div className="flex-1 bg-surface-alt border border-border rounded-lg p-3 space-y-2 overflow-y-auto min-h-[250px]">
              {interests.length === 0 ? (
                <p className="text-muted text-sm text-center py-8">No agents have expressed interest yet.</p>
              ) : (
                interests.map((interest: any) => {
                  const agent = interest.agent;
                  const isSelected = selectedAgentId === agent._id;
                  return (
                    <div 
                      key={interest._id}
                      onClick={() => setSelectedAgentId(agent._id)}
                      className={clsx(
                        'p-3 border rounded-lg cursor-pointer transition-colors',
                        isSelected ? 'border-accent bg-accent/10 shadow-sm' : 'border-border bg-surface hover:border-accent/40'
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-sm text-primary">{agent.name}</div>
                          <div className="text-xs text-muted font-mono mt-0.5">{agent.code}</div>
                        </div>
                        <div className="text-[10px] text-muted whitespace-nowrap">
                          {new Date(interest.expressedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-muted">
                        <div>{agent.email}</div>
                        {agent.phone && <div>{agent.phone}</div>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border flex justify-end gap-3 flex-shrink-0">
          <button className="btn btn-outline" onClick={onClose} disabled={allotMutation.isPending}>Cancel</button>
          <button 
            className="btn btn-accent" 
            onClick={handleAllot} 
            disabled={allotMutation.isPending || !selectedAgentId}
          >
            {allotMutation.isPending ? 'Allotting...' : 'Allot Property'}
            <ArrowRight size={16} className="ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AllotmentsPage() {
  const [viewingAllotment, setViewingAllotment] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['allotments'],
    queryFn: async () => {
      const res = await api.get('/allotments');
      return res.data;
    },
  });

  return (
    <div className="page-wrapper">
      {viewingAllotment && (
        <AllotModal 
          allotment={viewingAllotment} 
          onClose={() => setViewingAllotment(null)} 
          onAllotted={() => setViewingAllotment(null)} 
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Allotment Requests</h1>
          <p className="page-subtitle">Assign properties to interested agents</p>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Type</th>
                <th>Location</th>
                <th>Referred By</th>
                <th>Interested Agents</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="py-12 text-center text-muted">Loading allotments...</td></tr>
              ) : !data?.data?.length ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Users size={36} className="text-muted mx-auto mb-3 opacity-40" />
                    <p className="text-muted text-sm">No properties currently in allotment.</p>
                  </td>
                </tr>
              ) : data.data.map((allotment: any) => {
                const p = allotment.property;
                const interests = allotment.interests;
                const location = typeof p?.location === 'object' ? p.location?.location : p?.location;
                return (
                  <tr key={p._id} className="hover:bg-surface-alt transition-colors">
                    <td>
                      <div className="font-semibold text-sm">{p?.propertyTitle ?? '—'}</div>
                      <div className="text-[10px] text-muted font-mono mt-0.5">{p?.code ?? '—'}</div>
                    </td>
                    <td className="text-sm text-muted">{p?.propertyType ?? '—'}</td>
                    <td className="text-sm text-muted">{location ?? '—'}</td>
                    <td>
                      <div className="text-sm">{p.referredByAgentId?.name || ''}</div>
                    </td>
                    <td>
                      <div className="inline-flex items-center justify-center bg-accent/10 text-accent font-bold text-xs rounded-full h-6 px-3">
                        {interests.length} Agent{interests.length !== 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="text-right">
                      <button className="btn btn-sm btn-accent" onClick={() => setViewingAllotment(allotment)}>
                        <Handshake size={13} />
                        Review &amp; Allot
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
