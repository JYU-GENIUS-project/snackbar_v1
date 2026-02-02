export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export type ApiRequestOptions<TBody = unknown> = {
  path: string;
  method?: string;
  token?: string | null | undefined;
  body?: TBody | null | undefined;
  signal?: AbortSignal | undefined;
  searchParams?: Record<string, unknown> | null | undefined;
  headers?: HeadersInit | undefined;
};

export type ApiError = Error & {
  status?: number;
  offline?: boolean;
  details?: unknown;
  cause?: unknown;
};

const buildHeaders = (
  token?: string | null,
  customHeaders?: HeadersInit,
  { skipContentType }: { skipContentType?: boolean } = {}
): Headers => {
  const headers = new Headers(customHeaders || {});
  if (!skipContentType) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
};

export const apiRequest = async <TResponse = unknown, TBody = unknown>({
  path,
  method = 'GET',
  token,
  body,
  signal,
  searchParams,
  headers
}: ApiRequestOptions<TBody>): Promise<TResponse> => {
  const url = new URL(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, window.location.origin);

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        return;
      }
      url.searchParams.set(key, String(value));
    });
  }

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers: buildHeaders(token, headers, { skipContentType: isFormData }),
      body: isFormData ? body : body ? JSON.stringify(body) : null,
      credentials: 'include',
      signal: signal ?? null
    });
  } catch (networkError) {
    const error = new Error('Network request failed') as ApiError;
    error.status = 0;
    error.offline = true;
    error.cause = networkError;
    throw error;
  }

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(payload?.error?.message || payload?.message || response.statusText) as ApiError;
    error.status = response.status;
    error.details = payload?.error?.details || payload?.error || payload;
    throw error;
  }

  return payload as TResponse;
};
