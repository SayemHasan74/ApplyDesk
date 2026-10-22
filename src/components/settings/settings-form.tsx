'use client';

import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/api/client';
import type { Settings, SettingsPatch } from '@/lib/validators/settings';

export function SettingsForm({ initialData }: { initialData: Settings }) {
  const [settings, setSettings] = useState(initialData);
  const [limit, setLimit] = useState(String(initialData.aiDailyLimit));
  const [error, setError] = useState('');
  const locked = useRef(false);
  const mutation = useMutation({ retry: false,
    mutationFn: async (patch: SettingsPatch) => {
      const { settingsSchema } = await import('@/lib/validators/settings');
      return settingsSchema.parse(await apiRequest('/api/settings', 'PATCH', patch));
    },
    onMutate: (patch) => { const previous = settings; setSettings({ ...settings, ...patch }); return previous; },
    onSuccess: (result) => { setSettings(result); setLimit(String(result.aiDailyLimit)); },
    onError: (failure, _patch, previous) => {
      if (previous) { setSettings(previous); setLimit(String(previous.aiDailyLimit)); }
      toast.error(failure.message || 'Could not save settings. Please try again.');
    },
  });
  async function save(patch: SettingsPatch) {
    if (locked.current) return;
    locked.current = true;
    try { await mutation.mutateAsync(patch); }
    catch { return; }
    finally { locked.current = false; }
  }
  function saveLimit() {
    const value = Number(limit);
    if (!limit.trim() || !Number.isInteger(value) || value < 1 || value > 100) { setError('Enter a whole number from 1 to 100.'); return; }
    setError('');
    if (value !== settings.aiDailyLimit) void save({ aiDailyLimit: value });
  }
  return <div className="max-w-2xl divide-y border-y">
    <label className="flex min-h-28 items-center justify-between gap-6 py-5"><span><span className="block font-semibold">AI web search</span><span className="mt-1 block text-sm text-muted-foreground">Allow the AI assistant to use web search.</span></span><input type="checkbox" role="switch" className="size-5 shrink-0 accent-foreground" checked={settings.groundingEnabled} disabled={mutation.isPending} onChange={(event) => { void save({ groundingEnabled: event.target.checked }); }} /></label>
    <div className="py-5"><label className="field-label" htmlFor="ai-daily-limit">AI daily limit</label><input id="ai-daily-limit" type="number" min={1} max={100} step={1} className="form-control max-w-36" value={limit} disabled={mutation.isPending} onChange={(event) => { setLimit(event.target.value); setError(''); }} onBlur={saveLimit} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} aria-invalid={!!error} aria-describedby={error ? 'limit-error' : 'limit-help'} /><p id="limit-help" className="mt-2 text-sm text-muted-foreground">1–100 requests per day. Changes save when you finish editing.</p>{error && <p id="limit-error" role="alert" className="mt-2 text-sm text-destructive">{error}</p>}</div>
    <p role="status" className="py-3 text-sm text-muted-foreground">{mutation.isPending ? 'Saving…' : mutation.isError ? 'Not saved. Please try again.' : mutation.isSuccess ? 'Saved' : 'Changes save automatically.'}</p>
  </div>;
}
