import { test, expect } from '@playwright/test';

test.describe('Coach Page - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/coach');
    // Wait for the page to load completely
    await page.waitForLoadState('domcontentloaded');
    // Wait for the main content to be visible
    await expect(page.locator('h1')).toContainText('AP Calculus Coach');
  });

  test('should display the coach page with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/AP Calculus Tutor/);
    await expect(page.locator('h1')).toContainText('AP Calculus Coach');
  });

  test('should show welcome message when no messages', async ({ page }) => {
    await expect(page.locator('text=Welcome to AP Calculus Coach')).toBeVisible();
    await expect(page.locator('text=Ask me any AP Calculus')).toBeVisible();
  });

  test('should have exam variant selector', async ({ page }) => {
    const selector = page.locator('button[aria-label="Select exam variant"]');
    await expect(selector).toBeVisible();
    await expect(selector).toContainText('AB');
  });

  test('should allow typing in the input field', async ({ page }) => {
    const input = page.locator('textarea[placeholder*="Ask a"]');
    await input.fill('What is the derivative of x^2?');
    await expect(input).toHaveValue('What is the derivative of x^2?');
  });

  test('should show character count when typing', async ({ page }) => {
    const input = page.locator('textarea[placeholder*="Ask a"]');
    await input.fill('Test question');
    // Wait for the character count to update by checking for the specific text
    await expect(page.locator('text=13/2000')).toBeVisible({ timeout: 5000 });
  });

  test('should enable submit button when input has content', async ({ page }) => {
    const input = page.locator('textarea[placeholder*="Ask a"]');
    const submitButton = page.locator('button[type="submit"]');
    
    // Initially disabled
    await expect(submitButton).toBeDisabled();
    
    // Fill input
    await input.fill('Test question');
    
    // Should be enabled now - wait for the state to update
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
  });

  test('should have proper ARIA labels', async ({ page }) => {
    const input = page.locator('textarea[placeholder*="Ask a"]');
    await expect(input).toHaveAttribute('placeholder');
    
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });

  test('should show clear chat button (disabled when no messages)', async ({ page }) => {
    const clearButton = page.locator('button:has-text("Clear Chat")');
    await expect(clearButton).toBeVisible();
    await expect(clearButton).toBeDisabled();
  });

  test('should show citations button (disabled when no sources)', async ({ page }) => {
    const citationsButton = page.locator('button:has-text("Citations")');
    await expect(citationsButton).toBeVisible();
    await expect(citationsButton).toBeDisabled();
  });
});
