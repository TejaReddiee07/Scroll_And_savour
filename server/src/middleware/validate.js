import mongoose from 'mongoose';
import { HttpError } from '../utils/httpError.js';

export function validationError(zodError) {
  const details = zodError.flatten();
  const first = details.formErrors[0] ?? Object.values(details.fieldErrors).flat()[0];
  const message = first ? `Validation failed: ${first}` : 'Validation failed';
  return new HttpError(400, 'VALIDATION_ERROR', message, details);
}

/**
 * Validates `req.body` (replaced with the parsed value) or `req.query` (parsed value stored on
 * `req.validQuery`, because req.query is a read-only getter in Express 5).
 */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const input = source === 'query' ? { ...req.query } : (req.body ?? {});
    const result = schema.safeParse(input);
    if (!result.success) throw validationError(result.error);
    if (source === 'query') req.validQuery = result.data;
    else req.body = result.data;
    next();
  };
}

/** router.param() handler rejecting malformed Mongo ObjectIds with 400 INVALID_ID. */
export function objectIdParam(req, _res, next, value) {
  if (!mongoose.isValidObjectId(value) || !/^[a-f\d]{24}$/i.test(value)) {
    throw new HttpError(400, 'INVALID_ID', 'Invalid id');
  }
  next();
}
