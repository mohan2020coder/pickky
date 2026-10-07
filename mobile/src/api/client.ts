import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_PREFIX, config } from '../config';
import { getAccessToken, getRefreshToken, saveTokens } from '../auth/tokenStorage';
import { TokenPair } from '../types';

export class ApiError extends Error {
  status?: number;
  requestId?: string;

  constructor(message: string, status?: number, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.requestId = requestId;
  }
}

export type MockRouteContext = {
  method: string;
  path: string;
  params: Record<string, string | number | boolean | undefined>;
  body: unknown;
  query: URLSearchParams;
  headers: Record<string, string>;
};

export type MockHandler = (ctx: MockRouteContext) => unknown;

const instance = axios.create({
  baseURL: `${config.apiBaseUrl}${API_PREFIX}`,
  timeout: config.requestTimeoutMs,
  headers: { 'Content-Type': 'application/json' },
});

const newRequestId = (): string => `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

instance.interceptors.request.use(async (req: InternalAxiosRequestConfig) => {
  req.headers.set('X-Request-ID', newRequestId());
  const token = await getAccessToken();
  if (token) req.headers.set('Authorization', `Bearer ${token}`);
  return req;
});

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return null;
      const res = await axios.post<TokenPair>(
        `${config.apiBaseUrl}${API_PREFIX}/auth/refresh`,
        { refresh_token: refreshToken },
        { timeout: config.requestTimeoutMs },
      );
      await saveTokens(res.data);
      return res.data.access_token;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
};

instance.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<{ error?: string; message?: string }>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = error.response?.status;
    if (status === 401 && original && !original._retried) {
      original._retried = true;
      const fresh = await refreshAccessToken();
      if (fresh) {
        original.headers.set('Authorization', `Bearer ${fresh}`);
        return instance.request(original);
      }
    }
    return Promise.reject(error);
  },
);

export const normalizeError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const payload = error.response?.data as { error?: string; message?: string } | undefined;
    const requestId = error.response?.headers?.['x-request-id'] as string | undefined;
    const message =
      payload?.error ||
      payload?.message ||
      (status === 0 || error.message === 'Network Error'
        ? "We couldn't reach Pickky. Check your connection and try again."
        : 'Something went wrong. Please try again.');
    return new ApiError(message, status, requestId);
  }
  return new ApiError('Something went wrong. Please try again.');
};

type RequestConfig = {
  params?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
};

type MockAwareRequestConfig = RequestConfig & {
  mockHandler?: MockHandler;
  auth?: boolean;
};

let mockHandler: MockHandler | null = null;

export const registerMockHandler = (handler: MockHandler | null): void => {
  mockHandler = handler;
};

export const request = async <T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  data?: unknown,
  cfg?: MockAwareRequestConfig,
): Promise<T> => {
  if (config.isMock && mockHandler) {
    const [rawPath, rawQuery = ''] = url.split('?');
    const query = new URLSearchParams(rawQuery);
    const headers: Record<string, string> = {};
    if (cfg?.auth !== false) {
      const token = await getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    try {
      const result = mockHandler({
        method,
        path: rawPath,
        params: cfg?.params ?? {},
        body: data,
        query,
        headers,
      });
      return (await Promise.resolve(result)) as T;
    } catch (e) {
      throw e instanceof ApiError ? e : normalizeError(e);
    }
  }

  try {
    const res = await instance.request<T>({
      method,
      url,
      data,
      params: cfg?.params as Record<string, string | number | boolean | undefined> | undefined,
      signal: cfg?.signal,
    });
    return res.data;
  } catch (e) {
    throw normalizeError(e);
  }
};

export const apiGet = <T>(url: string, cfg?: MockAwareRequestConfig) => request<T>('GET', url, undefined, cfg);
export const apiPost = <T>(url: string, body?: unknown, cfg?: MockAwareRequestConfig) => request<T>('POST', url, body, cfg);
export const apiPut = <T>(url: string, body?: unknown, cfg?: MockAwareRequestConfig) => request<T>('PUT', url, body, cfg);
export const apiPatch = <T>(url: string, body?: unknown, cfg?: MockAwareRequestConfig) => request<T>('PATCH', url, body, cfg);
export const apiDelete = <T>(url: string, cfg?: MockAwareRequestConfig) => request<T>('DELETE', url, undefined, cfg);
