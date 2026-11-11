/**
 * Tiny fetch wrapper for the Fuji admin API.
 *  - cookie auth (`credentials: 'include'`)
 *  - CSRF guard header on every mutating request
 *  - errors normalised to ApiError ({ message, status, code, details })
 */

export const API_BASE = `${import.meta.env.VITE_API_URL || ''}/api`;

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Paths whose 401 means "wrong credentials", not "session expired". */
const AUTH_FORM_PATHS = ['/admin/auth/login', '/admin/auth/password'];

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'UNKNOWN', details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** zod flatten() field errors, e.g. { price: ['Expected number'] } */
  get fieldErrors() {
    return this.details?.fieldErrors ?? {};
  }

  get formErrors() {
    return Array.isArray(this.details?.formErrors) ? this.details.formErrors : [];
  }
}

function defaultMessage(status) {
  if (status === 400) return 'Please check the highlighted fields and try again.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'That action was blocked by the server.';
  if (status === 404) return 'That record could not be found — it may have been deleted.';
  if (status === 409) return 'That change conflicts with existing data.';
  if (status === 413) return 'That file is too large.';
  if (status === 429) return 'Too many requests — please wait a moment and try again.';
  if (status === 503) return 'This feature is not configured on the server.';
  if (status >= 500) return 'The server ran into a problem. Please try again.';
  return 'Something went wrong. Please try again.';
}

let unauthorizedHandler = null;

/** Register a callback for "session expired" 401s. Returns an unsubscribe fn. */
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null;
  };
}

export function toQueryString(query) {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function request(path, { method = 'GET', body, signal, headers } = {}) {
  const verb = method.toUpperCase();
  const finalHeaders = { Accept: 'application/json', ...headers };
  if (MUTATING.has(verb)) finalHeaders['X-Requested-With'] = 'XMLHttpRequest';

  let payload;
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    payload = body; // browser sets the multipart boundary
  } else if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: verb,
      headers: finalHeaders,
      body: payload,
      credentials: 'include',
      signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError('Could not reach the server. Check your connection and that the backend is running.', {
      status: 0,
      code: 'NETWORK_ERROR',
    });
  }

  if (res.status === 204) return null;

  const text = await res.text();
  let data = null;
  let parsed = true;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      parsed = false;
    }
  }

  if (!res.ok) {
    const info = data?.error ?? {};
    const error = new ApiError(info.message || defaultMessage(res.status), {
      status: res.status,
      code: info.code || `HTTP_${res.status}`,
      details: info.details ?? null,
    });
    if (
      res.status === 401 &&
      unauthorizedHandler &&
      !AUTH_FORM_PATHS.some((p) => path.startsWith(p)) &&
      error.code !== 'INVALID_CREDENTIALS'
    ) {
      unauthorizedHandler(error);
    }
    throw error;
  }

  if (!parsed) {
    throw new ApiError('The server sent an unexpected response. Is the API URL configured correctly?', {
      status: res.status,
      code: 'BAD_RESPONSE',
    });
  }

  return data;
}

function filenameFromDisposition(header) {
  if (!header) return null;
  const star = header.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ''));
    } catch {
      /* fall through */
    }
  }
  const plain = header.match(/filename\s*=\s*"?([^";]+)"?/i);
  return plain ? plain[1].trim() : null;
}

/**
 * GET a file (e.g. CSV export) with the admin cookie and save it via a Blob link.
 * Errors are normalised to ApiError exactly like `request()`.
 * Resolves to the filename that was used.
 */
export async function downloadFile(path, { query, filename: fallbackName = 'download', accept = '*/*', signal } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}${toQueryString(query)}`, {
      method: 'GET',
      headers: { Accept: accept },
      credentials: 'include',
      signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError('Could not reach the server. Check your connection and that the backend is running.', {
      status: 0,
      code: 'NETWORK_ERROR',
    });
  }

  if (!res.ok) {
    let info = {};
    try {
      info = JSON.parse(await res.text())?.error ?? {};
    } catch {
      /* non-JSON error body */
    }
    const error = new ApiError(info.message || defaultMessage(res.status), {
      status: res.status,
      code: info.code || `HTTP_${res.status}`,
      details: info.details ?? null,
    });
    if (res.status === 401 && unauthorizedHandler) unauthorizedHandler(error);
    throw error;
  }

  const blob = await res.blob();
  const filename = filenameFromDisposition(res.headers.get('Content-Disposition')) || fallbackName;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return filename;
}

export const api = {
  get: (path, query, options) => request(`${path}${toQueryString(query)}`, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  del: (path, options) => request(path, { ...options, method: 'DELETE' }),
  /** POST /api/admin/uploads (multipart field `image`) → { url, publicId } */
  upload: (file, options) => {
    const form = new FormData();
    form.append('image', file);
    return request('/admin/uploads', { ...options, method: 'POST', body: form });
  },
};

export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (err instanceof ApiError) return err.message;
  return fallback;
}
