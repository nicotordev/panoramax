# Local Setup

## Requisitos

- Node.js 20
- `pnpm` 10
- Docker opcional para validar builds de despliegue

## Instalación

Desde la raíz del repo:

```bash
pnpm install
```

## Variables de entorno

Crear archivos locales a partir de los ejemplos:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/frontend/.env.example apps/frontend/.env.local
```

Valores base:

- API: `PORT=3001`, `HOST=0.0.0.0`
- Frontend: `PORT=3000`, `NEXT_PUBLIC_API_URL=http://localhost:3001`

## Desarrollo

Levantar ambos servicios:

```bash
pnpm dev
```

Levantar un solo servicio:

```bash
pnpm dev:api
pnpm dev:frontend
```

URLs locales esperadas:

- Frontend: `http://localhost:3000`
- API: `http://localhost:3001`

## Verificación mínima

Antes de abrir un PR:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Validación de Docker

Para probar los contenedores usados en Railway:

```bash
pnpm docker:build:api
pnpm docker:build:frontend
```

## Notas

- El repo usa un solo workspace `pnpm` en la raíz.
- `apps/api` y `apps/frontend` se despliegan como servicios separados.
- La guía de despliegue está en `docs/deployment.md`.
