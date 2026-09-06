import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, ApiError } from './client';

function mockFetchOnce(response: { ok: boolean; status: number; json: () => Promise<unknown> }) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
}

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns parsed JSON on a successful response', async () => {
    mockFetchOnce({ ok: true, status: 200, json: () => Promise.resolve({ hello: 'world' }) });

    const result = await apiRequest<{ hello: string }>('/ping');

    expect(result).toEqual({ hello: 'world' });
  });

  it('throws an ApiError carrying the server message and status on a non-2xx response', async () => {
    mockFetchOnce({ ok: false, status: 403, json: () => Promise.resolve({ message: 'Not your turn' }) });

    await expect(apiRequest('/games/x/roll', { method: 'POST' })).rejects.toMatchObject({
      message: 'Not your turn',
      status: 403,
    });
  });

  it('joins an array of validation messages into one string', async () => {
    mockFetchOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: ['username must be longer than 2 characters', 'username is required'] }),
    });

    await expect(apiRequest('/auth/login', { method: 'POST' })).rejects.toThrow(
      'username must be longer than 2 characters, username is required',
    );
  });

  it('wraps a network failure in an ApiError instead of an unhandled rejection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(apiRequest('/health/live')).rejects.toBeInstanceOf(ApiError);
  });
});
