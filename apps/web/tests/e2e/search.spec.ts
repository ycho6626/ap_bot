import { test, expect, type Locator } from '@playwright/test';

const setFieldValue = async (field: Locator, value: string) => {
  await field.click();
  await field.fill('');
  if (value.length > 0) {
    await field.type(value);
  }
};

test.describe('Lessons Page - Search Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the search API response
    await page.route('**/kb/search**', async route => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }

      const url = new URL(route.request().url());
      const query = url.searchParams.get('query') || '';

      // Mock response for derivative search
      if (query.toLowerCase().includes('derivative')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            results: [
              {
                document: {
                  id: 'doc_1',
                  content:
                    "The derivative of a function f(x) is defined as the limit of the difference quotient as h approaches 0: f'(x) = lim[h→0] (f(x+h) - f(x))/h. This fundamental concept in calculus allows us to find the instantaneous rate of change of a function at any point.",
                  subject: 'calc',
                  exam_variant: 'calc_ab',
                  partition: 'public_kb',
                  topic: 'Derivatives',
                  subtopic: 'Definition and Basic Rules',
                  created_at: '2024-01-01T00:00:00Z',
                  updated_at: '2024-01-01T00:00:00Z',
                },
                score: 0.95,
                snippet:
                  'The derivative of a function f(x) is defined as the limit of the difference quotient...',
                provenance: {
                  source: 'AP Calculus AB Textbook',
                  partition: 'public_kb',
                  topic: 'Derivatives',
                  subtopic: 'Definition and Basic Rules',
                },
              },
              {
                document: {
                  id: 'doc_2',
                  content:
                    "Power Rule: If f(x) = x^n, then f'(x) = nx^(n-1). This rule applies to all real numbers n. For example, if f(x) = x^3, then f'(x) = 3x^2. The power rule is one of the most commonly used derivative rules.",
                  subject: 'calc',
                  exam_variant: 'calc_ab',
                  partition: 'public_kb',
                  topic: 'Derivatives',
                  subtopic: 'Power Rule',
                  created_at: '2024-01-02T00:00:00Z',
                  updated_at: '2024-01-02T00:00:00Z',
                },
                score: 0.88,
                snippet: "Power Rule: If f(x) = x^n, then f'(x) = nx^(n-1)...",
                provenance: {
                  source: 'AP Calculus Study Guide',
                  partition: 'public_kb',
                  topic: 'Derivatives',
                  subtopic: 'Power Rule',
                },
              },
            ],
            metadata: {
              query: query,
              examVariant: 'calc_ab',
              totalResults: 2,
              maxScore: 0.95,
              searchTime: 150,
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            results: [],
            metadata: {
              query: query,
              examVariant: 'calc_ab',
              totalResults: 0,
              maxScore: 0,
              searchTime: 50,
            },
          }),
        });
      }
    });

    await page.goto('/lessons');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should visit /lessons and search for derivative lessons @smoke', async ({ page }) => {
    // Wait for the page to load
    await expect(page.locator('h1')).toContainText('AP Calculus Lessons');

    // Find the search input
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();

    // Type search query
    await setFieldValue(searchInput, 'derivative');

    // Wait for search results to appear
    await expect(page.locator('text=2 results found')).toBeVisible();

    // Verify we have more than 0 results
    const results = page.getByTestId('search-result');
    await expect(results).toHaveCount(2);

    // Check first result
    const firstResult = results.first();
    await expect(firstResult).toContainText('Derivatives');
    await expect(firstResult).toContainText('Definition and Basic Rules');
    await expect(firstResult).toContainText('95% match');

    // Check second result
    const secondResult = results.nth(1);
    await expect(secondResult).toContainText('Power Rule');
    await expect(secondResult).toContainText('88% match');
  });

  test('should open first lesson and verify math rendering', async ({ page }) => {
    // Search for derivative
    const searchInput = page.locator('input[placeholder*="Search"]');
    await setFieldValue(searchInput, 'derivative');

    // Wait for results
    await expect(page.locator('text=2 results found')).toBeVisible();

    // Click on first result
    const firstResult = page.getByTestId('search-result').first();
    await firstResult.click();

    // Wait for document to open
    const lessonViewer = page.getByTestId('lesson-viewer');
    await expect(lessonViewer).toBeVisible();
    await expect(lessonViewer.getByText('Derivatives')).toBeVisible();
    await expect(lessonViewer.getByText('Definition and Basic Rules')).toBeVisible();

    // Verify math content is rendered (should contain LaTeX)
    await expect(lessonViewer.locator("text=f'(x)")).toBeVisible();
    await expect(lessonViewer.locator('text=lim[h→0]')).toBeVisible();

    // Verify close button works
    const closeButton = page.locator('button:has-text("Close")');
    await closeButton.focus();
    await page.keyboard.press('Enter');

    // Should return to search view
    await expect(page.locator('text=Welcome to AP Calculus Lessons')).toBeVisible();
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

    // Verify search placeholder updates
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toHaveAttribute('placeholder', /BC/);
  });

  test('should show search history', async ({ page }) => {
    // Perform a search
    const searchInput = page.locator('input[placeholder*="Search"]');
    await setFieldValue(searchInput, 'derivative');
    await page.waitForTimeout(500); // Wait for debounced search

    // Clear search
    await setFieldValue(searchInput, '');

    // Search history should appear
    await expect(page.locator('text=Recent Searches')).toBeVisible();
    await expect
      .poll(async () =>
        page.getByTestId('search-history-item').filter({ hasText: 'derivative' }).count()
      )
      .toBeGreaterThan(0);

    const historyItem = page
      .getByTestId('search-history-item')
      .filter({ hasText: 'derivative' })
      .first();

    // Click on history item
    await historyItem.click();

    // Should perform search again
    await expect(page.locator('text=2 results found')).toBeVisible();
  });

  test('should show loading state during search', async ({ page }) => {
    // Add delay to API response
    await page.unroute('**/kb/search**');
    await page.route('**/kb/search**', async route => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            {
              document: {
                id: 'doc_1',
                content: 'Test content',
                subject: 'calc',
                exam_variant: 'calc_ab',
                partition: 'public_kb',
                topic: 'Test',
                subtopic: null,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
              score: 0.9,
              snippet: 'Test snippet',
              provenance: {
                source: 'Test Source',
                partition: 'public_kb',
                topic: 'Test',
                subtopic: null,
              },
            },
          ],
        }),
      });
    });

    const searchInput = page.locator('input[placeholder*="Search"]');
    await setFieldValue(searchInput, 'test');

    // Should show loading state
    await expect(page.locator('text=Searching...')).toBeVisible();

    // Wait for results
    await expect(page.locator('text=1 result found')).toBeVisible();
  });

  test('should show no results message when no matches found', async ({ page }) => {
    // Search for something that won't match
    const searchInput = page.locator('input[placeholder*="Search"]');
    await setFieldValue(searchInput, 'nonexistent topic');

    // Wait for no results message
    await expect(page.locator('text=No lessons found for your search')).toBeVisible();
  });

  test('should display partition badges correctly', async ({ page }) => {
    // Search for derivative
    const searchInput = page.locator('input[placeholder*="Search"]');
    await setFieldValue(searchInput, 'derivative');

    // Wait for results
    await expect(page.locator('text=2 results found')).toBeVisible();

    // Check partition badges
    const publicBadges = page.getByTestId('search-result').filter({ hasText: 'Public' });
    await expect(publicBadges).toHaveCount(2);
  });

  test('should show match percentages', async ({ page }) => {
    // Search for derivative
    const searchInput = page.locator('input[placeholder*="Search"]');
    await setFieldValue(searchInput, 'derivative');

    // Wait for results
    await expect(page.locator('text=2 results found')).toBeVisible();

    // Check match percentages
    const matches = page.getByTestId('search-result');
    await expect(matches.first()).toContainText('95% match');
    await expect(matches.nth(1)).toContainText('88% match');
  });
});
