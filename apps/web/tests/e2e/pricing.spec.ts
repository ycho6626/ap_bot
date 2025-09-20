import { test, expect } from '@playwright/test';

test.describe('Pricing Page - Checkout Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the pricing plans API
    await page.route('**/payments/plans', async route => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'price_free',
            name: 'Free',
            description: 'Perfect for trying out our platform',
            price: 0,
            currency: 'usd',
            interval: 'month',
            features: [
              '5 questions per day',
              'Basic explanations',
              'Public knowledge base',
              'AB & BC support',
            ],
            role: 'public',
          },
          {
            id: 'price_pro_monthly',
            name: 'Pro',
            description: 'For serious AP Calculus students',
            price: 19,
            currency: 'usd',
            interval: 'month',
            features: [
              'Unlimited questions',
              'Verified answers with trust scores',
              'Step-by-step solutions',
              'Premium knowledge base',
              'AB & BC support',
              'Priority support',
              'Citations and sources',
            ],
            role: 'calc_paid',
            popular: true,
          },
          {
            id: 'price_teacher_monthly',
            name: 'Teacher',
            description: 'For educators and institutions',
            price: 49,
            currency: 'usd',
            interval: 'month',
            features: [
              'Everything in Pro',
              'Private knowledge base',
              'Student progress tracking',
              'Custom content creation',
              'API access',
              'Bulk student management',
              'Advanced analytics',
            ],
            role: 'teacher',
          },
        ]),
      });
    });

    // Mock the Stripe checkout API
    await page.route('**/payments/checkout', async route => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }

      const postData = JSON.parse(route.request().postData() || '{}');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'cs_test_123',
          url: `https://checkout.stripe.com/c/pay/cs_test_123?price_id=${postData.priceId}`,
          success_url: 'http://localhost:3000/account?success=true',
          cancel_url: 'http://localhost:3000/pricing?canceled=true',
        }),
      });
    });

    await page.goto('/pricing');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should visit /pricing and click Pro CTA to start checkout @smoke', async ({ page }) => {
    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Simple, Transparent Pricing');

    // Verify pricing plans are displayed
    await expect(page.locator('h3.font-semibold:has-text("Free")').first()).toBeVisible();
    await expect(page.locator('h3.font-semibold:has-text("Pro")').first()).toBeVisible();
    await expect(page.locator('h3.font-semibold:has-text("Teacher")').first()).toBeVisible();

    // Find the Pro plan (most popular)
    const proCard = page
      .getByTestId('plan-card')
      .filter({ has: page.getByRole('heading', { name: 'Pro' }) });
    await expect(proCard.getByTestId('plan-popular-badge')).toBeVisible();
    await expect(proCard).toContainText('$19/month');

    // Click the Pro upgrade button
    const proButton = proCard.getByTestId('plan-cta');
    await expect(proButton).toBeVisible();

    // Intercept the checkout API call
    const checkoutPromise = page.waitForRequest('**/payments/checkout');

    // Click the button
    await proButton.click();

    // Wait for the API call
    const request = await checkoutPromise;

    // Verify the request was made with correct data
    const requestData = JSON.parse(request.postData() || '{}');
    expect(requestData.priceId).toBe('price_pro_monthly');

    // Verify redirect URL was used (in a real test, you'd check the actual redirect)
    // For this smoke test, we'll verify the API was called correctly
    expect(request.url()).toContain('/payments/checkout');
  });

  test('should handle Teacher plan checkout', async ({ page }) => {
    // Find the Teacher plan
    const teacherCard = page
      .getByTestId('plan-card')
      .filter({ has: page.getByRole('heading', { name: 'Teacher' }) });
    await expect(teacherCard).toContainText('$49/month');

    // Click the Teacher upgrade button
    const teacherButton = teacherCard.getByTestId('plan-cta');

    // Intercept the checkout API call
    const checkoutPromise = page.waitForRequest('**/payments/checkout');

    // Click the button
    await teacherButton.click();

    // Wait for the API call
    const request = await checkoutPromise;

    // Verify the request was made with correct data
    const requestData = JSON.parse(request.postData() || '{}');
    expect(requestData.priceId).toBe('price_teacher_monthly');
  });

  test('should redirect Free plan to coach page', async ({ page }) => {
    // Find the Free plan
    const freeCard = page
      .getByTestId('plan-card')
      .filter({ has: page.getByRole('heading', { name: 'Free' }) });
    await expect(freeCard).toContainText('$0/month');

    // Click the Free plan button
    const freeButton = freeCard.getByTestId('plan-cta');

    // Click and verify navigation
    await freeButton.click();

    // Should navigate to coach page
    await expect(page).toHaveURL('/coach');
    await expect(page.locator('h1')).toContainText('AP Calculus Coach');
  });

  test('should show loading state during checkout creation', async ({ page }) => {
    // Add delay to checkout API response
    await page.route(
      '**/payments/checkout',
      async route => {
        if (route.request().method() !== 'POST') {
          await route.continue();
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'cs_test_123',
            url: 'https://checkout.stripe.com/c/pay/cs_test_123',
            success_url: 'http://localhost:3000/account?success=true',
            cancel_url: 'http://localhost:3000/pricing?canceled=true',
          }),
        });
      },
      { times: 1 }
    );

    // Find the Pro plan
    const proCard = page
      .getByTestId('plan-card')
      .filter({ has: page.getByRole('heading', { name: 'Pro' }) });
    const proButton = proCard.getByTestId('plan-cta');

    // Click the button
    await proButton.click();

    // Should show loading state
    await expect(page.locator('text=Processing...')).toBeVisible();

    // Button should be disabled
    await expect(proButton).toBeDisabled();
  });

  test('should display all pricing features correctly', async ({ page }) => {
    // Check Free plan features
    const freeCard = page
      .getByTestId('plan-card')
      .filter({ has: page.getByRole('heading', { name: 'Free' }) });
    await expect(freeCard).toContainText('5 questions per day');
    await expect(freeCard).toContainText('Basic explanations');
    await expect(freeCard).toContainText('Public knowledge base');
    await expect(freeCard).toContainText('AB & BC support');

    // Check Pro plan features
    const proCard = page
      .getByTestId('plan-card')
      .filter({ has: page.getByRole('heading', { name: 'Pro' }) });
    await expect(proCard).toContainText('Unlimited questions');
    await expect(proCard).toContainText('Verified answers with trust scores');
    await expect(proCard).toContainText('Step-by-step solutions');
    await expect(proCard).toContainText('Premium knowledge base');
    await expect(proCard).toContainText('Priority support');
    await expect(proCard).toContainText('Citations and sources');

    // Check Teacher plan features
    const teacherCard = page
      .getByTestId('plan-card')
      .filter({ has: page.getByRole('heading', { name: 'Teacher' }) });
    await expect(teacherCard).toContainText('Everything in Pro');
    await expect(teacherCard).toContainText('Private knowledge base');
    await expect(teacherCard).toContainText('Student progress tracking');
    await expect(teacherCard).toContainText('Custom content creation');
    await expect(teacherCard).toContainText('API access');
    await expect(teacherCard).toContainText('Bulk student management');
    await expect(teacherCard).toContainText('Advanced analytics');
  });

  test('should show popular badge on Pro plan', async ({ page }) => {
    const proCard = page
      .getByTestId('plan-card')
      .filter({ has: page.getByRole('heading', { name: 'Pro' }) });

    // Should have popular badge
    await expect(proCard.getByTestId('plan-popular-badge')).toBeVisible();

    // Should have different styling (border)
    await expect(proCard).toHaveClass(/border-primary-500/);
  });

  test('should display FAQ section', async ({ page }) => {
    // Scroll to FAQ section
    await page.locator('text=Frequently Asked Questions').scrollIntoViewIfNeeded();

    // Check FAQ questions
    await expect(page.locator("text=What's included in the free plan?")).toBeVisible();
    await expect(page.locator('text=Can I change plans anytime?')).toBeVisible();
    await expect(page.locator('text=What payment methods do you accept?')).toBeVisible();
    await expect(page.locator('text=Is there a money-back guarantee?')).toBeVisible();
  });

  test('should display CTA section', async ({ page }) => {
    // Scroll to CTA section
    await page.locator('text=Ready to Get Started?').scrollIntoViewIfNeeded();

    // Check CTA content
    await expect(page.locator('text=Ready to Get Started?')).toBeVisible();
    await expect(page.locator('text=Join thousands of students')).toBeVisible();

    // Check CTA buttons
    await expect(page.locator('text=Try Free Now')).toBeVisible();
    await expect(page.locator('text=View Account')).toBeVisible();
  });

  test('should handle checkout API errors gracefully', async ({ page }) => {
    // Mock checkout API to return error
    await page.route('**/payments/checkout', async route => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error',
        }),
      });
    });

    // Find the Pro plan
    const proCard = page
      .getByTestId('plan-card')
      .filter({ has: page.getByRole('heading', { name: 'Pro' }) });
    const proButton = proCard.getByTestId('plan-cta');

    // Click the button
    await proButton.click();

    // Should show error toast (if implemented)
    // In a real implementation, you'd check for error messages
    await page.waitForTimeout(1000);

    // Button should be enabled again
    await expect(proButton).toBeEnabled();
  });
});
