import type { QrDestinationType } from '../types/edison.ts';

export interface QrValidationResult {
  valid: boolean;
  normalisedUrl: string;
  scheme: 'https' | 'tel' | 'http' | null;
  resolvedHost: string;
  warnings: string[];
  error: string | null;
}

const BLOCKED_SHORTENER_HOSTS = new Set([
  'bit.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'ow.ly',
  'is.gd',
  'buff.ly',
  'cutt.ly',
  'rb.gy',
]);

function isPrivateOrLiteralIp(hostname: string): boolean {
  const clean = hostname.replace(/^\[|\]$/g, '');
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(clean)) {
    return true;
  }
  if (clean.includes(':')) {
    return true;
  }
  const lower = clean.toLowerCase();
  return (
    lower === 'localhost' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal')
  );
}

export function validateQrDestination(
  rawInput: string,
  destinationType: QrDestinationType
): QrValidationResult {
  const trimmed = rawInput.trim();
  const warnings: string[] = [];

  if (!trimmed) {
    return {
      valid: false,
      normalisedUrl: '',
      scheme: null,
      resolvedHost: '',
      warnings,
      error: 'Destination cannot be empty.',
    };
  }

  if (trimmed.length > 1024) {
    return {
      valid: false,
      normalisedUrl: '',
      scheme: null,
      resolvedHost: '',
      warnings,
      error: 'Destination exceeds maximum allowed length (1024 characters).',
    };
  }

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:') ||
    lower.startsWith('ftp:')
  ) {
    return {
      valid: false,
      normalisedUrl: '',
      scheme: null,
      resolvedHost: '',
      warnings,
      error: 'Blocked unsafe URI scheme. Only HTTPS URLs, WhatsApp links, and E.164 telephone numbers are allowed.',
    };
  }

  if (destinationType === 'telephone' || lower.startsWith('tel:')) {
    const digitsOnly = trimmed.replace(/^tel:/i, '').replace(/[\s\-().]/g, '');
    if (!/^\+?[1-9]\d{6,14}$/.test(digitsOnly)) {
      return {
        valid: false,
        normalisedUrl: '',
        scheme: null,
        resolvedHost: '',
        warnings,
        error: 'Telephone numbers must follow international E.164 format (e.g., +442079460000).',
      };
    }
    const normalisedTel = digitsOnly.startsWith('+') ? `tel:${digitsOnly}` : `tel:+${digitsOnly}`;
    if (!digitsOnly.startsWith('+')) {
      warnings.push('Added leading "+" prefix for international E.164 dialing compatibility.');
    }
    return {
      valid: true,
      normalisedUrl: normalisedTel,
      scheme: 'tel',
      resolvedHost: 'telephone-dialer',
      warnings,
      error: null,
    };
  }

  if (destinationType === 'whatsapp') {
    if (/^\+?[1-9]\d{6,14}$/.test(trimmed.replace(/[\s\-().]/g, ''))) {
      const digits = trimmed.replace(/[^\d]/g, '');
      return {
        valid: true,
        normalisedUrl: `https://wa.me/${digits}`,
        scheme: 'https',
        resolvedHost: 'wa.me',
        warnings: ['Converted phone number into official https://wa.me/ chat link.'],
        error: null,
      };
    }
  }

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
    warnings.push('Prepended https:// protocol automatically.');
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return {
      valid: false,
      normalisedUrl: '',
      scheme: null,
      resolvedHost: '',
      warnings,
      error: 'Invalid URL syntax. Provide a valid domain such as https://example.org/apply.',
    };
  }

  if (parsed.protocol === 'http:') {
    return {
      valid: false,
      normalisedUrl: '',
      scheme: null,
      resolvedHost: '',
      warnings,
      error: 'Insecure http:// destinations are blocked. Use https:// for viewer protection.',
    };
  }

  if (parsed.protocol !== 'https:') {
    return {
      valid: false,
      normalisedUrl: '',
      scheme: null,
      resolvedHost: '',
      warnings,
      error: 'Only https://, WhatsApp (wa.me), and tel: destinations are supported.',
    };
  }

  const host = parsed.hostname.toLowerCase();
  if (!host || !host.includes('.')) {
    return {
      valid: false,
      normalisedUrl: '',
      scheme: null,
      resolvedHost: '',
      warnings,
      error: 'Destination must contain a valid fully qualified domain name.',
    };
  }

  if (isPrivateOrLiteralIp(host)) {
    return {
      valid: false,
      normalisedUrl: '',
      scheme: null,
      resolvedHost: '',
      warnings,
      error: 'Direct IP addresses and private/local hostnames are blocked to prevent SSRF and phishing.',
    };
  }

  if (BLOCKED_SHORTENER_HOSTS.has(host)) {
    return {
      valid: false,
      normalisedUrl: '',
      scheme: null,
      resolvedHost: '',
      warnings,
      error: `Third-party URL shortener (${host}) is blocked. Provide the direct final destination URL so moderators and viewers can verify the host.`,
    };
  }

  if (parsed.username || parsed.password) {
    return {
      valid: false,
      normalisedUrl: '',
      scheme: null,
      resolvedHost: '',
      warnings,
      error: 'Embedded URL credentials (user:pass@host) are blocked as misleading.',
    };
  }

  if (host.startsWith('xn--')) {
    warnings.push('Internationalized punycode domain detected; verify domain spelling carefully.');
  }

  if (destinationType === 'whatsapp' && host !== 'wa.me' && host !== 'api.whatsapp.com') {
    warnings.push('WhatsApp destination does not use wa.me or api.whatsapp.com.');
  }

  return {
    valid: true,
    normalisedUrl: parsed.toString(),
    scheme: 'https',
    resolvedHost: host,
    warnings,
    error: null,
  };
}
