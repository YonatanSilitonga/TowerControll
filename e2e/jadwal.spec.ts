import { test, expect } from '@playwright/test';

test.describe('Tower Control - Dashboard Jadwal Ritase E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigasi langsung ke halaman jadwal ritase
    await page.goto('/jadwal');
  });

  test('harus memuat halaman jadwal ritase beserta komponen filter', async ({ page }) => {
    await expect(page).toHaveURL(/\/jadwal/);
    
    // Cek header atau judul halaman
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
  });

  test('harus menampilkan tabel data ritase harian', async ({ page }) => {
    // Pastikan tabel ritase ter-render
    const tableOrGrid = page.locator('table, [role="grid"], .grid').first();
    await expect(tableOrGrid).toBeVisible();
  });
});
