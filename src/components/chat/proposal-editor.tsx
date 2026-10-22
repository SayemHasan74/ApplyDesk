'use client';
import { useId, useState } from 'react';
import type { Entity } from '@/lib/constants';
import { draftFields, draftForm, parseDraftForm } from '@/lib/client/proposal-form';

export function ProposalEditor({ entity, draft, pending, onChange }: {
  entity: Entity; draft: Record<string, unknown>; pending: boolean;
  onChange: (draft: Record<string, unknown> | null) => void;
}) {
  const id = useId(), [values, setValues] = useState(() => draftForm(draft));
  const result = parseDraftForm(entity, values);
  const errors = result.success ? {} : Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
  function change(name: string, value: string) {
    const next = { ...values, [name]: value }; setValues(next);
    const parsed = parseDraftForm(entity, next); onChange(parsed.success ? parsed.data : null);
  }
  return <fieldset disabled={pending} className="mt-3 space-y-3"><legend className="text-sm font-semibold">Edit proposed fields</legend>
    {draftFields(entity).map((field) => {
      const attrs = { id: `${id}-${field.name}`, value: values[field.name] ?? '', className: 'form-control', 'aria-invalid': Boolean(errors[field.name]), 'aria-describedby': errors[field.name] ? `${id}-${field.name}-error` : undefined };
      return <div key={field.name}><label htmlFor={attrs.id} className="field-label">{field.label}{field.array ? ' (one per line)' : ''}</label>
        {field.options ? <select {...attrs} onChange={(event) => change(field.name, event.target.value)}>{field.options.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}</select>
          : field.multiline ? <textarea {...attrs} rows={3} maxLength={field.maxLength} onChange={(event) => change(field.name, event.target.value)} />
            : <input {...attrs} type={field.type} step={field.type === 'datetime-local' ? 1 : undefined} maxLength={field.maxLength} onChange={(event) => change(field.name, event.target.value)} />}
        {errors[field.name] && <p id={`${attrs.id}-error`} className="text-xs text-destructive">{errors[field.name]}</p>}
      </div>;
    })}
  </fieldset>;
}
