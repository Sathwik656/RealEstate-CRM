import {
  ArrowLeft, Edit, Home, MapPin, IndianRupee, Maximize2,
  BedDouble, Car, Compass, Calendar, Phone, Tag,
  Building2, User, AlertCircle, CheckCircle,
} from 'lucide-react';
import clsx from 'clsx';

interface Props {
  property: any;
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

export function PropertyDetailView({ property: p, onBack, onEdit }: Props) {
  const statusBadge = clsx('badge',
    p.propertyStatus === 'Available' ? 'badge-green' :
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
        <button onClick={onEdit} className="btn-outline btn-sm flex items-center gap-1.5 flex-shrink-0">
          <Edit size={14} /> Edit
        </button>
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
          <Field label="Seller" value={p.sellerId?.sellerName || (p.sellerId ? 'Linked' : undefined)} />
          <Field label="Referred By (Agent)" value={p.referredByAgentId?.name} />
          <Field label="Agent Email" value={p.referredByAgentId?.email} />
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
