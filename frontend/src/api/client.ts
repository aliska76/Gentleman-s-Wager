/**
 * The one place that knows how to talk HTTP to backend-api: base URL,
 * JWT header, JSON body encoding, and turning a non-2xx response into a
 * typed error. Every resource-specific file in this folder (auth.ts,
 * games.ts, users.ts) calls apiRequest() rather than fetch() directly, so
 * this behaviour is never duplicated or subtly re-implemented per-entry-point.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  /** Omit for the one endpoint that doesn't need auth: POST /auth/login. */
  jwt?: string;
  body?: unknown;
}

function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const { message } = body as { message: unknown };
    if (typeof message === 'string') return message;
    if (Array.isArray(message) && message.every((m) => typeof m === 'string')) return message.join(', ');
  }
  return fallback;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', jwt, body } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (jwt) headers.Authorization = `Bearer ${jwt}`;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Could not reach the server. Is backend-api running?', 0, null);
  }

  const raw = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(extractMessage(raw, `Request failed with status ${response.status}`), response.status, raw);
  }

  return raw as T;
}
