import { useEffect, useRef } from 'react';
import type { Preview } from '@storybook/nextjs';
import { initialize, mswDecorator } from 'msw-storybook-addon';
import '../src/app/globals.css';

initialize({ onUnhandledRequest: 'bypass' });

const preview: Preview = {
  decorators: [
    mswDecorator,
    Story => {
      const restoreRef = useRef<{ restore: () => void } | null>(null);

      useEffect(() => {
        if (typeof window !== 'undefined') {
          if (!(window as { ResizeObserver?: unknown }).ResizeObserver) {
            class MockResizeObserver {
              observe() {
                return void 0;
              }
              unobserve() {
                return void 0;
              }
              disconnect() {
                return void 0;
              }
            }

            (window as { ResizeObserver: typeof MockResizeObserver }).ResizeObserver = MockResizeObserver;
          }

          if (!(window as { IntersectionObserver?: unknown }).IntersectionObserver) {
            class MockIntersectionObserver {
              observe() {
                return void 0;
              }
              unobserve() {
                return void 0;
              }
              disconnect() {
                return void 0;
              }
            }

            (window as { IntersectionObserver: typeof MockIntersectionObserver }).IntersectionObserver =
              MockIntersectionObserver;
          }

          if (!window.matchMedia) {
            window.matchMedia = query => ({
              matches: query.includes('pointer: coarse'),
              media: query,
              onchange: null,
              addListener() {
                return void 0;
              },
              removeListener() {
                return void 0;
              },
              addEventListener() {
                return void 0;
              },
              removeEventListener() {
                return void 0;
              },
              dispatchEvent() {
                return false;
              },
            });
          }
        }

        const fixedNow = new Date('2024-01-01T12:00:00Z').getTime();
        const originalDateNow = Date.now;
        const originalRandom = Math.random;
        let seed = 1;

        Date.now = () => fixedNow;
        Math.random = () => {
          const x = Math.sin(seed++) * 10000;
          return x - Math.floor(x);
        };

        restoreRef.current = {
          restore: () => {
            Date.now = originalDateNow;
            Math.random = originalRandom;
          },
        };

        return () => {
          restoreRef.current?.restore();
        };
      }, []);

      return <Story />;
    },
  ],
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f9fafb' },
        { name: 'dark', value: '#0f172a' },
      ],
    },
  },
};

export default preview;
