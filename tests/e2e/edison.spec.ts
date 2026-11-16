import { expect, test } from '@playwright/test';

test.describe('EDISON Full Browser End-to-End Verification (TASK-P3-003)', () => {
  test('renders navigation shell, signs in via UI, verifies Runtime Infra (PG16/FFmpeg/AURA), Country/Intl gates, Households, Campaigns, Ad Studio, TV Preview, QR Redirect, and mobile responsiveness', async ({
    page,
    request,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const sidebarNav = page.locator('nav[aria-label="EDISON navigation"]');
    await expect(sidebarNav).toBeVisible();

    // 1. Navigate to Auth & RBAC Console and sign in with Admin seed account
    await sidebarNav.getByRole('button', { name: 'Auth & RBAC Console' }).click();
    await page.locator('input[type="email"]').fill('admin@edison.demo');
    await page.locator('input[type="password"]').fill('EdisonAdmin!2026');
    await page.locator('form').getByRole('button', { name: 'Sign In', exact: true }).click();

    await expect(page.getByText(/admin@edison\.demo/i).first()).toBeVisible({ timeout: 10_000 });

    // 2. Navigate to QR QA & VS Code Handover -> Runtime Infra sub-tab and trigger live PGlite PG16 check & AURA pairing
    await sidebarNav.getByRole('button', { name: 'QR QA & VS Code Handover' }).click();
    await page.getByRole('button', { name: /Runtime Infra/i }).click();
    await expect(page.getByText(/FFmpeg & FFprobe Broadcast Worker/i)).toBeVisible();
    await expect(page.getByText('/usr/bin/ffmpeg')).toBeVisible();

    await page.getByRole('button', { name: /Run Live PGlite PG16 Check/i }).click();
    await expect(
      page.getByText(/Verified real PostgreSQL 16\+ schema migrations/i)
    ).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: /Pair Test TV/i }).click();
    await expect(page.getByText(/AURA paired cleanly:/i)).toBeVisible({ timeout: 10_000 });

    // 3. Check Phase 14 Country Launch & Phase 15 Intl Expansion Panels
    await page.getByRole('button', { name: /Phase 14 Country Launch/i }).click();
    await expect(page.getByText(/Initial Market: ZW/i).first()).toBeVisible();
    await page.getByRole('button', { name: /Phase 15 Intl Expansion/i }).click();
    await expect(page.getByText(/International Multi-Region Expansion/i).first()).toBeVisible();

    // 4. Navigate across key operator & household flows
    await sidebarNav.getByRole('button', { name: 'Campaigns (10-State)' }).click();
    await expect(page.getByText(/Northstar/i).first()).toBeVisible();

    await sidebarNav.getByRole('button', { name: 'Ad Creation Studio' }).click();
    await expect(page.getByText(/Option A/i).first()).toBeVisible();

    await sidebarNav.getByRole('button', { name: 'Households, Profiles & Consent' }).click();
    await expect(page.getByText(/Bundled Withdrawal/i).first()).toBeVisible();
    await page.getByRole('button', { name: 'Matches & QR 403' }).click();
    await expect(page.getByText(/Verified Opportunity Matching/i)).toBeVisible();
    await page.getByRole('button', { name: 'Consent & Epochs' }).click();
    await expect(page.getByText(/Immutable Consent & Epoch Audit Trail/i)).toBeVisible();

    await sidebarNav.getByRole('button', { name: 'TV Preview & Break Sim' }).click();
    await expect(page.getByText(/16:9 Television Preview/i).first()).toBeVisible();

    await sidebarNav.getByRole('button', { name: 'Opportunities & 3-Tier QA' }).click();
    await expect(page.getByText(/3-Tier/i).first()).toBeVisible();

    await sidebarNav.getByRole('button', { name: 'Moderation & Analytics' }).click();
    await expect(page.getByText(/Funnel/i).first()).toBeVisible();

    // 5. Real /r/:token HTTP 302 redirect verification via Playwright request context
    const redirectRes = await request.get('/r/edison-demo', { maxRedirects: 0 });
    expect(redirectRes.status()).toBe(302);
    expect(redirectRes.headers()['cache-control']).toContain('no-store');

    // 6. Desktop viewport overflow check
    const desktopOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 2
    );
    expect(desktopOverflow).toBe(true);

    // 7. Mobile responsiveness check (390x844 viewport without horizontal page overflow)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await page.getByRole('button', { name: 'QR Redirect Engine' }).last().click();
    await expect(page.getByRole('heading', { name: /QR Destination Validator/i })).toBeVisible();

    const mobileOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 2
    );
    expect(mobileOverflow).toBe(true);

    const fatalConsoleErrors = consoleErrors.filter(
      (e) => !e.includes('WebSocket') && !e.includes('favicon')
    );
    expect(fatalConsoleErrors).toEqual([]);
  });
});
