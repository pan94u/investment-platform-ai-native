FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.4 --registry https://registry.npmmirror.com
RUN pnpm config set registry https://registry.npmmirror.com

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY apps/v1-traditional/frontend/package.json ./apps/v1-traditional/frontend/package.json
COPY apps/v1-traditional/backend/package.json ./apps/v1-traditional/backend/package.json
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/ ./
COPY packages/shared ./packages/shared
COPY packages/database ./packages/database
COPY packages/ui ./packages/ui
COPY apps/v1-traditional/frontend ./apps/v1-traditional/frontend
ENV NEXT_PUBLIC_API_URL=http://backend:3101
RUN pnpm --filter @filing/shared build && pnpm --filter @filing/v1-frontend build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/v1-traditional/frontend/.next/standalone ./
COPY --from=builder /app/apps/v1-traditional/frontend/.next/static ./apps/v1-traditional/frontend/.next/static
COPY --from=builder /app/apps/v1-traditional/frontend/public ./apps/v1-traditional/frontend/public

EXPOSE 3100
CMD ["node", "apps/v1-traditional/frontend/server.js"]
