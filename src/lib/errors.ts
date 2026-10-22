import { ERROR_STATUSES } from './constants';

export class AppError extends Error {
  constructor(public readonly code: keyof typeof ERROR_STATUSES, message: string, public readonly status: number = ERROR_STATUSES[code]) {
    super(message);
    this.name = 'AppError';
  }
}

export class AiServiceError extends AppError {
  constructor() { super('INTERNAL', 'The AI could not answer. Please try again or add it manually.'); }
}
