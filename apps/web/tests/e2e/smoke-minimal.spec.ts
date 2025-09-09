import { test, expect } from '@playwright/test';

test.describe('Minimal Smoke Tests', () => {
  test('should load coach page @smoke', async ({ page }) => {
    await page.goto('/coach');
    await page.waitForLoadState('networkidle');
    
    // Just check that the page title is correct
    await expect(page).toHaveTitle(/AP Calculus Tutor/);
  });

  test('should load lessons page @smoke', async ({ page }) => {
    await page.goto('/lessons');
    await page.waitForLoadState('networkidle');
    
    // Just check that the page title is correct
    await expect(page).toHaveTitle(/AP Calculus Tutor/);
  });

  test('should load pricing page @smoke', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');
    
    // Just check that the page title is correct
    await expect(page).toHaveTitle(/AP Calculus Tutor/);
  });
});
