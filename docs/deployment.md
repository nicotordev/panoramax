# Deployment

## Servicios

El monorepo se despliega como dos servicios separados:

- `api`: Hono en Node.js
- `frontend`: Next.js en Node.js

## Variables de entorno

### API

Archivo base: `apps/api/.env.example`

- `PORT`: puerto HTTP del servicio
- `HOST`: host de bind para el servidor

### Frontend

Archivo base: `apps/frontend/.env.example`

- `PORT`: puerto HTTP del servicio
- `NEXT_PUBLIC_API_URL`: base URL pública de la API

## Docker

Build local:

```bash
pnpm docker:build:api
pnpm docker:build:frontend
```

Dockerfiles:

- `apps/api/Dockerfile`
- `apps/frontend/Dockerfile`

El frontend usa `output: "standalone"` para producir una imagen más simple de correr en Railway.

## Railway

Crear dos servicios separados en Railway:

1. Servicio `api`
2. Servicio `frontend`

Configuración base recomendada:

- Root directory: `/`
- Builder: Dockerfile
- Servicio `api`: `RAILWAY_DOCKERFILE_PATH=apps/api/Dockerfile`
- Servicio `frontend`: `RAILWAY_DOCKERFILE_PATH=apps/frontend/Dockerfile`

Variables mínimas:

- API: `PORT`, `HOST`
- Frontend: `PORT`, `NEXT_PUBLIC_API_URL`

## Verificación mínima

- `pnpm typecheck`
- `pnpm build`
- `pnpm docker:build:api`
- `pnpm docker:build:frontend`
