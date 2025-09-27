import { test, expect } from '@playwright/test';

const stories: Array<{
  id: string;
  name: string;
  readySelectors?: string[];
}> = [
  {
    id: 'components-verifiedbadge--verified',
    name: 'verified-badge.png',
  },
  {
    id: 'components-verifiedbadge--not-verified',
    name: 'verified-badge-not.png',
  },
  {
    id: 'components-trustmeter--high-trust',
    name: 'trust-meter-high.png',
  },
  {
    id: 'components-trustmeter--medium-trust',
    name: 'trust-meter-medium.png',
  },
  {
    id: 'components-trustmeter--low-trust',
    name: 'trust-meter-low.png',
  },
  {
    id: 'components-citationssidebar--with-sources-and-suggestions',
    name: 'citations-sidebar.png',
  },
  {
    id: 'components-citationssidebar--empty-state',
    name: 'citations-sidebar-empty.png',
  },
  {
    id: 'components-markdownrenderer--default-markdown',
    name: 'markdown-renderer-default.png',
  },
  {
    id: 'components-markdownrenderer--math-markdown',
    name: 'markdown-renderer-math.png',
  },
  {
    id: 'components-examvariantselector--interactive-selector',
    name: 'exam-variant-selector.png',
  },
  {
    id: 'pages-coachpage--interactive-coach',
    name: 'coach-page.png',
    readySelectors: ['text=The derivative of x^2 is 2x'],
  },
  {
    id: 'pages-lessonspage--search-flow',
    name: 'lessons-page.png',
    readySelectors: ['text=2 results found'],
  },
  {
    id: 'pages-pricingpage--default-plans',
    name: 'pricing-page.png',
    readySelectors: ['text=Unlimited coach questions'],
  },
];

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
});

for (const story of stories) {
  test(`visual regression – ${story.id}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);
    await page.waitForLoadState('networkidle');
    if (story.readySelectors && story.readySelectors.length > 0) {
      for (const selector of story.readySelectors) {
        await page.waitForSelector(selector, { state: 'visible', timeout: 10000 });
      }
    } else {
      await page.waitForTimeout(500);
    }
    await expect(page).toHaveScreenshot(story.name, {
      animations: 'disabled',
      maxDiffPixels: 200,
      fullPage: true,
    });
  });
}
