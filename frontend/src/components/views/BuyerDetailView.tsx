import {
  ArrowLeft, Edit, User, MapPin, Phone, IndianRupee,
  Maximize2, BedDouble, Car, Calendar, Tag, Target,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/context/AuthContext';

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
            <Field label="Agent Email" value={b.referredByAgentId.email} />
          </Section>
        )}

        {/* Notes */}
        <Section title="Notes & Remarks" icon={Calendar}>
          <Field label="Note" value={b.note} />
          <Field label="Remarks" value={b.remarks} />
        </Section>

        {/* Timestamps */}
        <Section title="Record Info" icon={Calendar}>
          <Field label="Created At" value={formatDate(b.createdAt)} />
          <Field label="Last Updated" value={formatDate(b.updatedAt)} />
        </Section>
      </div>
    </div>
  );
}

function MobileBuyerDetailView({ buyer: b, onBack, onEdit }: Props) {
  const { user } = useAuth();
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
                <span className="text-sm font-medium text-slate-900">{b.referredByAgentId.email}</span>
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
    </div>
  );
}

export function BuyerDetailView(props: Props) {
  return (
    <>
      <div className="hidden lg:block">
        <DesktopBuyerDetailView {...props} />
      </div>
      <div className="block lg:hidden">
        <MobileBuyerDetailView {...props} />
      </div>
    </>
  );
}
