FROM node:20-alpine

WORKDIR /app

COPY package.json .
COPY pnpm-lock.yaml ./
COPY . .

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

RUN pnpm build

CMD ["pnpm", "start"]
