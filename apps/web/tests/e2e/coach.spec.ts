import { test, expect } from '@playwright/test';

test.describe('Coach Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/coach');
  });

  test('should display the coach page with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/AP Calculus Tutor/);
    await expect(page.locator('h1')).toContainText('AP Calculus Coach');
  });

  test('should show welcome message when no messages', async ({ page }) => {
    await expect(page.locator('text=Welcome to AP Calculus Coach')).toBeVisible();
    await expect(page.locator('text=Ask me any AP Calculus')).toBeVisible();
  });

  test('should allow typing in the input field', async ({ page }) => {
    const input = page.locator('textarea[placeholder*="Ask a"]');
    await input.fill('What is the derivative of x^2?');
    await expect(input).toHaveValue('What is the derivative of x^2?');
  });

  test('should show character count', async ({ page }) => {
    const input = page.locator('textarea[placeholder*="Ask a"]');
    await input.fill('Test question');
    await expect(page.locator('text=13/2000')).toBeVisible();
  });

  test('should have exam variant selector', async ({ page }) => {
    const selector = page.locator('button[aria-label="Select exam variant"]');
    await expect(selector).toBeVisible();
    await expect(selector).toContainText('AB');
  });

  test('should change exam variant when selected', async ({ page }) => {
    const selector = page.locator('button[aria-label="Select exam variant"]');
    await selector.click();
    
    const bcOption = page.locator('text=BC').first();
    await bcOption.click();
    
    await expect(selector).toContainText('BC');
  });

  test('should show clear chat button when there are messages', async ({ page }) => {
    // First send a message
    const input = page.locator('textarea[placeholder*="Ask a"]');
    await input.fill('Test question');
    await page.locator('button[type="submit"]').click();
    
    // Wait for the message to appear
    await expect(page.locator('text=Test question')).toBeVisible();
    
    // Clear chat button should be enabled
    const clearButton = page.locator('button:has-text("Clear Chat")');
    await expect(clearButton).toBeEnabled();
  });

  test('should disable clear chat button when no messages', async ({ page }) => {
    const clearButton = page.locator('button:has-text("Clear Chat")');
    await expect(clearButton).toBeDisabled();
  });

  test('should show citations button when sources are available', async ({ page }) => {
    // This test would need to mock the API response to include sources
    // For now, we'll just check that the button exists
    const citationsButton = page.locator('button:has-text("Citations")');
    await expect(citationsButton).toBeVisible();
  });

  test('should handle keyboard shortcuts', async ({ page }) => {
    const input = page.locator('textarea[placeholder*="Ask a"]');
    await input.fill('Test question');
    
    // Press Enter to submit
    await input.press('Enter');
    
    // The message should be sent (this would need API mocking in a real test)
    await expect(page.locator('text=Test question')).toBeVisible();
  });

  test('should show loading state when processing', async ({ page }) => {
    // This test would need to mock a slow API response
    const input = page.locator('textarea[placeholder*="Ask a"]');
    await input.fill('Test question');
    await page.locator('button[type="submit"]').click();
    
    // Should show loading indicator
    await expect(page.locator('text=Thinking...')).toBeVisible();
  });

  test('should be accessible with keyboard navigation', async ({ page }) => {
    // Tab through the page elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // The input should be focused
    const input = page.locator('textarea[placeholder*="Ask a"]');
    await expect(input).toBeFocused();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    const input = page.locator('textarea[placeholder*="Ask a"]');
    await expect(input).toHaveAttribute('placeholder');
    
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    
    const examVariantSelector = page.locator('button[aria-label="Select exam variant"]');
    await expect(examVariantSelector).toBeVisible();
  });
});

test.describe('Coach Page - Verified Answer Flow', () => {
  test('should display verified badge for verified answers', async ({ page }) => {
    // This test would need to mock the API to return a verified answer
    await page.goto('/coach');
    
    const input = page.locator('textarea[placeholder*="Ask a"]');
    await input.fill('What is the derivative of x^2?');
    await page.locator('button[type="submit"]').click();
    
    // Wait for response and check for verified badge
    // This would need API mocking in a real implementation
    await expect(page.locator('text=Verified')).toBeVisible();
  });

  test('should display trust score for answers', async ({ page }) => {
    // This test would need to mock the API to return a trust score
    await page.goto('/coach');
    
    const input = page.locator('textarea[placeholder*="Ask a"]');
    await input.fill('What is the derivative of x^2?');
    await page.locator('button[type="submit"]').click();
    
    // Wait for response and check for trust score
    // This would need API mocking in a real implementation
    await expect(page.locator('text=Confidence:')).toBeVisible();
  });
});
