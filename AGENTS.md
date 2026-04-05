# Repository Guidelines

## Project Structure & Module Organization
`panoramax` is a `pnpm` monorepo. Root workspace files live in `package.json` and `pnpm-workspace.yaml`. Application code is split into `apps/api` and `apps/frontend`; product and strategy docs live in `docs/`.

- `apps/api/src/index.ts`: Hono API entrypoint compiled to `apps/api/dist/`
- `apps/frontend/src/app/`: Next.js App Router pages, layout, and global styles
- `apps/frontend/public/`: static assets
- `docs/`: numbered product documents such as `01-product-brief.md`

## Build, Test, and Development Commands
Install dependencies once from the repo root with `pnpm install`.

- `pnpm dev`: runs the main workspace dev flow
- `pnpm build`: builds the selected workspace from the root
- `pnpm lint`: runs the frontend ESLint configuration
- `pnpm typecheck`: runs the workspace type-check flow
- `pnpm --dir apps/api dev`: starts the Hono API with `tsx watch`
- `pnpm --dir apps/frontend dev`: starts the Next.js app on `localhost:3000`

## Coding Style & Naming Conventions
Use TypeScript for app code. Follow the existing file-local style rather than reformatting unrelated code. The frontend currently uses 2-space indentation, double quotes, and semicolons; keep React components in PascalCase and route files in Next.js conventions such as `page.tsx` and `layout.tsx`. Keep utility and config filenames lowercase.

Linting is configured only in `apps/frontend/eslint.config.mjs` with `eslint-config-next/core-web-vitals` and TypeScript rules. Run `pnpm lint` before opening a PR.

## Testing Guidelines
There is no committed test runner or `test` script at the root yet. Until one is added, treat `pnpm lint`, `pnpm typecheck`, and app builds as the minimum verification set. When adding tests, place them next to the code they cover or in a nearby `__tests__/` folder and name them `*.test.ts` or `*.test.tsx`.

## Commit & Pull Request Guidelines
History is minimal (`Initial commit`), so use short, imperative commit subjects in sentence case, e.g. `Add onboarding copy`. Keep commits focused by app or concern.

PRs should include a clear summary, impacted paths, verification steps, and screenshots for frontend UI changes. Link the relevant issue or doc when the change maps to product work in `docs/`.

## Agent-Specific Notes
Check `apps/frontend/AGENTS.md` before changing Next.js code; it calls out version-specific Next.js behavior that may differ from older defaults.
