import { test, expect } from '@playwright/test';

test.describe('Pricing Page - Simple Smoke Tests', () => {
  test('should visit /pricing and display basic elements @smoke', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('domcontentloaded');

    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Simple, Transparent Pricing');

    // Check for pricing plan titles
    await expect(page.locator('h3.font-semibold:has-text("Free")').first()).toBeVisible();
    await expect(page.locator('h3.font-semibold:has-text("Pro")').first()).toBeVisible();
    await expect(page.locator('h3.font-semibold:has-text("Teacher")').first()).toBeVisible();

    // Check for pricing amounts
    await expect(page.locator('text=$0')).toBeVisible();
    await expect(page.locator('text=$19')).toBeVisible();
    await expect(page.locator('text=$49')).toBeVisible();
  });

  test('should show Pro plan as most popular @smoke', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('domcontentloaded');

    // Check for popular badge
    await expect(page.locator('text=Most Popular')).toBeVisible();

    // Check for Pro plan features
    await expect(page.locator('text=Unlimited questions')).toBeVisible();
    await expect(page.locator('text=Verified answers with trust scores')).toBeVisible();
  });

  test('should display FAQ section @smoke', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('domcontentloaded');

    // Scroll to FAQ section
    await page.locator('text=Frequently Asked Questions').scrollIntoViewIfNeeded();

    // Check FAQ questions
    await expect(page.locator("text=What's included in the free plan?")).toBeVisible();
    await expect(page.locator('text=Can I change plans anytime?')).toBeVisible();
  });

  test('should have working navigation links @smoke', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('domcontentloaded');

    // Check navigation availability (desktop vs mobile)
    const navLinks = page.locator('nav a:has-text("Coach")');
    if (await navLinks.first().isVisible()) {
      await expect(navLinks).toBeVisible();
      await expect(page.locator('nav a:has-text("Lessons")')).toBeVisible();
      await expect(page.locator('nav a:has-text("Account")')).toBeVisible();
    } else {
      // On mobile the nav is collapsed; ensure primary CTA links are available
      await expect(page.getByRole('link', { name: 'Try Free', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Get Started', exact: true }).first()).toBeVisible();
    }
  });
});
