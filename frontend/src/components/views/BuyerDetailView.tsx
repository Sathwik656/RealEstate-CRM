import {
  ArrowLeft, Edit, User, MapPin, Phone, IndianRupee,
  Maximize2, BedDouble, Car, Calendar, Tag, Target, Bell, Sparkles, Loader2, Info
} from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { PropertyCard } from './cards/PropertyCard';

interface Props {
  buyer: any;
  onBack: () => void;
  onEdit: () => void;
}

function Field({ label, value, mono = false }: { label: string; value?: any; mono?: boolean }) {
  const isEmpty = value === null || value === undefined || value === '';
  return (
    <div className="py-3 border-b border-border last:border-0">
      <dt className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">{label}</dt>
      <dd className={clsx('text-sm text-primary', mono && 'font-mono', isEmpty && 'text-muted italic')}>
        {isEmpty ? 'Not set' : String(value)}
      </dd>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-accent" />
          <h3 className="font-display font-semibold text-primary text-sm uppercase tracking-wider">{title}</h3>
        </div>
      </div>
      <div className="card-body p-0">
        <dl className="px-4 sm:px-6">{children}</dl>
      </div>
    </div>
  );
}

function DesktopBuyerDetailView({ buyer: b, onBack, onEdit }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'details' | 'matches'>('details');
  
  const { data: matchesData, isLoading: matchesLoading } = useQuery({
    queryKey: ['matching-properties', b._id],
    queryFn: async () => {
      const res = await api.get(`/buyers/${b._id}/matching-properties`);
      return res.data.data;
    }
  });

  const matchingProperties = matchesData || [];

  const statusBadge = clsx('badge',
    b.status === 'Active' ? 'badge-green' :
    b.status === 'Closed' ? 'badge-red' :
    b.status === 'Follow-up' ? 'badge-amber' : 'badge-gray'
  );

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : undefined;

  const formatPrice = (n?: number) =>
    n !== undefined && n !== null ? `₹${n.toLocaleString('en-IN')}` : undefined;

  return (
    <div className="page-wrapper max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="btn-icon hover:text-primary hover:bg-surface-alt flex-shrink-0">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">{b.buyerName}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="font-mono text-xs text-muted">{b.code}</span>
              <span className={statusBadge}>{b.status}</span>
              {b.purpose && (
                <span className={clsx('badge', b.purpose === 'Purchase' ? 'badge-blue' : 'badge-amber')}>
                  {b.purpose}
                </span>
              )}
            </div>
          </div>
        </div>
        <button 
          onClick={onEdit} 
          className={clsx(
            "btn-outline btn-sm items-center gap-1.5 flex-shrink-0",
            user?.role !== 'admin' ? "hidden lg:flex" : "flex"
          )}
        >
          <Edit size={14} /> Edit
        </button>
      </div>

      <div className="flex items-center gap-4 border-b border-border mb-6 mt-6">
        <button
          onClick={() => setActiveTab('details')}
          className={clsx(
            "pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors",
            activeTab === 'details' ? "border-accent text-accent" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          )}
        >
          <Info size={16} /> Buyer Details
        </button>
        <button
          onClick={() => setActiveTab('matches')}
          className={clsx(
            "pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors",
            activeTab === 'matches' ? "border-accent text-accent" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          )}
        >
          <Sparkles size={16} /> Matching Properties
          {matchingProperties.length > 0 && (
            <span className={clsx(
              "px-1.5 py-0.5 rounded-full text-[10px]",
              activeTab === 'matches' ? "bg-accent/10 text-accent" : "bg-slate-100 text-slate-500"
            )}>
              {matchingProperties.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'details' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Personal Info */}
        <Section title="Contact Details" icon={User}>
          <Field label="Buyer Name" value={b.buyerName} />
          <Field label="Buyer Code" value={b.code} mono />
          <Field label="Contact Number" value={b.contactNumber} />
          <Field label="Address" value={b.address} />
          <Field label="Status" value={b.status} />
        </Section>

        {/* Requirements */}
        <Section title="Property Requirements" icon={Target}>
          <Field label="Purpose" value={b.purpose} />
          <Field label="Preferred Location" value={b.preferredLocation} />
          <Field label="Property Type Interested" value={b.propertyTypeInterested} />
          <Field label="BHK Requirement" value={b.bhkRequirement ? `${b.bhkRequirement} BHK` : undefined} />
          <Field label="Area Requirement" value={b.areaRequirement ? `${b.areaRequirement.toLocaleString()} sq ft` : undefined} />
          <Field label="Parking Requirement" value={b.parkingRequirement} />
        </Section>

        {/* Budget */}
        <Section title="Budget" icon={IndianRupee}>
          <Field label="Min Budget" value={formatPrice(b.budgetMin)} />
          <Field label="Max Budget" value={formatPrice(b.budgetMax)} />
        </Section>

        {/* Agent Referral */}
        {b.referredByAgentId && (
          <Section title="Agent Referral" icon={Tag}>
            <Field label="Referred By (Agent)" value={b.referredByAgentId.name} />
            {/* <Field label="Agent Email" value={...email} /> */}
          </Section>
        )}

        {/* Notes */}
        <Section title="Notes & Remarks" icon={Calendar}>
          <Field label="Note" value={b.note} />
          <Field label="Remarks" value={b.remarks} />
        </Section>

        {/* Reminder */}
        {b.reminderDate && (
          <Section title="Follow-up Reminder" icon={Bell}>
            <Field label="Scheduled For" value={new Date(b.reminderDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} />
            <Field label="Status" value={b.reminderStatus === 'completed' ? 'Completed' : 'Pending'} />
          </Section>
        )}

        {/* Timestamps */}
        <Section title="Record Info" icon={Calendar}>
          <Field label="Created At" value={formatDate(b.createdAt)} />
          <Field label="Last Updated" value={formatDate(b.updatedAt)} />
        </Section>
        </div>
      ) : (
        <div className="mt-4">
          {matchesLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p>Calculating matches...</p>
            </div>
          ) : matchingProperties.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {matchingProperties.map((match: any) => (
                <PropertyCard 
                  key={match._id} 
                  property={match} 
                  matchPercentage={match.matchPercentage}
                  onView={() => navigate(`/properties/${match.code}`)} 
                />
              ))}
            </div>
          ) : (
            <div className="card py-12 text-center bg-slate-50 border-dashed border-2">
              <div className="mx-auto w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-3">
                <Target className="text-slate-400" size={20} />
              </div>
              <h3 className="font-semibold text-slate-700">No matching properties found.</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Try adjusting the buyer's budget or location requirements to see more properties.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MobileBuyerDetailView({ buyer: b, onBack, onEdit }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'details' | 'matches'>('details');

  const { data: matchesData, isLoading: matchesLoading } = useQuery({
    queryKey: ['matching-properties', b._id],
    queryFn: async () => {
      const res = await api.get(`/buyers/${b._id}/matching-properties`);
      return res.data.data;
    }
  });

  const matchingProperties = matchesData || [];

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : undefined;
  
  const formatPrice = (n?: number) =>
    n !== undefined && n !== null ? `₹${n.toLocaleString('en-IN')}` : '-';

  const statusBadge = clsx('px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide',
    b.status === 'Active' ? 'bg-[#E7F7ED] text-[#137A3B]' :
    b.status === 'Closed' ? 'bg-[#FEE2E2] text-[#B91C1C]' :
    b.status === 'Follow-up' ? 'bg-[#FEF3C7] text-[#B45309]' : 'bg-slate-100 text-slate-600'
  );

  return (
    <div className="w-full pb-6 font-sans">
      <div className="px-4 pt-6 pb-4">
        <div className="flex justify-between items-start mb-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full text-slate-500">
            <ArrowLeft size={20} />
          </button>
          {user?.role === 'admin' && (
            <button onClick={onEdit} className="text-sm font-semibold text-accent py-1.5 px-3 bg-accent/10 rounded-full">
              Edit
            </button>
          )}
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{b.buyerName}</h1>
        <p className="text-xs text-slate-500 font-mono mt-0.5">{b.code}</p>
        
        <div className="flex gap-2 mt-3 flex-wrap">
          <span className={statusBadge}>
            {b.status}
          </span>
          {b.purpose && (
            <span className={clsx('px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide', b.purpose === 'Purchase' ? 'bg-[#E0E7FF] text-[#4338CA]' : 'bg-[#FEF3C7] text-[#B45309]')}>
              {b.purpose}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center w-full border-b border-slate-200 mb-4 bg-white sticky top-0 z-10">
        <button
          onClick={() => setActiveTab('details')}
          className={clsx(
            "flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors",
            activeTab === 'details' ? "border-accent text-accent" : "border-transparent text-slate-500"
          )}
        >
          <Info size={16} /> Details
        </button>
        <button
          onClick={() => setActiveTab('matches')}
          className={clsx(
            "flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors",
            activeTab === 'matches' ? "border-accent text-accent" : "border-transparent text-slate-500"
          )}
        >
          <Sparkles size={16} /> Matches
          {matchingProperties.length > 0 && (
            <span className={clsx(
              "px-1.5 py-0.5 rounded-full text-[10px]",
              activeTab === 'matches' ? "bg-accent/10 text-accent" : "bg-slate-100 text-slate-500"
            )}>
              {matchingProperties.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'details' ? (
        <div className="px-4 space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/50">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Contact Details</h2>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-500">Phone</span>
              <span className="text-sm font-medium text-slate-900">{b.contactNumber || '-'}</span>
            </div>
            <div className="flex flex-col gap-1 pt-1 border-b border-slate-50 pb-2.5 last:border-0">
              <span className="text-sm text-slate-500">Address</span>
              <span className="text-sm font-medium text-slate-900 leading-snug">{b.address || '-'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/50">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Requirements</h2>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-500">Location</span>
              <span className="text-sm font-medium text-slate-900">{b.preferredLocation || '-'}</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-500">Type</span>
              <span className="text-sm font-medium text-slate-900">{b.propertyTypeInterested || '-'}</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-500">BHK</span>
              <span className="text-sm font-medium text-slate-900">{b.bhkRequirement ? `${b.bhkRequirement} BHK` : '-'}</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-500">Area</span>
              <span className="text-sm font-medium text-slate-900">{b.areaRequirement ? `${b.areaRequirement.toLocaleString()} sq ft` : '-'}</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-500">Parking</span>
              <span className="text-sm font-medium text-slate-900">{b.parkingRequirement || '-'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/50">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Budget</h2>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-500">Min Budget</span>
              <span className="text-sm font-medium text-slate-900">{formatPrice(b.budgetMin)}</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-500">Max Budget</span>
              <span className="text-sm font-medium text-slate-900">{formatPrice(b.budgetMax)}</span>
            </div>
          </div>
        </div>

        {b.referredByAgentId && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/50">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Agent Referral</h2>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-500">Referred By</span>
                <span className="text-sm font-medium text-slate-900">{b.referredByAgentId.name}</span>
              </div>
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-500">Email</span>
                {/* <span className="text-sm font-medium text-slate-900">{...email}</span> */}
              </div>
            </div>
          </div>
        )}

        {b.reminderDate && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/50">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Bell size={14} className="text-accent"/> Reminder</h2>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-500">Scheduled</span>
                <span className="text-sm font-medium text-slate-900">{new Date(b.reminderDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-500">Status</span>
                <span className={clsx("text-sm font-medium", b.reminderStatus === 'completed' ? 'text-emerald-600' : 'text-amber-600')}>{b.reminderStatus === 'completed' ? 'Completed' : 'Pending'}</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/50">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Notes & Record</h2>
          <div className="space-y-2.5">
            {b.note && (
              <div className="flex flex-col gap-1 pb-2.5 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-500">Note</span>
                <span className="text-sm font-medium text-slate-900 leading-snug">{b.note}</span>
              </div>
            )}
            {b.remarks && (
              <div className="flex flex-col gap-1 pb-2.5 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-500">Remarks</span>
                <span className="text-sm font-medium text-slate-900 leading-snug">{b.remarks}</span>
              </div>
            )}
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-500">Created At</span>
              <span className="text-sm font-medium text-slate-900">{formatDate(b.createdAt) || '-'}</span>
            </div>
          </div>
        </div>
        </div>
      ) : (
        <div className="px-4">
          {matchesLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p className="text-sm">Calculating matches...</p>
            </div>
          ) : matchingProperties.length > 0 ? (
            <div className="space-y-4">
              {matchingProperties.map((match: any) => (
                <PropertyCard 
                  key={match._id} 
                  property={match} 
                  matchPercentage={match.matchPercentage}
                  onView={() => navigate(`/properties/${match.code}`)} 
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100/50">
              <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                <Target className="text-slate-400" size={20} />
              </div>
              <h3 className="text-sm font-semibold text-slate-700">No matches found.</h3>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function BuyerDetailView(props: Props) {
  return <DesktopBuyerDetailView {...props} />;
}
