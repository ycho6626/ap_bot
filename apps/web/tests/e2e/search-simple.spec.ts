import { test, expect } from '@playwright/test';

test.describe('Lessons Page - Simple Smoke Tests', () => {
  test('should visit /lessons and display basic elements @smoke', async ({ page }) => {
    await page.goto('/lessons');
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for the page to load
    await expect(page.locator('h1')).toContainText('AP Calculus Lessons');
    
    // Check for search input
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
    
    // Check for exam variant selector
    const variantSelector = page.locator('button[aria-label="Select exam variant"]');
    await expect(variantSelector).toBeVisible();
    await expect(variantSelector).toContainText('AB');
    
    // Check for welcome message
    await expect(page.locator('text=Welcome to AP Calculus Lessons')).toBeVisible();
  });

  test('should allow typing in search input @smoke', async ({ page }) => {
    await page.goto('/lessons');
    await page.waitForLoadState('domcontentloaded');
    
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('derivative');
    
    // Should have the value
    await expect(searchInput).toHaveValue('derivative');
  });

  test('should show search suggestions @smoke', async ({ page }) => {
    await page.goto('/lessons');
    await page.waitForLoadState('domcontentloaded');
    
    // Check for search suggestions
    await expect(page.locator('text=Try searching for:')).toBeVisible();
    await expect(page.locator('li:has-text("derivatives")').first()).toBeVisible();
    await expect(page.locator('li:has-text("integration techniques")').first()).toBeVisible();
  });
});
