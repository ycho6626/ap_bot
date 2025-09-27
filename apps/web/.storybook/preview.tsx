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
        if (typeof window === 'undefined') {
          return;
        }

        const fixedStart = new Date('2024-01-01T00:32:53Z').getTime();
        const originalDateConstructor = window.Date;
        const originalGlobalDate = globalThis.Date;
        const originalDateNow = Date.now;
        const originalRandom = Math.random;

        class MockDate extends originalDateConstructor {
          static offset = 0;

          constructor(...args: ConstructorParameters<typeof originalDateConstructor>) {
            if (args.length === 0) {
              super(MockDate.now());
              return;
            }

            super(...args);
          }

          static now() {
            const current = fixedStart + MockDate.offset;
            MockDate.offset += 1000;
            return current;
          }
        }

        MockDate.offset = 0;
        (window as { Date: DateConstructor }).Date = MockDate as unknown as DateConstructor;
        (globalThis as { Date: DateConstructor }).Date = MockDate as unknown as DateConstructor;

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

        let seed = 1;
        Math.random = () => {
          const x = Math.sin(seed++) * 10000;
          return x - Math.floor(x);
        };

        restoreRef.current = {
          restore: () => {
            Math.random = originalRandom;
            Date.now = originalDateNow;
            (window as { Date: DateConstructor }).Date = originalDateConstructor;
            (globalThis as { Date: DateConstructor }).Date = originalGlobalDate;
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
