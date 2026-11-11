export const API_BASE = `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api`;

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'NETWORK_ERROR', details } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Small fetch wrapper. Returns parsed JSON or throws ApiError.
 * A non-JSON response (e.g. the SPA's index.html when no backend is deployed)
 * is treated as "backend unavailable".
 */
export async function api(path, { method = 'GET', body, signal, timeout = 9000, headers } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'include',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(method !== 'GET' ? { 'X-Requested-With': 'XMLHttpRequest' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    clearTimeout(timer);
    throw new ApiError(err.name === 'AbortError' ? 'The request timed out.' : 'Could not reach the server.');
  }
  clearTimeout(timer);

  if (res.status === 204) return null;
  const type = res.headers.get('content-type') || '';
  if (!type.includes('application/json')) {
    throw new ApiError('Backend not available.', { status: res.status, code: 'NO_BACKEND' });
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const e = data?.error || {};
    throw new ApiError(e.message || `Request failed (${res.status})`, {
      status: res.status,
      code: e.code || 'HTTP_ERROR',
      details: e.details,
    });
  }
  return data;
}
