const CSRF_COOKIE_NAME = 'edison_csrf';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

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

let installed = false;

/**
 * Installs a lightweight same-origin fetch interceptor for the React SPA so every
 * mutating `/api/*` request automatically attaches the double-submit `X-CSRF-Token`
 * header and same-origin cookie credentials without rewriting component fetch sites.
 */
export function installEdisonCsrfFetch(): void {
  if (installed || typeof window === 'undefined' || typeof window.fetch !== 'function') {
    return;
  }
  installed = true;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (!isSameOriginApiUrl(input)) {
      return nativeFetch(input, init);
    }

    const method = (
      init?.method ||
      (input instanceof Request ? input.method : 'GET')
    ).toUpperCase();

    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return nativeFetch(input, {
        ...init,
        credentials: init?.credentials ?? 'same-origin',
      });
    }

    let csrfToken = readCookie(CSRF_COOKIE_NAME);
    if (!csrfToken) {
      try {
        const csrfRes = await nativeFetch('/api/auth/csrf', {
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

    return nativeFetch(input, {
      ...init,
      headers,
      credentials: init?.credentials ?? 'same-origin',
    });
  };
}
