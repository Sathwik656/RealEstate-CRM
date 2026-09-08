import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import clsx from 'clsx';

interface Location {
  _id: string;
  location: string;
  code: string;
}

interface Props {
  value: string;
  onChange: (val: string) => void;
  locations: Location[];
  error?: string;
}

export function LocationSelect({ value, onChange, locations, error }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLoc = locations?.find(l => l._id === value);
  const filtered = (locations || []).filter(l => 
    l.location.toLowerCase().includes(search.toLowerCase()) || 
    l.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={containerRef}>
      <div 
        className={clsx("form-input flex items-center justify-between cursor-pointer", error && "border-red-500")}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selectedLoc ? "text-primary" : "text-muted"}>
          {selectedLoc ? `${selectedLoc.location} — ${selectedLoc.code}` : 'Select a location...'}
        </span>
        <ChevronDown size={16} className="text-muted" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border flex items-center gap-2">
            <Search size={14} className="text-muted" />
            <input 
              type="text" 
              className="w-full bg-transparent text-sm outline-none text-primary"
              placeholder="Search by name or code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-3 text-sm text-muted text-center">No locations found</div>
            ) : (
              filtered.map(l => (
                <div 
                  key={l._id}
                  className={clsx(
                    "px-3 py-2 text-sm cursor-pointer hover:bg-surface-alt flex items-center justify-between",
                    value === l._id ? "text-accent bg-accent/5 font-medium" : "text-primary"
                  )}
                  onClick={() => {
                    onChange(l._id);
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  <span>{l.location} — {l.code}</span>
                  {value === l._id && <Check size={14} />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
