import mongoose from 'mongoose';
import multer from 'multer';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';
import { validationError } from './validate.js';

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: ['FILE_TOO_LARGE', 'Image must be 5 MB or smaller.'],
  LIMIT_FILE_COUNT: ['TOO_MANY_FILES', 'Upload one image at a time.'],
  LIMIT_UNEXPECTED_FILE: ['UNEXPECTED_FIELD', 'Upload a single image in the "image" form field.'],
  LIMIT_PART_COUNT: ['UPLOAD_ERROR', 'Too many form parts.'],
  LIMIT_FIELD_COUNT: ['UPLOAD_ERROR', 'Too many form fields.'],
  LIMIT_FIELD_KEY: ['UPLOAD_ERROR', 'Form field name too long.'],
  LIMIT_FIELD_VALUE: ['UPLOAD_ERROR', 'Form field value too long.'],
};

export function notFoundHandler(req, _res, next) {
  next(new HttpError(404, 'NOT_FOUND', `Route not found: ${req.method} ${req.path}`));
}

function toHttpError(err) {
  if (err instanceof HttpError) return err;
  if (err instanceof ZodError) return validationError(err);

  if (err instanceof multer.MulterError) {
    const [code, message] = MULTER_MESSAGES[err.code] ?? ['UPLOAD_ERROR', err.message];
    return new HttpError(400, code, message);
  }

  // body-parser errors
  if (err?.type === 'entity.parse.failed') return new HttpError(400, 'INVALID_JSON', 'Request body is not valid JSON');
  if (err?.type === 'entity.too.large') return new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  if (err?.type?.startsWith?.('encoding.') || err?.type === 'charset.unsupported') {
    return new HttpError(415, 'UNSUPPORTED_ENCODING', 'Unsupported request encoding');
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const fieldErrors = {};
    for (const [path, e] of Object.entries(err.errors)) (fieldErrors[path] ??= []).push(e.message);
    return new HttpError(400, 'VALIDATION_ERROR', 'Validation failed', { formErrors: [], fieldErrors });
  }
  if (err instanceof mongoose.Error.CastError) {
    return new HttpError(400, 'INVALID_VALUE', `Invalid value for ${err.path}`);
  }
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern ?? err.keyValue ?? {})[0] ?? 'field';
    return new HttpError(409, 'DUPLICATE', `A record with this ${field} already exists`, { field });
  }
  if (
    err instanceof mongoose.Error.MongooseServerSelectionError ||
    err?.name === 'MongoNotConnectedError' ||
    err?.name === 'MongoNetworkError' ||
    err?.name === 'MongoServerSelectionError'
  ) {
    return new HttpError(503, 'DB_UNAVAILABLE', 'The database is temporarily unavailable. Please try again shortly.');
  }
  return null;
}

export function errorHandler(err, req, res, next) {
  const httpError = toHttpError(err);
  if (!httpError) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  } else if (httpError.status >= 500 && !env.isTest) {
    console.error(`[error] ${req.method} ${req.originalUrl}: ${err?.message}`);
  }

  // Let Express close the connection if a response was already partially sent.
  if (res.headersSent) return next(err);

  const status = httpError?.status ?? 500;
  const body = {
    error: {
      message: httpError?.message ?? 'Something went wrong. Please try again.',
      code: httpError?.code ?? 'INTERNAL_ERROR',
      ...(httpError?.details !== undefined ? { details: httpError.details } : {}),
    },
  };
  res.status(status).json(body);
}
