export function CertProgress({ value }: { value: number }) {
  return <div className="min-w-12"><span className="text-xs tabular-nums">{value}%</span><div role="progressbar" aria-label="Certification progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} className="mt-1 h-1.5 overflow-hidden rounded bg-muted"><div className="h-full bg-foreground" style={{ width: `${value}%` }} /></div></div>;
}
