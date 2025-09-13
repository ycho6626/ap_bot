import { test, expect } from '@playwright/test';

test.describe('Coach Page - Simple Smoke Tests', () => {
  test('should visit /coach and display basic elements @smoke', async ({ page }) => {
    await page.goto('/coach');
    await page.waitForLoadState('domcontentloaded');

    // Wait for the page to load completely
    await expect(page.locator('h1')).toContainText('AP Calculus Coach');

    // Check for welcome message
    await expect(page.locator('h3:has-text("Welcome to AP Calculus Coach")')).toBeVisible();

    // Check for input field
    const input = page.locator('textarea[placeholder*="Ask a"]');
    await expect(input).toBeVisible();

    // Check for submit button (should be disabled initially)
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeDisabled();

    // Check for exam variant selector
    const variantSelector = page.locator('button[aria-label="Select exam variant"]');
    await expect(variantSelector).toBeVisible();
    await expect(variantSelector).toContainText('AB');
  });

  test('should enable submit button when typing @smoke', async ({ page }) => {
    await page.goto('/coach');
    await page.waitForLoadState('domcontentloaded');

    const input = page.locator('textarea[placeholder*="Ask a"]');
    const submitButton = page.locator('button[type="submit"]');

    // Initially disabled
    await expect(submitButton).toBeDisabled();

    // Type something
    await input.fill('Find derivative of x^2');

    // Should be enabled now
    await expect(submitButton).toBeEnabled();
  });

  test('should show character count @smoke', async ({ page }) => {
    await page.goto('/coach');
    await page.waitForLoadState('domcontentloaded');

    const input = page.locator('textarea[placeholder*="Ask a"]');
    await input.fill('Test question');

    // Character count should be visible
    await expect(page.locator('text=13/2000')).toBeVisible();
  });
});
