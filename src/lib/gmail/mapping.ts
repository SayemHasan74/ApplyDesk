import { createHash } from 'node:crypto';
import { normalizeKey } from '../dedupe';
import { jobCreateSchema, jobPatchSchema } from '../validators/job';
import type { EmailClassification } from './schema';
import type { GmailMessage } from './extract';

export function eventStatus(event: EmailClassification['event']) {
  switch (event) { case 'application_confirmation': return 'applied'; case 'assessment_invite': return 'assessment'; case 'interview_invite': return 'interview'; case 'rejection': return 'rejected'; case 'offer': return 'offer'; default: return null; }
}
export function matchCompany(company: string, jobs: { id: string; company: string }[]) {
  const key = normalizeKey(company);
  return jobs.filter((job) => { const candidate = normalizeKey(job.company); return key === candidate || (key.length >= 4 && candidate.length >= 4 && (key.includes(candidate) || candidate.includes(key))); });
}
function explicitInterviewAt(email: GmailMessage, value: string | null) {
  const text = `${email.subject}\n${email.body}`;
  const date = /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[\s/-]+(?:\d{1,2}|[a-z]{3,9})(?:[\s,/-]+\d{4})?\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}\b/i.test(text);
  const time = /\b\d{1,2}:\d{2}\b|\b\d{1,2}\s*(?:am|pm)\b/i.test(text);
  return date && time && value ? value : undefined;
}
export function emailSuggestions(email: GmailMessage, classified: EmailClassification, jobs: { id: string; company: string }[]) {
  if (!classified.is_job_related || classified.event === 'other') return [];
  const status = eventStatus(classified.event);
  const roles = classified.event === 'job_alert' ? classified.new_jobs : classified.company && classified.role ? [{ company: classified.company, role: classified.role, apply_url: null, location: null, deadline: null }] : [];
  const matches = classified.company ? matchCompany(classified.company, jobs) : [];
  const base = { gmailMessageId: email.id, gmailThreadId: email.threadId, emailSubject: email.subject || '(No subject)', emailFrom: email.from || '(Unknown sender)', emailDate: email.date, confidence: matches.length > 1 ? 'low' as const : classified.confidence, state: 'pending' as const };
  if (classified.event !== 'job_alert' && matches.length > 1) return [];
  if (status && matches.length === 1) {
    const interviewAt = classified.event === 'interview_invite' ? explicitInterviewAt(email, classified.interview_at) : undefined;
    return [{ ...base, type: 'status_update' as const, jobId: matches[0].id, suggestionKey: matches[0].id, payload: jobPatchSchema.parse({ status, ...(interviewAt ? { interviewAt } : {}) }) }];
  }
  const interviewAt = classified.event === 'interview_invite' ? explicitInterviewAt(email, classified.interview_at) : undefined;
  return roles.slice(0, 5).filter((role, index, list) => list.findIndex((candidate) => normalizeKey(candidate.company) === normalizeKey(role.company) && normalizeKey(candidate.role) === normalizeKey(role.role)) === index).map((role) => ({ ...base, type: 'new_job' as const, jobId: null, suggestionKey: createHash('sha256').update(`${normalizeKey(role.company)}|${normalizeKey(role.role)}`).digest('hex'), payload: jobCreateSchema.parse({ company: role.company, role: role.role, applyUrl: role.apply_url, location: role.location, deadline: role.deadline, ...(status ? { status } : {}), ...(interviewAt ? { interviewAt } : {}), createdFrom: 'email' }) }));
}
