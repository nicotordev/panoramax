FROM node:20-alpine

WORKDIR /app

# Copy only the cron package files to leverage efficient Docker layer caching
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY . .

# Install pnpm globally
RUN npm install -g pnpm

# Install only production dependencies (not all workspace deps)
RUN pnpm install --filter ./ --prod --frozen-lockfile

# Build the cron app specifically
RUN pnpm build

# Start the app
CMD ["pnpm", "start"]
