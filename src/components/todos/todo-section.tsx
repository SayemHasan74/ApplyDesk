'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { TODO_VIEWS } from '@/lib/constants';

export function TodoSection({ name, count, pending, onClear, children }: {
  name: typeof TODO_VIEWS[number]; count: number; pending: boolean; onClear: () => void; children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const label = name.charAt(0).toUpperCase() + name.slice(1);
  return <section aria-labelledby={`section-${name}`} className="border-t-2 border-foreground">
    <div className="flex min-h-16 items-center justify-between gap-3"><h2 id={`section-${name}`} className={`text-xl font-semibold ${name === 'overdue' ? 'text-destructive' : ''}`}>
      {name === 'done' ? <button type="button" className="min-h-11 text-left" aria-expanded={expanded} aria-controls="done-tasks" onClick={() => setExpanded((value) => !value)}>Done <span className="text-sm font-normal">({count}) {expanded ? '−' : '+'}</span></button> : <>{label} <span className="text-sm font-normal text-muted-foreground">({count})</span></>}
    </h2>{name === 'done' && <Button type="button" variant="outline" disabled={pending} onClick={onClear}>Clear done</Button>}</div>
    {name === 'done' ? <div id="done-tasks" hidden={!expanded}>{children}</div> : children}
  </section>;
}
