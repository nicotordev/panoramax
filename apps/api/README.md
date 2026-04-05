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

## Ingesta pública

Primer flujo implementado:

- fuente: `Chile Cultura`
- scraping: `Bright Data SDK`
- parsing: `HTML + cheerio`

Preview local:

```bash
curl "http://localhost:3001/sources/chile-cultura/events?page=1&limit=1"
```

Import a base de datos:

```bash
curl -X POST "http://localhost:3001/sources/chile-cultura/import?page=1&limit=1"
```

Runner por CLI:

```bash
pnpm --filter @panoramax/api ingest:chile-cultura --page=1 --limit=1
```
