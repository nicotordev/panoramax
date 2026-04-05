# panoramax

Monorepo `pnpm` para construir `panoramax`, una app de discovery social de panoramas y eventos locales para Chile.

## Estructura

- `apps/api`: API Hono para ingesta y serving de datos
- `apps/frontend`: app web Next.js
- `docs/`: material de producto, research y estrategia

## Comandos

- `pnpm install`
- `pnpm dev`
- `pnpm dev:api`
- `pnpm dev:frontend`
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm docker:build:api`
- `pnpm docker:build:frontend`

## Variables de entorno

- `apps/api/.env.example`: `DATABASE_URL`, `DIRECT_URL`, `PORT`, `HOST`
- `apps/frontend/.env.example`: `PORT`, `NEXT_PUBLIC_API_URL`

## Setup local

Guía rápida para contributors nuevos en `docs/setup.md`.

## Docker y Railway

Cada servicio se builda con su propio `Dockerfile`:

- `apps/api/Dockerfile`
- `apps/frontend/Dockerfile`

Para desplegar en Railway, crea un servicio por app usando el repo raíz como contexto de build y apuntando al `Dockerfile` correspondiente.

Más detalle operativo en `docs/deployment.md`.
