import { addDays } from '../dates';
import { certDedupeKey, jobDedupeKey } from '../dedupe';
import type { JobDocument } from '../models/jobs';
import type { CertificationDocument } from '../models/certifications';
import type { TodoDocument } from '../models/todos';

function seedJobs(today: string) {
  return ([
    { company: 'Northwind Tech', role: 'Software Intern', status: 'saved', deadline: addDays(today, 3), compensationStatus: 'paid', compensationText: 'BDT 15,000/month' },
    { company: 'Contoso Labs', role: 'Junior Software Engineer', status: 'interview', interviewAt: `${addDays(today, 4)}T15:00:00+06:00` },
    { company: 'Fabrikam Systems', role: 'Backend Intern', status: 'saved', deadline: addDays(today, 12) },
    { company: 'Tailspin Software', role: 'Data Analyst Intern', status: 'rejected', deadline: addDays(today, -2) },
    { company: 'Adventure Works', role: 'STEP Intern 2027', status: 'saved', deadline: null, deadlineNote: 'Rolling basis, apply early' },
    { company: 'Litware Inc', role: 'Software Engineer Intern 2027', status: 'saved', deadline: null },
    { company: 'Proseware', role: 'Associate Software Engineer', status: 'applied', appliedAt: addDays(today, -3), deadline: addDays(today, 5) },
    { company: 'Wingtip Software', role: 'Trainee Engineer', status: 'assessment', deadline: addDays(today, 1) },
  ] satisfies Partial<JobDocument>[]).map((job) => ({
    ...job, createdFrom: 'manual' as const, notes: '',
    dedupeKey: jobDedupeKey(job.company, job.role),
    descriptionSummary: `A fictional ${job.role} opportunity at ${job.company}.`,
  }));
}

function seedCertifications(today: string) {
  return ([
    { name: 'Cloud Fundamentals', provider: 'Contoso Learn', status: 'in_progress', progressPercent: 40, costStatus: 'free' },
    { name: 'AI Essentials', provider: 'Northwind Academy', status: 'planned', registrationDeadline: addDays(today, 10), costStatus: 'free' },
    { name: 'Data Analytics Professional', provider: 'Fabrikam Learn', status: 'wishlist', registrationDeadline: null },
    { name: 'Security Basics', provider: 'Litware Academy', status: 'completed', completedAt: addDays(today, -20), progressPercent: 100 },
    { name: 'Web Development Bootcamp', provider: 'Tailspin Training', status: 'wishlist', registrationDeadline: addDays(today, 4), costStatus: 'paid', costText: 'BDT 4,000' },
  ] satisfies Partial<CertificationDocument>[]).map((cert) => ({
    ...cert, createdFrom: 'manual' as const, notes: '',
    dedupeKey: certDedupeKey(cert.provider, cert.name),
    descriptionSummary: `A fictional course from ${cert.provider}.`,
  }));
}

function seedTodos(today: string, now: Date) {
  return ([
    { title: 'Update the internship resume', tag: 'job', dueDate: addDays(today, -2) },
    { title: 'Review cloud networking notes', tag: 'certification', dueDate: addDays(today, -1) },
    { title: 'Practice an interview problem', tag: 'study', dueDate: today },
    { title: 'Plan the study schedule', tag: 'personal', dueDate: today },
    { title: 'Prepare internship application notes', tag: 'job', dueDate: addDays(today, 3) },
    { title: 'Review the next course module', tag: 'certification', dueDate: addDays(today, 6) },
    { title: 'Explore a new study topic', tag: 'study', dueDate: null },
    { title: 'Organize the workspace', tag: 'personal', dueDate: null, status: 'done', completedAt: now },
  ] satisfies Partial<TodoDocument>[]).map((todo) => ({
    status: 'todo' as TodoDocument['status'], completedAt: null as Date | null,
    ...todo, createdFrom: 'manual' as const, details: '', linkedJobId: null, linkedCertId: null,
  }));
}

export function buildSeed(today: string, now = new Date(`${today}T00:00:00+06:00`)) {
  return { jobs: seedJobs(today), certifications: seedCertifications(today), todos: seedTodos(today, now) };
}
