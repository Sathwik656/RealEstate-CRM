import {
  ArrowLeft, Edit, User, MapPin, Phone, Calendar, Tag,
} from 'lucide-react';
import clsx from 'clsx';

interface Props {
  seller: any;
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

export function SellerDetailView({ seller: s, onBack, onEdit }: Props) {
  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : undefined;

  return (
    <div className="page-wrapper max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="btn-icon hover:text-primary hover:bg-surface-alt flex-shrink-0">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">{s.sellerName}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="font-mono text-xs text-muted">{s.code}</span>
            </div>
          </div>
        </div>
        <button onClick={onEdit} className="btn-outline btn-sm flex items-center gap-1.5 flex-shrink-0">
          <Edit size={14} /> Edit
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Contact Info */}
        <Section title="Contact Details" icon={User}>
          <Field label="Seller Name" value={s.sellerName} />
          <Field label="Seller Code" value={s.code} mono />
          <Field label="Contact Number" value={s.contactNumber} />
          <Field label="Address" value={s.address} />
        </Section>

        {/* Agent Referral */}
        {s.referredByAgentId && (
          <Section title="Agent Referral" icon={Tag}>
            <Field label="Referred By (Agent)" value={s.referredByAgentId.name} />
            <Field label="Agent Email" value={s.referredByAgentId.email} />
          </Section>
        )}

        {/* Notes - full width */}
        <div className="lg:col-span-2">
          <Section title="Notes" icon={Calendar}>
            <Field label="Note" value={s.note} />
          </Section>
        </div>

        {/* Timestamps */}
        <Section title="Record Info" icon={Calendar}>
          <Field label="Created At" value={formatDate(s.createdAt)} />
          <Field label="Last Updated" value={formatDate(s.updatedAt)} />
        </Section>
      </div>
    </div>
  );
}
