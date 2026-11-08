import { expect, test } from '@playwright/test';

test('navigates core sections and runs Projectile Motion without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /THE UNIVERSE, EXPLORED\./i })).toBeVisible();

  await page.getByRole('link', { name: /Launch Projectile Motion Lab/i }).click();
  await expect(page.getByRole('heading', { name: 'Projectile Motion' })).toBeVisible();
  await expect(page.getByLabel('Projectile trajectory canvas')).toBeVisible();

  await page.getByRole('button', { name: /Record run in My Notebook/i }).click();
  await page.goto('/notebook');
  await expect(page.getByText(/Projectile Motion —/i).first()).toBeVisible();

  await page.goto('/challenges');
  await expect(page.getByRole('heading', { name: /Quantitative Physics Drills/i })).toBeVisible();

  await page.goto('/learn');
  await expect(page.getByRole('heading', { name: /Principles, Laws & Physical Constants/i })).toBeVisible();

  expect(errors).toEqual([]);
});
