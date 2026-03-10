FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.4 --registry https://registry.npmmirror.com
RUN pnpm config set registry https://registry.npmmirror.com

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY apps/v1-traditional/backend/package.json ./apps/v1-traditional/backend/package.json
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/ ./
COPY packages/shared ./packages/shared
COPY packages/database ./packages/database
COPY apps/v1-traditional/backend ./apps/v1-traditional/backend
RUN pnpm --filter @filing/shared build && pnpm --filter @filing/database build && pnpm --filter @filing/v1-backend build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/package.json
COPY --from=builder /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=builder /app/packages/database/src/migrations ./packages/database/src/migrations
COPY --from=builder /app/apps/v1-traditional/backend/dist ./apps/v1-traditional/backend/dist
COPY --from=builder /app/apps/v1-traditional/backend/package.json ./apps/v1-traditional/backend/package.json
COPY --from=builder /app/apps/v1-traditional/backend/node_modules ./apps/v1-traditional/backend/node_modules

EXPOSE 3101
CMD ["node", "apps/v1-traditional/backend/dist/index.js"]
