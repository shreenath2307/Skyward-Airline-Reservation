/* Thin fetch wrapper + shared metadata (columns, enums, pricing) loaded once from /api/meta */

export class ApiError extends Error {
  constructor(status, message, fields) { super(message); this.status = status; this.fields = fields || null; }
}

/* HCI-R3: in-flight request counter feeds the top progress bar */
let inflight = 0;
const netFns = new Set();
export const onNet = (fn) => { netFns.add(fn); return () => netFns.delete(fn); };
const netTick = (d) => { inflight = Math.max(0, inflight + d); netFns.forEach((fn) => fn(inflight)); };

async function request(method, url, body, opts = {}) {
  let res;
  const silent = !!opts.silent;      // background polls don't flash the progress bar
  if (!silent) netTick(1);
  try {
    try {
      res = await fetch(`/api${url}`, {
        method,
        keepalive: !!opts.keepalive,
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new ApiError(0, 'Cannot reach the Skyward server. Is it running?');
    }
    let data = null;
    try { data = await res.json(); } catch (_) { /* empty body */ }
    if (!res.ok) throw new ApiError(res.status, (data && data.error) || `Request failed (${res.status})`, data && data.fields);
    return data;
  } finally { if (!silent) netTick(-1); }
}

export const api = {
  get: (u, opts) => request('GET', u, undefined, opts),
  post: (u, b) => request('POST', u, b ?? {}),
  put: (u, b) => request('PUT', u, b ?? {}),
  del: (u, opts) => request('DELETE', u, undefined, opts),
};

export const qs = (o) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const store = { meta: null };
export async function loadMeta() {
  store.meta = await api.get('/meta');
  return store.meta;
}
export const ent = (key) => store.meta.entities[key];
export const field = (entKey, name) => ent(entKey).fields.find((f) => f.name === name);
export const city = (code) => (store.meta && store.meta.airports[code]) || '';
