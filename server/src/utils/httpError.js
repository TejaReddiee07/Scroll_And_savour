export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

/** Builds a 400 VALIDATION_ERROR shaped like zod's flatten() so forms can show it next to a field. */
export function fieldError(field, message, code = 'VALIDATION_ERROR') {
  return new HttpError(400, code, message, { formErrors: [], fieldErrors: { [field]: [message] } });
}

export const notFound = (what = 'Resource', code = 'NOT_FOUND') => new HttpError(404, code, `${what} not found`);
