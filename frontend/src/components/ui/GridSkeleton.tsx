export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-border p-5 shadow-sm animate-pulse">
          <div className="h-5 bg-surface-alt rounded w-2/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-surface-alt rounded w-full"></div>
            <div className="h-3 bg-surface-alt rounded w-4/5"></div>
            <div className="h-3 bg-surface-alt rounded w-5/6"></div>
          </div>
          <div className="mt-6 pt-4 border-t border-border flex justify-between">
            <div className="h-6 bg-surface-alt rounded w-16"></div>
            <div className="h-6 bg-surface-alt rounded w-16"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
