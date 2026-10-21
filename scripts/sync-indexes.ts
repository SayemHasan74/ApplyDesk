import mongoose from 'mongoose';
import { connectDb } from '../src/lib/db';
import { envSchema } from '../src/lib/env';
import { User } from '../src/lib/models/users';
import { Job } from '../src/lib/models/jobs';
import { Certification } from '../src/lib/models/certifications';
import { Todo } from '../src/lib/models/todos';
import { Suggestion } from '../src/lib/models/suggestions';
import { ProcessedEmail } from '../src/lib/models/processed-emails';
import { ActionLog } from '../src/lib/models/action-logs';
import { ChatMessage } from '../src/lib/models/chat-messages';
import { Counter } from '../src/lib/models/counters';

async function syncIndexes() {
  try {
    await connectDb(envSchema.shape.MONGODB_URI.parse(process.env.MONGODB_URI));
    await Promise.all([User.syncIndexes(), Job.syncIndexes(), Certification.syncIndexes(), Todo.syncIndexes(), Suggestion.syncIndexes(), ProcessedEmail.syncIndexes(), ActionLog.syncIndexes(), ChatMessage.syncIndexes(), Counter.syncIndexes()]);
  } catch {
    console.error('[INDEX_SYNC]', crypto.randomUUID());
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

void syncIndexes();
