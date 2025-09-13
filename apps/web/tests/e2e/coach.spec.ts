import { test, expect } from '@playwright/test';

test.describe('Coach Page - Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the API responses for consistent testing
    await page.route('**/coach', async route => {
      const request = route.request();
      const postData = JSON.parse(request.postData() || '{}');

      // Mock response based on the question
      if (postData.question?.includes('derivative of x^2')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            answer:
              'The derivative of x² is 2x. This follows from the power rule: d/dx[x^n] = nx^(n-1). For x², we have n=2, so d/dx[x²] = 2x^(2-1) = 2x.',
            verified: true,
            trustScore: 0.95,
            sources: [
              {
                type: 'canonical',
                id: 'derivative_power_rule',
                title: 'Power Rule for Derivatives',
                snippet: 'The power rule states that d/dx[x^n] = nx^(n-1)',
                score: 0.98,
              },
            ],
            suggestions: [
              'Try asking about the derivative of more complex functions',
              'Learn about the chain rule for composite functions',
              'Explore applications of derivatives',
            ],
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            answer: 'This is a mock response for testing purposes.',
            verified: false,
            trustScore: 0.75,
            sources: [],
            suggestions: [],
          }),
        });
      }
    });

    await page.goto('/coach');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should visit /coach and submit derivative question with verified response @smoke', async ({
    page,
  }) => {
    // Wait for the page to load completely
    await expect(page.locator('h1')).toContainText('AP Calculus Coach');

    // Type the question
    const input = page.locator('textarea[placeholder*="Ask a"]');
    await input.fill('Find derivative of x^2');
    await expect(input).toHaveValue('Find derivative of x^2');

    // Submit the question
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Wait for the user message to appear
    await expect(page.locator('text=Find derivative of x^2')).toBeVisible();

    // Wait for the assistant response
    await expect(page.locator('text=The derivative of x² is 2x')).toBeVisible();

    // Verify the Verified badge appears
    await expect(page.locator('text=Verified')).toBeVisible();

    // Verify trust score is displayed
    await expect(page.locator('text=Confidence:')).toBeVisible();
    await expect(page.locator('text=95%')).toBeVisible();

    // Verify sources are available (citations button should be enabled)
    const citationsButton = page.locator('button:has-text("Citations")');
    await expect(citationsButton).toBeEnabled();

    // Verify suggestions are shown
    await expect(page.locator('text=Suggestions:')).toBeVisible();
    await expect(
      page.locator('text=Try asking about the derivative of more complex functions')
    ).toBeVisible();
  });

  test('should show loading state during processing', async ({ page }) => {
    // Add a delay to the API response to test loading state
    await page.route('**/api/coach', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          answer: 'Test response',
          verified: true,
          trustScore: 0.9,
          sources: [],
          suggestions: [],
        }),
      });
    });

    const input = page.locator('textarea[placeholder*="Ask a"]');
    await input.fill('Test question');
    await page.locator('button[type="submit"]').click();

    // Should show loading state
    await expect(page.locator('text=Thinking...')).toBeVisible();

    // Wait for response
    await expect(page.locator('text=Test response')).toBeVisible();
  });

  test('should handle exam variant selection', async ({ page }) => {
    // Check initial state (should be AB by default)
    const variantSelector = page.locator('button[aria-label="Select exam variant"]');
    await expect(variantSelector).toContainText('AB');

    // Change to BC
    await variantSelector.click();
    const bcOption = page.locator('text=BC').first();
    await bcOption.click();

    // Verify change
    await expect(variantSelector).toContainText('BC');

    // Verify placeholder text updates
    const input = page.locator('textarea[placeholder*="Ask a"]');
    await expect(input).toHaveAttribute('placeholder', /BC/);
  });

  test('should clear chat when clear button is clicked', async ({ page }) => {
    // First send a message
    const input = page.locator('textarea[placeholder*="Ask a"]');
    await input.fill('Test question');
    await page.locator('button[type="submit"]').click();

    // Wait for message to appear
    await expect(page.locator('text=Test question')).toBeVisible();

    // Clear chat button should be enabled
    const clearButton = page.locator('button:has-text("Clear Chat")');
    await expect(clearButton).toBeEnabled();

    // Click clear
    await clearButton.click();

    // Messages should be cleared
    await expect(page.locator('text=Test question')).not.toBeVisible();
    await expect(page.locator('text=Welcome to AP Calculus Coach')).toBeVisible();

    // Clear button should be disabled again
    await expect(clearButton).toBeDisabled();
  });

  test('should show citations sidebar when citations button is clicked', async ({ page }) => {
    // Send a question that returns sources
    const input = page.locator('textarea[placeholder*="Ask a"]');
    await input.fill('Find derivative of x^2');
    await page.locator('button[type="submit"]').click();

    // Wait for response
    await expect(page.locator('text=The derivative of x² is 2x')).toBeVisible();

    // Click citations button
    const citationsButton = page.locator('button:has-text("Citations")');
    await expect(citationsButton).toBeEnabled();
    await citationsButton.click();

    // Citations sidebar should appear
    await expect(page.locator('text=Sources')).toBeVisible();
    await expect(page.locator('text=Power Rule for Derivatives')).toBeVisible();

    // Close sidebar
    const closeButton = page.locator('button:has-text("Close")');
    await closeButton.click();

    // Sidebar should be hidden
    await expect(page.locator('text=Sources')).not.toBeVisible();
  });

  test('should handle keyboard shortcuts', async ({ page }) => {
    const input = page.locator('textarea[placeholder*="Ask a"]');
    await input.fill('Test keyboard shortcut');

    // Press Enter to submit
    await input.press('Enter');

    // Message should be sent
    await expect(page.locator('text=Test keyboard shortcut')).toBeVisible();
  });

  test('should show character count', async ({ page }) => {
    const input = page.locator('textarea[placeholder*="Ask a"]');
    await input.fill('Test question');

    // Character count should be visible
    await expect(page.locator('text=13/2000')).toBeVisible();
  });

  test('should disable submit button when input is empty', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]');

    // Should be disabled initially
    await expect(submitButton).toBeDisabled();

    // Fill input
    const input = page.locator('textarea[placeholder*="Ask a"]');
    await input.fill('Test');

    // Should be enabled
    await expect(submitButton).toBeEnabled();

    // Clear input
    await input.fill('');

    // Should be disabled again
    await expect(submitButton).toBeDisabled();
  });
});
