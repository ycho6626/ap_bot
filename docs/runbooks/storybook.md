# Storybook

## Purpose

Storybook documents and smoke-tests reusable UI components in isolation. The catalogue currently lives in `apps/web`, which contains the shared primitives used across the tutor-facing web apps.

## Local development

1. Install dependencies if needed: `CI=1 pnpm install`
2. Start the Storybook dev server filtered to the web app: `pnpm storybook`
   - This runs `pnpm --filter @ap/web storybook` under the hood.
3. Visit http://localhost:6006 to interact with the component stories.

## Static builds

- Generate the static bundle with `pnpm build-storybook`. Output lands in `apps/web/storybook-static/` and is ignored by git.

## Adding stories

- Place new stories beside the component in `apps/web/src/**` using the `.stories.tsx` suffix.
- Use CSF format with controls for props so designers can explore variants.
- Import shared globals via the automatic setup in `apps/web/.storybook/preview.ts`.

## Troubleshooting

- Next.js aliases such as `@/components/*` are configured in `apps/web/.storybook/main.ts`.
- Tailwind styles come from `apps/web/src/app/globals.css`. If a component needs additional providers, add a decorator in the same preview file.
