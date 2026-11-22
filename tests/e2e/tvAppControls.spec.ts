import { expect, test } from '@playwright/test';

test('keeps EDISON TV-app Ad/Back separate from the phone remote Back command', async ({
  page,
}) => {
  await page.goto('/');
  const navigation = page.locator('nav[aria-label="EDISON navigation"]');

  await navigation.getByRole('button', { name: 'Auth & RBAC Console' }).click();
  await page.getByRole('button', { name: 'Admin Seed' }).click();
  await page
    .locator('form')
    .getByRole('button', { name: 'Sign In', exact: true })
    .click();
  await expect(page.getByText(/admin@edison\.demo/i).first()).toBeVisible({
    timeout: 10_000,
  });

  await navigation.getByRole('button', { name: 'TV Preview & Break Sim' }).click();
  await page.getByRole('button', { name: '3. Break Simulator' }).click();
  const edisonAdButton = page.getByRole('button', { name: 'EDISON Ad', exact: true });
  await expect(edisonAdButton).toBeEnabled();

  const remoteBackRequest = page.waitForRequest(
    (request) =>
      request.method() === 'POST' &&
      request.url().endsWith('/api/tv-adapters/remote-simulate')
  );
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  expect((await remoteBackRequest).postDataJSON()).toMatchObject({
    command: 'back',
    intentSource: 'AURA',
  });

  await edisonAdButton.click();
  const tvAppBackButton = page.getByRole('button', {
    name: 'EDISON TV App · Back',
    exact: true,
  });
  await expect(tvAppBackButton).toBeVisible({ timeout: 10_000 });
  await tvAppBackButton.click();
  await expect(edisonAdButton).toBeEnabled();

  await edisonAdButton.click();
  await expect(tvAppBackButton).toBeVisible({ timeout: 10_000 });
  await expect(edisonAdButton).toBeEnabled({ timeout: 40_000 });
});
