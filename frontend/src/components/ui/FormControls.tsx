import React from 'react';
import clsx from 'clsx';

interface SegmentedControlProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

export function SegmentedControl({ options, value, onChange, className }: SegmentedControlProps) {
  return (
    <div className={clsx("inline-flex bg-slate-100/80 p-1 rounded-xl", className)}>
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={clsx(
              "px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none",
              isActive 
                ? "bg-white text-slate-800 shadow-sm" 
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

interface SwitchToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export function SwitchToggle({ checked, onChange, label, className }: SwitchToggleProps) {
  return (
    <label className={clsx("flex items-center gap-3 cursor-pointer", className)}>
      <div 
        className={clsx(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500",
          checked ? "bg-indigo-600" : "bg-slate-200"
        )}
      >
        <input 
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          aria-hidden="true"
          className={clsx(
            "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
            checked ? "translate-x-4" : "translate-x-0"
          )}
        />
      </div>
      {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
    </label>
  );
}
