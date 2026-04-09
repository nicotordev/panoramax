FROM node:20-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json apps/frontend/package.json

RUN pnpm install --filter @panoramax/frontend... --frozen-lockfile

FROM base AS build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json tsconfig.base.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/frontend/tsconfig.json apps/frontend/tsconfig.json
COPY apps/frontend/next.config.mjs apps/frontend/next.config.mjs
COPY apps/frontend/postcss.config.mjs apps/frontend/postcss.config.mjs
COPY apps/frontend/components.json apps/frontend/components.json
COPY apps/frontend/app apps/frontend/app
COPY apps/frontend/components apps/frontend/components
COPY apps/frontend/data apps/frontend/data
COPY apps/frontend/hooks apps/frontend/hooks
COPY apps/frontend/lib apps/frontend/lib
COPY apps/frontend/public apps/frontend/public
COPY apps/frontend/types apps/frontend/types
COPY apps/frontend/i18n apps/frontend/i18n
COPY apps/frontend/messages apps/frontend/messages
COPY apps/frontend/proxy.ts apps/frontend/proxy.ts
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules

RUN pnpm --filter @panoramax/frontend build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

COPY --from=build /app/apps/frontend/.next/standalone ./
COPY --from=build /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=build /app/apps/frontend/public ./apps/frontend/public

EXPOSE 3000

CMD ["node", "apps/frontend/server.js"]
