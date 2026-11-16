import crypto from 'node:crypto';

export type LogLevel = 'info' | 'warn' | 'error';

const SENSITIVE_KEY_PATTERN =
  /^(pin|pinhash|password|passwordhash|token|tokenhash|csrftoken|secret|exactinstallationlocation|authorization|cookie)$/i;

export function redactPii<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((item) => redactPii(item)) as unknown as T;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redactPii(v);
      }
    }
    return out as T;
  }
  return value;
}

export function logStructured(params: {
  level: LogLevel;
  component: string;
  event: string;
  requestId?: string;
  detail?: Record<string, unknown>;
}): void {
  if (process.env.VITEST && params.level === 'info') {
    return;
  }
  const entry = {
    timestamp: new Date().toISOString(),
    level: params.level,
    component: params.component,
    event: params.event,
    requestId: params.requestId || `req_${crypto.randomBytes(4).toString('hex')}`,
    detail: params.detail ? redactPii(params.detail) : {},
  };
  const serialized = JSON.stringify(entry);
  if (params.level === 'error') {
    console.error(serialized);
  } else if (params.level === 'warn') {
    console.warn(serialized);
  } else {
    console.log(serialized);
  }
}
