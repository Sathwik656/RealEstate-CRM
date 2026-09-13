import {
  ArrowLeft, Edit, Home, MapPin, IndianRupee, Maximize2,
  BedDouble, Car, Compass, Calendar, Phone, Tag,
  Building2, User, AlertCircle, CheckCircle, Handshake,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/context/AuthContext';

interface Props {
  property: any;
  onBack: () => void;
  onEdit: () => void;
  onExpressInterest?: (propertyId: string) => void;
  isExpressInterestPending?: boolean;
  expressingInterestId?: string | null;
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

function DesktopPropertyDetailView({ property: p, onBack, onEdit, onExpressInterest, isExpressInterestPending, expressingInterestId }: Props) {
  const { user } = useAuth();
  const statusBadge = clsx('badge',
    p.propertyStatus === 'Available' ? 'badge-green' :
    p.propertyStatus === 'In Allotment' ? 'badge-blue' :
    p.propertyStatus === 'In Deal' ? 'badge-amber' :
    p.propertyStatus === 'Sold' ? 'badge-red' : 'badge-gray'
  );

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : undefined;

  const formatMonth = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : undefined;

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
            <h1 className="page-title">{p.propertyTitle}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="font-mono text-xs text-muted">{p.code}</span>
              <span className={statusBadge}>{p.propertyStatus}</span>
              {p.purpose && <span className="badge badge-blue">{p.purpose}</span>}
              {p.propertyType && <span className="badge badge-amber">{p.propertyType}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === 'admin' && (
            <button onClick={onEdit} className="btn-outline btn-sm flex items-center gap-1.5 flex-shrink-0">
              <Edit size={14} /> Edit
            </button>
          )}
          {user?.role === 'agent' && (p.propertyStatus === 'Available' || p.propertyStatus === 'In Allotment') && onExpressInterest && (
            <button
              className={clsx("btn btn-sm flex items-center gap-1.5 flex-shrink-0", p.isApplied ? "bg-emerald-500/10 text-emerald-600 cursor-default hover:bg-emerald-500/10 border border-emerald-200" : "bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50")}
              title={p.isApplied ? "You have already applied" : "Express interest in this property"}
              disabled={p.isApplied || expressingInterestId === p._id || isExpressInterestPending}
              onClick={() => !p.isApplied && onExpressInterest(p._id)}
            >
              <Handshake size={14} />
              {p.isApplied ? 'Applied' : 'Interested'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Basic Info */}
        <Section title="Property Details" icon={Building2}>
          <Field label="Property Title" value={p.propertyTitle} />
          <Field label="Property Code" value={p.code} mono />
          <Field label="Type" value={p.propertyType} />
          <Field label="Purpose" value={p.purpose} />
          <Field label="Status" value={p.propertyStatus} />
          <Field label="Description" value={p.propertyDescription} />
        </Section>

        {/* Pricing & Size */}
        <Section title="Pricing & Size" icon={IndianRupee}>
          <Field label="Price" value={formatPrice(p.price)} />
          <Field label="Area" value={p.area ? `${p.area.toLocaleString()} sq ft` : undefined} />
          {['Independent House', 'Flat'].includes(p.propertyType) && (
            <Field label="BHK" value={p.bhk ? `${p.bhk} BHK` : undefined} />
          )}
          <Field label="Year of Construction" value={formatMonth(p.yearOfConstruction)} />
        </Section>

        {/* Location */}
        <Section title="Location" icon={MapPin}>
          <Field label="Location" value={p.location?.location ? `${p.location.location} (${p.location.code})` : p.location} />
          <Field label="Address" value={p.address} />
          <Field label="Landmark" value={p.landmark} />
          <Field label="Main Door Direction" value={p.mainDoorDirection} />
        </Section>

        {/* Amenities */}
        <Section title="Amenities" icon={Home}>
          <Field label="Parking Available" value={p.parkingAvailable ? 'Yes' : 'No'} />
          <Field label="Parking Type" value={p.parkingType} />
          <Field label="Contact Number" value={p.contactNumber} />
        </Section>

        {/* Ownership & Referral */}
        <Section title="Ownership & Referral" icon={User}>
          {p.sellerId ? (
            <>
              <Field label="Seller Name" value={p.sellerId?.sellerName} />
              <Field label="Seller Contact" value={p.sellerId?.contactNumber} />
              {p.sellerId?.address && <Field label="Seller Address" value={p.sellerId.address} />}
              {p.sellerId?.note && <Field label="Seller Note" value={p.sellerId.note} />}
            </>
          ) : (
            <Field label="Seller" value={undefined} />
          )}
          {p.referredByAgentId && (
            <>
              <Field label="Referred By (Agent)" value={p.referredByAgentId.name} />
              <Field label="Agent Email" value={p.referredByAgentId.email} />
            </>
          )}
        </Section>

        {/* Timestamps */}
        <Section title="Record Info" icon={Calendar}>
          <Field label="Created At" value={formatDate(p.createdAt)} />
          <Field label="Last Updated" value={formatDate(p.updatedAt)} />
        </Section>
      </div>
    </div>
  );
}

function MobilePropertyDetailView({ property: p, onBack, onEdit, onExpressInterest, isExpressInterestPending, expressingInterestId }: Props) {
  const { user } = useAuth();
  const formatMonth = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : undefined;

  let badgeColor = 'bg-slate-100 text-slate-600';
  if (p.propertyStatus === 'Available') badgeColor = 'bg-[#E7F7ED] text-[#137A3B]';
  if (p.propertyStatus === 'Sold') badgeColor = 'bg-[#FEE2E2] text-[#B91C1C]';
  if (p.propertyStatus === 'In Allotment') badgeColor = 'bg-[#E0E7FF] text-[#4338CA]';
  if (p.propertyStatus === 'In Deal') badgeColor = 'bg-[#FEF3C7] text-[#B45309]';

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
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{p.propertyTitle}</h1>
        <p className="text-xs text-slate-500 font-mono mt-0.5">{p.code}</p>
        
        <div className="flex gap-2 mt-3 flex-wrap">
          <span className={clsx('px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide', badgeColor)}>
            {p.propertyStatus}
          </span>
          {p.purpose && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-slate-100 text-slate-600">
              {p.purpose}
            </span>
          )}
          {p.propertyType && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-slate-100 text-slate-600">
              {p.propertyType}
            </span>
          )}
        </div>

        {user?.role === 'agent' && (p.propertyStatus === 'Available' || p.propertyStatus === 'In Allotment') && onExpressInterest && (
          <div className="mt-4">
            <button
              disabled={p.isApplied || expressingInterestId === p._id || isExpressInterestPending}
              onClick={() => !p.isApplied && onExpressInterest(p._id)}
              className={clsx(
                "w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm",
                p.isApplied
                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-200/50 cursor-default"
                  : "bg-amber-500 text-white active:bg-amber-600 disabled:opacity-50"
              )}
            >
              <Handshake size={16} />
              {p.isApplied ? 'Applied (Interest Registered)' : 'Express Interest'}
            </button>
          </div>
        )}
      </div>

      <div className="px-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/50">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Property Details</h2>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-500">Type</span>
              <span className="text-sm font-medium text-slate-900">{p.propertyType || '-'}</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-500">Purpose</span>
              <span className="text-sm font-medium text-slate-900">{p.purpose || '-'}</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-500">Status</span>
              <span className="text-sm font-medium text-slate-900">{p.propertyStatus || '-'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/50">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Pricing & Size</h2>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-500">Price</span>
              <span className="text-sm font-medium text-slate-900">{p.price ? `₹${p.price.toLocaleString('en-IN')}` : '-'}</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-500">Area</span>
              <span className="text-sm font-medium text-slate-900">{p.area ? `${p.area} sq ft` : '-'}</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-500">Built in</span>
              <span className="text-sm font-medium text-slate-900">{formatMonth(p.yearOfConstruction) || '-'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/50">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Location</h2>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-500">Area</span>
              <span className="text-sm font-medium text-slate-900">{p.location?.location || p.location || '-'}</span>
            </div>
            <div className="flex flex-col gap-1 pt-1">
              <span className="text-sm text-slate-500">Address</span>
              <span className="text-sm font-medium text-slate-900">{p.address || '-'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PropertyDetailView(props: Props) {
  return (
    <>
      <div className="hidden lg:block">
        <DesktopPropertyDetailView {...props} />
      </div>
      <div className="block lg:hidden">
        <MobilePropertyDetailView {...props} />
      </div>
    </>
  );
}
