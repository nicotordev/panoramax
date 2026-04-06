FROM node:20-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json tsconfig.base.json
COPY tsconfig.node.json tsconfig.node.json
COPY apps/cron/package.json apps/cron/package.json

RUN pnpm install --filter @panoramax/cron... --frozen-lockfile

FROM base AS build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json tsconfig.base.json
COPY tsconfig.node.json tsconfig.node.json
COPY apps/cron/package.json apps/cron/package.json
COPY apps/cron/tsconfig.json apps/cron/tsconfig.json
COPY apps/cron/src apps/cron/src
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/cron/node_modules ./apps/cron/node_modules

RUN pnpm --filter @panoramax/cron build

FROM node:20-alpine AS runner

WORKDIR /app/apps/cron

ENV NODE_ENV=production

COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/apps/cron/node_modules ./node_modules
COPY --from=deps /app/apps/cron/package.json ./package.json
COPY --from=build /app/apps/cron/dist ./dist

# Accept .env file if present at runtime (best practice for 12-factor apps)
# (Leaving for context if anyone wants to mount env files in Docker runs)
# ENV API_URL=""
# ENV API_KEY=""

CMD ["node", "dist/src/index.js"]
