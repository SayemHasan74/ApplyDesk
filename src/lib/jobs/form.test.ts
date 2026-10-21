import { expect, it } from 'vitest';
import { jobItemSchema } from './items';
import { changedJobFields, formInput, toJobForm } from './form';
import { jobCreateSchema } from '../validators/job';

const job = jobItemSchema.parse({ company: 'C', role: 'R', id: '0123456789abcdef01234567', createdAt: '2026-10-21T00:00:00Z', updatedAt: '2026-10-21T00:00:00Z', interviewAt: '2026-10-21T09:30:00Z', requirements: ['One', 'Two'] });
it('builds controlled empty forms from the shared create defaults', () => {
  const form = toJobForm();
  expect(form).toMatchObject({ company: '', role: '', status: 'saved', jobType: 'other', deadline: '', notes: '', requirements: '' });
  expect(jobCreateSchema.safeParse(formInput(form)).success).toBe(false);
});
it('round trips Dhaka interview time, nullable dates and newline fields', () => {
  const form = toJobForm(job);
  expect(form.interviewAt).toBe('2026-10-21T15:30:00');
  expect(form.requirements).toBe('One\nTwo');
  const input = jobCreateSchema.parse(formInput({ ...form, interviewAt: '2026-10-21T16:45', sourceUrls: ' https://a.example \n\nhttp://b.example' }));
  expect(input.interviewAt).toBe('2026-10-21T16:45:00+06:00');
  expect(input.sourceUrls).toEqual(['https://a.example', 'http://b.example']);
  expect(input.deadline).toBeNull();
});
it('submits only changed editable fields, including explicit clearing', () => {
  expect(changedJobFields(job, toJobForm(job))).toEqual({});
  expect(changedJobFields(job, { ...toJobForm(job), notes: 'Only notes' })).toEqual({ notes: 'Only notes' });
  expect(changedJobFields(job, { ...toJobForm(job), notes: 'Updated', interviewAt: '' })).toEqual({ interviewAt: null, notes: 'Updated' });
  expect(changedJobFields(job, { ...toJobForm(job), interviewAt: '' })).not.toHaveProperty('createdFrom');
});
