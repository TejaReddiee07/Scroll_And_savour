/** Helpers for the list response shapes returned by the admin API. */

export function asArray(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

/** Admin list responses: { data, total, page, pages } (plain arrays tolerated). */
export function normalizeList(res) {
  const data = asArray(res);
  return {
    data,
    total: typeof res?.total === 'number' ? res.total : data.length,
    page: typeof res?.page === 'number' ? res.page : 1,
    pages: typeof res?.pages === 'number' ? res.pages : 1,
  };
}

function mapList(res, fn) {
  if (!res) return res;
  if (Array.isArray(res)) return fn(res);
  if (Array.isArray(res.data)) return { ...res, data: fn(res.data) };
  return res;
}

/** Shallow-merge `patch` into the row with `_id === id`. */
export function patchInList(res, id, patch) {
  return mapList(res, (rows) =>
    rows.map((row) => (row._id === id ? { ...row, ...(typeof patch === 'function' ? patch(row) : patch) } : row)),
  );
}

export function removeFromList(res, id) {
  return mapList(res, (rows) => rows.filter((row) => row._id !== id));
}

/**
 * Merge a server response into an existing row, keeping populated references
 * (e.g. item.category object) when the response only carries the id.
 */
export function mergeRecord(previous, next) {
  if (!next || typeof next !== 'object') return previous;
  const merged = { ...previous, ...next };
  for (const key of Object.keys(previous ?? {})) {
    const prevVal = previous[key];
    const nextVal = next[key];
    if (prevVal && typeof prevVal === 'object' && !Array.isArray(prevVal) && typeof nextVal === 'string') {
      if (prevVal._id === nextVal) merged[key] = prevVal;
    }
  }
  return merged;
}
