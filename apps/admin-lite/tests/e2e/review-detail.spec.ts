import { test, expect } from '@playwright/test';

test.describe('Review Case Detail', () => {
  test.beforeEach(async ({ page }) => {
    // Set teacher role for testing
    await page.addInitScript(() => {
      localStorage.setItem('admin_user_role', 'teacher');
    });
  });

  test('should display case details when case is selected', async ({ page }) => {
    const mockCase = {
      id: 'test-case-id',
      question: 'What is the derivative of $x^2$?',
      answer: 'The derivative of $x^2$ is $2x$.',
      examVariant: 'calc_ab',
      trustScore: 0.85,
      confidence: 0.92,
      sources: [
        {
          type: 'canonical',
          id: 'source-1',
          title: 'Power Rule',
          snippet: 'The power rule states that...',
          score: 0.95,
        },
      ],
      metadata: {
        examVariant: 'calc_ab',
        topic: 'derivatives',
        subtopic: 'power_rule',
        difficulty: 'easy',
        processingTime: 1200,
        retryCount: 1,
      },
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Mock API responses
    await page.route('**/review*', async (route) => {
      const url = route.request().url();
      
      if (url.includes('review?') && route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            cases: [mockCase],
            pagination: {
              total: 1,
              limit: 20,
              offset: 0,
              hasMore: false,
            },
          }),
        });
      } else if (url.includes('review/resolve') && route.request().method() === 'POST') {
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
    
    // Click on the case to select it
    await page.click('text=What is the derivative of');
    
    // Check that detail panel shows
    await expect(page.locator('text=Question')).toBeVisible();
    await expect(page.locator('text=Generated Answer')).toBeVisible();
    await expect(page.locator('text=Metadata')).toBeVisible();
    await expect(page.locator('text=Sources')).toBeVisible();
    
    // Check case content
    await expect(page.locator('text=What is the derivative of')).toBeVisible();
    await expect(page.locator('text=The derivative of')).toBeVisible();
    
    // Check metadata
    await expect(page.locator('text=Trust Score:')).toBeVisible();
    await expect(page.locator('text=85.0%')).toBeVisible();
    await expect(page.locator('text=Confidence:')).toBeVisible();
    await expect(page.locator('text=92.0%')).toBeVisible();
    
    // Check sources
    await expect(page.locator('text=CANONICAL')).toBeVisible();
    await expect(page.locator('text=Power Rule')).toBeVisible();
  });

  test('should show resolve form when action button is clicked', async ({ page }) => {
    const mockCase = {
      id: 'test-case-id',
      question: 'What is the derivative of x^2?',
      answer: '2x',
      examVariant: 'calc_ab',
      trustScore: 0.85,
      confidence: 0.92,
      sources: [],
      metadata: { examVariant: 'calc_ab', processingTime: 1000, retryCount: 0 },
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Mock API responses
    await page.route('**/review*', async (route) => {
      const url = route.request().url();
      
      if (url.includes('review?') && route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            cases: [mockCase],
            pagination: {
              total: 1,
              limit: 20,
              offset: 0,
              hasMore: false,
            },
          }),
        });
      } else if (url.includes('review/resolve') && route.request().method() === 'POST') {
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
    
    // Click on the case to select it
    await page.click('text=What is the derivative of');
    
    // Click approve button
    await page.click('button:has-text("Approve")');
    
    // Check that resolve form appears
    await expect(page.locator('text=Approve Case')).toBeVisible();
    await expect(page.locator('text=Mark this case as approved')).toBeVisible();
    await expect(page.locator('textarea[id="feedback"]')).toBeVisible();
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Approve")')).toBeVisible();
  });

  test('should handle case resolution', async ({ page }) => {
    const mockCase = {
      id: 'test-case-id',
      question: 'What is the derivative of x^2?',
      answer: '2x',
      examVariant: 'calc_ab',
      trustScore: 0.85,
      confidence: 0.92,
      sources: [],
      metadata: { examVariant: 'calc_ab', processingTime: 1000, retryCount: 0 },
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let resolveCallCount = 0;

    // Mock API responses
    await page.route('**/review*', async (route) => {
      const url = route.request().url();
      
      if (url.includes('review?') && route.request().method() === 'GET') {
        // After resolution, return empty list
        const cases = resolveCallCount > 0 ? [] : [mockCase];
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            cases,
            pagination: {
              total: cases.length,
              limit: 20,
              offset: 0,
              hasMore: false,
            },
          }),
        });
      } else if (url.includes('review/resolve') && route.request().method() === 'POST') {
        resolveCallCount++;
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
    
    // Click on the case to select it
    await page.click('text=What is the derivative of');
    
    // Click approve button
    await page.click('button:has-text("Approve")');
    
    // Fill in feedback
    await page.fill('textarea[id="feedback"]', 'This is a good answer.');
    
    // Submit the form
    await page.click('button:has-text("Approve")');
    
    // Should show success message
    await expect(page.locator('text=Case approved successfully')).toBeVisible();
    
    // Detail panel should close
    await expect(page.locator('text=Select a case to view details')).toBeVisible();
  });

  test('should show different forms for different actions', async ({ page }) => {
    const mockCase = {
      id: 'test-case-id',
      question: 'What is the derivative of x^2?',
      answer: '2x',
      examVariant: 'calc_ab',
      trustScore: 0.85,
      confidence: 0.92,
      sources: [],
      metadata: { examVariant: 'calc_ab', processingTime: 1000, retryCount: 0 },
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Mock API responses
    await page.route('**/review*', async (route) => {
      const url = route.request().url();
      
      if (url.includes('review?') && route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            cases: [mockCase],
            pagination: {
              total: 1,
              limit: 20,
              offset: 0,
              hasMore: false,
            },
          }),
        });
      }
    });

    await page.goto('/review');
    
    // Click on the case to select it
    await page.click('text=What is the derivative of');
    
    // Test reject form
    await page.click('button:has-text("Reject")');
    await expect(page.locator('text=Reject Case')).toBeVisible();
    await expect(page.locator('text=Mark this case as rejected')).toBeVisible();
    await page.click('button:has-text("Cancel")');
    
    // Test revision form
    await page.click('button:has-text("Revise")');
    await expect(page.locator('text=Request Revision')).toBeVisible();
    await expect(page.locator('text=Request changes to improve')).toBeVisible();
    await expect(page.locator('textarea[id="correctedAnswer"]')).toBeVisible();
    await page.click('button:has-text("Cancel")');
  });
});
