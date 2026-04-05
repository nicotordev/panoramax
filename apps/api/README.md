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
