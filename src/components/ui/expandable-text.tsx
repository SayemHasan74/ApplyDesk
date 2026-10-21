'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export function ExpandableText({ text, lines = 3 }: { text: string; lines?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const measure = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    const previous = node.style.webkitLineClamp;
    node.style.webkitLineClamp = String(lines);
    setOverflows(node.scrollHeight > node.clientHeight + 1);
    node.style.webkitLineClamp = previous;
  }, [lines]);
  useLayoutEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, text]);
  return <span className="block min-w-0">
    <span ref={ref} className="expandable-copy" style={{ WebkitLineClamp: expanded ? 'unset' : lines }}>{text}</span>
    {overflows && <button type="button" className="min-h-7 text-xs text-muted-foreground underline underline-offset-2" aria-expanded={expanded}
      onClick={() => setExpanded((value) => !value)}>{expanded ? 'Show less' : 'Show more'}</button>}
  </span>;
}
