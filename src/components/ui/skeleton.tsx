import { cn } from '../../lib/utils';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[var(--panel-muted)]",
        className
      )}
      {...props}
    />
  );
}

export function DocumentCardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 flex flex-col justify-between h-[180px] shadow-sm animate-pulse">
      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <Skeleton className="h-5 w-5 rounded-full shrink-0" />
            <Skeleton className="h-5 w-3/4" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full shrink-0" />
        </div>
        <Skeleton className="h-3 w-1/3 mt-2" />
        <div className="flex gap-2 mt-4">
          <Skeleton className="h-6 w-20 rounded-md" />
          <Skeleton className="h-6 w-24 rounded-md" />
        </div>
      </div>
      <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full divide-y divide-[var(--border)] animate-pulse">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton 
              key={c} 
              className={cn(
                "h-4",
                c === 0 ? "w-8" : c === 1 ? "w-28" : c === 2 ? "w-40 flex-1" : "w-20"
              )} 
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function InspectorSkeleton() {
  return (
    <div className="flex flex-col space-y-4 p-1 animate-pulse">
      <Skeleton className="h-5 w-24" />
      <div className="grid grid-cols-[80px_1fr] gap-y-3">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="pt-3 border-t border-[var(--border)]">
        <Skeleton className="h-4 w-20 mb-2" />
        <Skeleton className="h-16 w-full rounded-md" />
      </div>
    </div>
  );
}

export function SequenceLoadingSkeleton() {
  return (
    <div className="flex flex-col space-y-2 p-4 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 font-mono text-[12px]">
          <Skeleton className="h-4 w-16 shrink-0" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}
