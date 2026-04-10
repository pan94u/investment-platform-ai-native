FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.4 --registry https://registry.npmmirror.com

# 配置双 registry：公共包走镜像，@haier 走私有库
RUN pnpm config set registry https://registry.npmmirror.com && \
    pnpm config set @haier:registry https://npm.haier.net

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY apps/v1-traditional/backend/package.json ./apps/v1-traditional/backend/package.json

# @haier 私有包需要认证，CI/CD 平台需通过 build args 注入
ARG NPM_HAIER_TOKEN
RUN if [ -n "$NPM_HAIER_TOKEN" ]; then \
      echo "//npm.haier.net/:_authToken=${NPM_HAIER_TOKEN}" >> /root/.npmrc; \
    fi && \
    pnpm install --frozen-lockfile

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

# 环境变量文件选择：CI/CD 通过 --build-arg ENV_TARGET=test|production
ARG ENV_TARGET=production
COPY apps/v1-traditional/backend/.env.${ENV_TARGET} ./.env.production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/package.json
COPY --from=builder /app/apps/v1-traditional/backend/dist ./apps/v1-traditional/backend/dist
COPY --from=builder /app/apps/v1-traditional/backend/package.json ./apps/v1-traditional/backend/package.json

# 显式复制 backend 的 node_modules（包含 @hono/node-server 等运行时依赖）
COPY --from=builder /app/apps/v1-traditional/backend/node_modules ./apps/v1-traditional/backend/node_modules

EXPOSE 3101
CMD ["node", "--env-file=.env.production", "apps/v1-traditional/backend/dist/index.js"]
