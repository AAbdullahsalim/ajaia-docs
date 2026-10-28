// Tiny fetch wrapper. Reads the bearer token from localStorage and throws a
// useful Error on non-2xx responses so callers can surface messages.
const TOKEN_KEY = 'ajaia.token';

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

async function request(method, path, body) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const opts = { method, headers };
  if (body instanceof FormData) {
    opts.body = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(`/api${path}`, opts);

  // A stale/invalid token (e.g. after the demo server restarted and reseeded)
  // should drop the user back to the login screen rather than wedging the UI.
  if (res.status === 401) {
    setToken(null);
    try {
      localStorage.removeItem('ajaia.user');
    } catch {
      /* ignore */
    }
    window.location.reload();
    return null;
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b),
  put: (p, b) => request('PUT', p, b),
  del: (p) => request('DELETE', p),
  upload: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('POST', '/uploads', fd);
  },
};
