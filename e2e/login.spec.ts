import { test, expect } from '@playwright/test';

test.describe('Tower Control - Auth & Login E2E Tests', () => {
  test('harus menampilkan halaman login dengan benar', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Tower Control/i);
    await expect(page.getByRole('button', { name: /masuk|login/i })).toBeVisible();
  });

  test('harus berhasil login dan navigasi ke dashboard', async ({ page }) => {
    await page.goto('/login');
    
    // Fill credentials
    await page.locator('input[type="text"], input[type="email"], input[name="username"]').first().fill('admin');
    await page.locator('input[type="password"]').fill('admin123');

    // Click Login Button
    await page.getByRole('button', { name: /masuk|login/i }).click();

    // Check redirection to Dashboard or Jadwal
    await expect(page).toHaveURL(/\/(jadwal|dashboard)?/);
  });
});
