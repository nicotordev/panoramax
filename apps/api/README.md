## Desarrollo

```bash
pnpm --filter @panoramax/api dev
```

API local:

```bash
http://localhost:3001
```

## Prisma

```bash
pnpm --filter @panoramax/api prisma:generate
pnpm --filter @panoramax/api prisma:db:pull
pnpm --filter @panoramax/api prisma:migrate:dev
pnpm --filter @panoramax/api prisma:studio
```

Variables relevantes:

- `DATABASE_URL`: conexión usada por Prisma Client en runtime
- `DIRECT_URL`: conexión usada por Prisma CLI
- `BRIGHTDATA_API_KEY`: API key para scraping con Bright Data SDK

## API keys

Las rutas públicas siguen abiertas:

- `GET /v1/health/*`
- `GET /v1/events`
- `GET /v1/events/:id`
- `GET /v1/sources`

Estas rutas ahora requieren API key:

- `POST /v1/events` con scope `events:write`
- `PATCH /v1/events/:id` con scope `events:write`
- `DELETE /v1/events/:id` con scope `events:write`
- `GET /v1/sources` con scope `sources:ingest`
- `GET /v1/sources/all` con scope `sources:ingest`
- `GET /v1/sources/:sourceKey/events` con scope `sources:ingest`

Crear una key:

```bash
pnpm --dir apps/api api-key:create local-dev --scope events:write --scope sources:ingest
```

Con expiración:

```bash
pnpm --dir apps/api api-key:create importer --scope sources:ingest --expires-in-days 30
```

Usarla por header:

```bash
curl -H "x-api-key: pmx_..." "http://localhost:3001/v1/sources/gam/events?limit=1"
curl -H "Authorization: Bearer pmx_..." -X POST "http://localhost:3001/v1/events"
```

## Ingesta pública

Primer flujo implementado:

- fuente: `Chile Cultura`
- scraping: `Bright Data SDK`
- parsing: `HTML + cheerio`

Preview local:

```bash
curl "http://localhost:3001/sources/chile-cultura/events?page=1&limit=1"
curl "http://localhost:3001/sources/gam/events?limit=1"
curl "http://localhost:3001/sources/ticketplus/events?limit=1"
curl "http://localhost:3001/sources/puntoticket/events?limit=1"
```

Import a base de datos:

```bash
curl -X POST "http://localhost:3001/sources/chile-cultura/import?page=1&limit=1"
curl -X POST "http://localhost:3001/sources/gam/import?limit=1"
```

Runner por CLI:

```bash
pnpm --filter @panoramax/api ingest:chile-cultura --page=1 --limit=1
pnpm --filter @panoramax/api ingest:gam --limit=1
pnpm --filter @panoramax/api ingest:ticketplus --limit=1
pnpm --filter @panoramax/api ingest:puntoticket --limit=1
pnpm --filter @panoramax/api ingest:sources --sources=gam,ticketplus --limit=1
```
