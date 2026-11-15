const CSRF_COOKIE_NAME = 'edison_csrf';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const nativeFetch: FetchFn | null =
  typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function'
    ? globalThis.fetch.bind(globalThis)
    : typeof window !== 'undefined' && typeof window.fetch === 'function'
    ? window.fetch.bind(window)
    : null;

function readCookie(name: string): string | null {
  if (typeof document === 'undefined' || !document.cookie) return null;
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) {
      const raw = part.slice(idx + 1).trim();
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }
  return null;
}

function isSameOriginApiUrl(input: RequestInfo | URL): boolean {
  const rawUrl =
    typeof input === 'string'
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;

  if (rawUrl.startsWith('/api/')) return true;
  if (typeof window !== 'undefined') {
    try {
      const resolved = new URL(rawUrl, window.location.origin);
      return resolved.origin === window.location.origin && resolved.pathname.startsWith('/api/');
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Same-origin fetch helper that attaches the double-submit `X-CSRF-Token` header
 * and same-origin cookie credentials to mutating `/api/*` requests without relying
 * on `window.fetch` being writable in sandboxed preview environments.
 */
export async function edisonFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const baseFetch: FetchFn | null =
    nativeFetch ||
    (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function'
      ? globalThis.fetch.bind(globalThis)
      : null);

  if (!baseFetch) {
    throw new Error('Fetch API is not available in this runtime.');
  }

  if (!isSameOriginApiUrl(input)) {
    return baseFetch(input, init);
  }

  const method = (
    init?.method ||
    (input instanceof Request ? input.method : 'GET')
  ).toUpperCase();

  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return baseFetch(input, {
      ...init,
      credentials: init?.credentials ?? 'same-origin',
    });
  }

  let csrfToken = readCookie(CSRF_COOKIE_NAME);
  if (!csrfToken) {
    try {
      const csrfRes = await baseFetch('/api/auth/csrf', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (csrfRes.ok) {
        const data = (await csrfRes.json()) as { csrfToken?: string };
        csrfToken = data.csrfToken || readCookie(CSRF_COOKIE_NAME);
      }
    } catch {
      // Proceed cleanly; server rejects missing CSRF with HTTP 403 if cookie-authenticated
    }
  }

  const headers = new Headers(
    init?.headers ?? (input instanceof Request ? input.headers : undefined)
  );
  if (csrfToken && !headers.has(CSRF_HEADER_NAME)) {
    headers.set(CSRF_HEADER_NAME, csrfToken);
  }

  return baseFetch(input, {
    ...init,
    headers,
    credentials: init?.credentials ?? 'same-origin',
  });
}

let installed = false;
let windowFetchPatched = false;

/**
 * Best-effort installation of `edisonFetch` onto `window.fetch` using
 * `Object.defineProperty` so getter-only Window descriptors (such as sandboxed
 * preview iframes) never throw a `TypeError` at module startup.
 */
export function installEdisonCsrfFetch(): boolean {
  if (installed || typeof window === 'undefined' || !nativeFetch) {
    return windowFetchPatched;
  }
  installed = true;

  try {
    const ownDescriptor = Object.getOwnPropertyDescriptor(window, 'fetch');
    if (!ownDescriptor || ownDescriptor.configurable) {
      Object.defineProperty(window, 'fetch', {
        value: edisonFetch,
        writable: true,
        configurable: true,
        enumerable: true,
      });
      windowFetchPatched = true;
      return true;
    }
  } catch {
    // Window.fetch is non-configurable in this runtime; callers using edisonFetch still carry CSRF headers.
  }

  return false;
}
