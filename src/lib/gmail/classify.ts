import 'server-only';
import type { CurrentUser } from '../auth/policy';
import { callGemini } from '../ai/gemini';
import { extractJsonObject } from '../ai/json';
import { AppError } from '../errors';
import { classifierSchema } from './schema';
import { GMAIL_PROMPT } from './prompt';
import { reserveGmailRequest } from './budget';
import type { GmailMessage } from './extract';

export async function classifyEmails(user: CurrentUser, messages: GmailMessage[]) {
  const text = JSON.stringify({ timezone: 'Asia/Dhaka', instruction: 'If an interview explicitly states a date and time without an offset, use +06:00. Return exactly one result for each message_id.', emails: messages.map((email) => ({ message_id: email.id, subject: email.subject, from: email.from, date: email.date.toISOString(), body: email.body })) });
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await callGemini({ user, systemInstruction: GMAIL_PROMPT, grounded: false, singleAttempt: true, reserve: () => reserveGmailRequest(user), parts: [{ text: `${text}${attempt ? '\nRepair the JSON: follow the schema exactly and include every supplied message ID once.' : ''}` }] });
    try {
      const result = classifierSchema.parse(extractJsonObject(response.text));
      if (result.emails.length !== messages.length || new Set(result.emails.map((email) => email.message_id)).size !== messages.length || result.emails.some((email) => !messages.some((message) => message.id === email.message_id))) throw new Error('Mismatched IDs');
      return result.emails;
    } catch { if (attempt) throw new AppError('INTERNAL', 'Gmail classification could not be read. Try syncing again.'); }
  }
  throw new AppError('INTERNAL', 'Gmail classification failed');
}
