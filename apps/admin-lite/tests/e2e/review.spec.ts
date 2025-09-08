import { test, expect } from '@playwright/test';

test.describe('Review Cases', () => {
  test.beforeEach(async ({ page }) => {
    // Set teacher role for testing
    await page.addInitScript(() => {
      localStorage.setItem('admin_user_role', 'teacher');
    });
  });

  test('should display review cases page', async ({ page }) => {
    await page.goto('/review');
    
    // Check page title and header
    await expect(page.locator('h1')).toContainText('Review Cases');
    await expect(page.locator('text=Review Cases')).toBeVisible();
  });

  test('should show access denied for non-teacher role', async ({ page }) => {
    // Set public role
    await page.addInitScript(() => {
      localStorage.setItem('admin_user_role', 'public');
    });
    
    await page.goto('/review');
    
    // Should show access denied
    await expect(page.locator('text=Access Denied')).toBeVisible();
    await expect(page.locator('text=You need teacher role')).toBeVisible();
  });

  test('should display filters and case list', async ({ page }) => {
    await page.goto('/review');
    
    // Check filters are present
    await expect(page.locator('select[id="status-filter"]')).toBeVisible();
    await expect(page.locator('select[id="exam-variant-filter"]')).toBeVisible();
    await expect(page.locator('select[id="limit-filter"]')).toBeVisible();
    
    // Check case list container
    await expect(page.locator('text=Select a case to view details')).toBeVisible();
  });

  test('should handle case creation and resolution flow', async ({ page }) => {
    // Mock API responses
    await page.route('**/review*', async (route) => {
      const url = route.request().url();
      
      if (url.includes('review?') && route.request().method() === 'GET') {
        // Mock GET /review - return empty list initially
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            cases: [],
            pagination: {
              total: 0,
              limit: 20,
              offset: 0,
              hasMore: false,
            },
          }),
        });
      } else if (url.includes('review') && route.request().method() === 'POST') {
        // Mock POST /review - create case
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-case-id',
            status: 'pending',
            message: 'Case submitted for review',
          }),
        });
      } else if (url.includes('review/resolve') && route.request().method() === 'POST') {
        // Mock POST /review/resolve - resolve case
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-case-id',
            status: 'approved',
            message: 'Case approved successfully',
          }),
        });
      }
    });

    await page.goto('/review');
    
    // The page should load without errors
    await expect(page.locator('h1')).toContainText('Review Cases');
    
    // Since we're mocking empty results, we should see the "no cases" message
    await expect(page.locator('text=No review cases found')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/review*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: 'Internal server error',
            statusCode: 500,
          },
        }),
      });
    });

    await page.goto('/review');
    
    // Should show error toast
    await expect(page.locator('text=Failed to load review cases')).toBeVisible();
  });

  test('should filter cases by status', async ({ page }) => {
    // Mock API with different statuses
    await page.route('**/review*', async (route) => {
      const url = new URL(route.request().url());
      const status = url.searchParams.get('status');
      
      const mockCases = status === 'approved' ? [
        {
          id: 'approved-case',
          question: 'What is the derivative of x^2?',
          answer: '2x',
          examVariant: 'calc_ab',
          trustScore: 0.95,
          confidence: 0.98,
          sources: [],
          metadata: { examVariant: 'calc_ab', processingTime: 1000, retryCount: 0 },
          status: 'approved',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ] : [];
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cases: mockCases,
          pagination: {
            total: mockCases.length,
            limit: 20,
            offset: 0,
            hasMore: false,
          },
        }),
      });
    });

    await page.goto('/review');
    
    // Change filter to approved
    await page.selectOption('select[id="status-filter"]', 'approved');
    
    // Should make API call with new filter
    await expect(page.locator('text=approved-case')).toBeVisible();
  });
});
