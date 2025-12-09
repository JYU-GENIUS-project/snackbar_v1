const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

const buildHeaders = (token, customHeaders, { skipContentType } = {}) => {
  const headers = new Headers(customHeaders || {});
  if (!skipContentType) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
};

export const apiRequest = async ({ path, method = 'GET', token, body, signal, searchParams, headers }) => {
  const url = new URL(`${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, window.location.origin);

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        return;
      }
      url.searchParams.set(key, String(value));
    });
  }

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const response = await fetch(url.toString(), {
    method,
    headers: buildHeaders(token, headers, { skipContentType: isFormData }),
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    credentials: 'include',
    signal
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(payload?.error?.message || payload?.message || response.statusText);
    error.status = response.status;
    error.details = payload?.error?.details || payload?.error || payload;
    throw error;
  }

  return payload;
};
