import { describe, expect, it } from 'vitest';
import { validateQrDestination } from '../src/server/qrValidator.ts';

describe('qrValidator', () => {
  it('accepts valid HTTPS website destinations and normalises bare domains', () => {
    const direct = validateQrDestination('https://example.org/jobs/apply?ref=tv1', 'job_application');
    expect(direct.valid).toBe(true);
    expect(direct.scheme).toBe('https');
    expect(direct.resolvedHost).toBe('example.org');
    expect(direct.normalisedUrl).toBe('https://example.org/jobs/apply?ref=tv1');

    const bare = validateQrDestination('edison-partner.example.org/offer', 'website');
    expect(bare.valid).toBe(true);
    expect(bare.normalisedUrl).toBe('https://edison-partner.example.org/offer');
    expect(bare.warnings.length).toBeGreaterThan(0);
  });

  it('normalises WhatsApp and E.164 telephone destinations safely', () => {
    const wa = validateQrDestination('+44 7700 900123', 'whatsapp');
    expect(wa.valid).toBe(true);
    expect(wa.normalisedUrl).toBe('https://wa.me/447700900123');
    expect(wa.resolvedHost).toBe('wa.me');

    const tel = validateQrDestination('tel:+442079460000', 'telephone');
    expect(tel.valid).toBe(true);
    expect(tel.scheme).toBe('tel');
    expect(tel.normalisedUrl).toBe('tel:+442079460000');
  });

  it('blocks unsafe schemes, insecure http://, private/literal IPs, credentials, and URL shorteners', () => {
    expect(validateQrDestination('javascript:alert(1)', 'website').valid).toBe(false);
    expect(validateQrDestination('data:text/html,<h1>x</h1>', 'website').valid).toBe(false);
    expect(validateQrDestination('http://example.org/insecure', 'website').valid).toBe(false);
    expect(validateQrDestination('https://127.0.0.1/admin', 'website').valid).toBe(false);
    expect(validateQrDestination('https://localhost:3000/test', 'website').valid).toBe(false);
    expect(validateQrDestination('https://bit.ly/hidden-target', 'website').valid).toBe(false);
    expect(validateQrDestination('https://tinyurl.com/abc', 'website').valid).toBe(false);
    expect(validateQrDestination('https://user:secret@example.org', 'website').valid).toBe(false);
    expect(validateQrDestination('   ', 'website').valid).toBe(false);
  });
});
