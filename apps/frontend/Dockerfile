FROM node:20-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN apk add --no-cache libc6-compat
RUN corepack enable

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json apps/frontend/package.json

RUN pnpm install --filter @panoramax/frontend... --frozen-lockfile

FROM base AS build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/frontend/tsconfig.json apps/frontend/tsconfig.json
COPY apps/frontend/next.config.ts apps/frontend/next.config.ts
COPY apps/frontend/postcss.config.mjs apps/frontend/postcss.config.mjs
COPY apps/frontend/eslint.config.mjs apps/frontend/eslint.config.mjs
COPY apps/frontend/next-env.d.ts apps/frontend/next-env.d.ts
COPY apps/frontend/public apps/frontend/public
COPY apps/frontend/src apps/frontend/src
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules

RUN pnpm --filter @panoramax/frontend build

FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/apps/frontend/.next/standalone ./
COPY --from=build /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=build /app/apps/frontend/public ./apps/frontend/public

EXPOSE 3000

CMD ["node", "apps/frontend/server.js"]
