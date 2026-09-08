import {
  ArrowLeft, Edit, User, MapPin, Phone, IndianRupee,
  Maximize2, BedDouble, Car, Calendar, Tag, Target,
} from 'lucide-react';
import clsx from 'clsx';

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

export function BuyerDetailView({ buyer: b, onBack, onEdit }: Props) {
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
        <button onClick={onEdit} className="btn-outline btn-sm flex items-center gap-1.5 flex-shrink-0">
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
        <Section title="Agent Referral" icon={Tag}>
          <Field label="Referred By (Agent)" value={b.referredByAgentId?.name} />
          <Field label="Agent Email" value={b.referredByAgentId?.email} />
        </Section>

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
