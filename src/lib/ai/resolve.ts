import 'server-only';
import { randomUUID } from 'node:crypto';
import type { Role } from '../constants';
import { certDedupeKey, jobDedupeKey, normalizeKey } from '../dedupe';
import type { AiContext } from './context';
import { entityRows, matchesFilter, queryDetail, rowLabel, sortedRows } from './filter';
import type { Proposal } from './proposals';
import { resolveAction } from './resolve-actions';
import type { Evidence, ValidatedOutput } from './validate';

function createProposal(row: ValidatedOutput['drafts'][number], context: AiContext): Proposal {
  const { entity, draft } = row;
  let duplicateOfId: string | undefined;
  if ('company' in draft) duplicateOfId = context.jobs.find((item) => jobDedupeKey(item.company, item.role) === jobDedupeKey(draft.company, draft.role))?.id;
  else if ('provider' in draft) duplicateOfId = context.certifications.find((item) => certDedupeKey(item.provider, item.name) === certDedupeKey(draft.provider, draft.name))?.id;
  else duplicateOfId = context.todos.find((item) => normalizeKey(item.title) === normalizeKey(draft.title))?.id;
  return { id: randomUUID(), kind: 'create', entity, draft, ...(duplicateOfId ? { duplicateOfId } : {}),
    ...(row.confidence ? { confidence: row.confidence, missingFields: row.missingFields, sources: row.sources } : {}),
  };
}
export function resolveProposals(output: ValidatedOutput, context: AiContext, evidence: Evidence, role: Role) {
  const proposals: Proposal[] = [];
  let assistantMessage = output.assistant_message;
  let queryResult = null;
  if (output.intent === 'query' && output.query) {
    const query = output.query;
    const matches = sortedRows(entityRows(context, query.entity).filter((row) => matchesFilter(row, query, evidence.today)), query.sort);
    const items = matches.map((row) => ({ id: row.id, label: rowLabel(row), detail: queryDetail(row, evidence.today) }));
    const noun = query.entity === 'job' ? 'jobs' : query.entity === 'certification' ? 'certifications' : 'to-dos';
    const text = items.length ? `${items.length} matching ${noun}: ${items.map(({ label }) => label).join('; ')}` : 'Nothing matched.';
    queryResult = { entity: query.entity, items, text };
    assistantMessage = items.length ? `${items.length} matching ${noun}.` : text;
  }
  if (output.intent === 'act') {
    proposals.push(...output.drafts.map((row) => createProposal(row, context)));
    for (const action of output.actions) {
      const result = resolveAction(action, context, evidence, role);
      if (result.proposal) proposals.push(result.proposal);
      if (result.message) assistantMessage = result.message;
    }
  }
  return { intent: output.intent, assistantMessage, transcript: output.transcript,
    proposals: role === 'demo' ? proposals.filter((proposal) => !['setting', 'suggestion', 'run_sync_gmail'].includes(proposal.kind)) : proposals, queryResult,
  };
}
