import { ExpandableText } from '@/components/ui/expandable-text';
import { fieldLabel } from '@/lib/client/proposal-form';

export function ProposalValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '' || value === 'unknown' || (Array.isArray(value) && !value.length)) return <span className="italic text-[var(--warning-text)]">Not found</span>;
  const text = Array.isArray(value) ? value.join(' • ') : typeof value === 'boolean' ? value ? 'On' : 'Off' : String(value);
  return <ExpandableText text={text} lines={2} />;
}
export function ProposalFields({ values }: { values: Record<string, unknown> }) {
  return <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
    {Object.entries(values).map(([key, value]) => <div key={key} className={['descriptionSummary', 'requirements', 'prerequisites', 'notes', 'details', 'eligibility', 'deadlineNote', 'compensationText', 'costText', 'sourceUrls'].includes(key) ? 'col-span-2 min-w-0' : 'min-w-0'}>
      <dt className="mb-1 text-muted-foreground">{fieldLabel(key)}</dt><dd className="min-h-8 break-words">
        {key === 'sourceUrls' && Array.isArray(value) && value.length ? <SourceLinks sources={value.filter((url): url is string => typeof url === 'string')} /> : <ProposalValue value={value} />}
      </dd></div>)}
  </dl>;
}
export function SourceLinks({ sources }: { sources: string[] }) {
  return <span className="flex flex-wrap gap-3">{[...new Set(sources)].filter((url) => /^https?:\/\//i.test(url)).map((url, index) => <a key={url} href={url} className="inline-flex min-h-8 items-center underline" target="_blank" rel="noopener noreferrer">source {index + 1}</a>)}</span>;
}
