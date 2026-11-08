export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <div className="flex items-center gap-3 text-[13px] text-muted">
        <span className="size-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" aria-hidden />
        {label}
      </div>
    </div>
  );
}
