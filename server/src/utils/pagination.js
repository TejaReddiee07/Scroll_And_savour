import { z } from 'zod';

export const MAX_LIMIT = 100;

/** zod fields for `page` / `limit` query params (default 1 / 20, limit capped at 100). */
export const paginationQuery = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(20).transform((n) => Math.min(n, MAX_LIMIT)),
};

/** Runs a paginated find and returns the admin list envelope `{ data, total, page, pages }`. */
export async function paginate(Model, filter, { page, limit, sort, populate, lean = true }) {
  let query = Model.find(filter)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);
  if (populate) query = query.populate(populate);
  if (lean) query = query.lean();
  const [data, total] = await Promise.all([query, Model.countDocuments(filter)]);
  return envelope(data, total, page, limit);
}

export function envelope(data, total, page, limit) {
  return { data, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}
