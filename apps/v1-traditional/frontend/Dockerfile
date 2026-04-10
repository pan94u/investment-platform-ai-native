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
COPY packages/ui/package.json ./packages/ui/package.json
COPY apps/v1-traditional/frontend/package.json ./apps/v1-traditional/frontend/package.json
COPY apps/v1-traditional/backend/package.json ./apps/v1-traditional/backend/package.json

# @haier 私有包需要认证，CI/CD 平台需通过 build args 注入
ARG NPM_HAIER_TOKEN
RUN if [ -n "$NPM_HAIER_TOKEN" ]; then \
      echo "//npm.haier.net/:_authToken=${NPM_HAIER_TOKEN}" >> /root/.npmrc; \
    fi && \
    pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app

# 强制 builder 重跑的 cache buster
ARG BUILD_DATE
RUN echo "BUILD_DATE=${BUILD_DATE:-unset}" && \
    echo "Build timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

COPY --from=deps /app/ ./
COPY packages/shared ./packages/shared
COPY packages/database ./packages/database
COPY packages/ui ./packages/ui
COPY apps/v1-traditional/frontend ./apps/v1-traditional/frontend
COPY apps/v1-traditional/backend ./apps/v1-traditional/backend

ENV NEXT_PUBLIC_API_URL=http://backend:3101
RUN pnpm --filter @filing/shared build && pnpm --filter @filing/v1-frontend build

# === 调试：验证 next build 产物 ===
RUN echo "=== .next 内容 ===" && \
    ls /app/apps/v1-traditional/frontend/.next/ && \
    echo "=== standalone 内容 ===" && \
    find /app/apps/v1-traditional/frontend/.next/standalone -maxdepth 3 -type f | head -20 && \
    echo "=== standalone/server.js 是否存在 ===" && \
    ls /app/apps/v1-traditional/frontend/.next/standalone/server.js 2>/dev/null || \
    echo "server.js not at root, searching..." && \
    find /app/apps/v1-traditional/frontend/.next/standalone -name server.js 2>/dev/null

# 将构建产物复制到独立的输出目录
RUN mkdir -p /output/frontend-standalone /output/frontend-static /output/frontend-public && \
    echo "=== 复制 standalone ===" && \
    cp -r /app/apps/v1-traditional/frontend/.next/standalone/apps/v1-traditional/frontend /output/frontend-standalone/ && \
    cp -r /app/apps/v1-traditional/frontend/.next/standalone/node_modules /output/frontend-standalone/ && \
    cp -r /app/apps/v1-traditional/frontend/.next/standalone/package.json /output/frontend-standalone/ && \
    echo "=== /output/frontend-standalone 内容 ===" && \
    ls /output/frontend-standalone/ && \
    echo "=== /output/frontend-standalone/server.js ===" && \
    ls /output/frontend-standalone/server.js 2>/dev/null || echo "server.js NOT FOUND" && \
    echo "=== /output/ 内容 ===" && \
    ls /output/ && \
    echo "=== 复制 static ===" && \
    cp -r /app/apps/v1-traditional/frontend/.next/static/ /output/frontend-static/ && \
    echo "=== 复制 public ===" && \
    cp -r /app/apps/v1-traditional/frontend/public/ /output/frontend-public/ && \
    echo "=== 复制完成 ==="

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3100

# === 调试：验证 builder 产物 ===
COPY --from=builder /output/frontend-standalone /tmp/check-standalone/
RUN echo "=== runner 检查: /tmp/check-standalone ===" && \
    ls /tmp/check-standalone/ && \
    echo "=== server.js ===" && \
    ls /tmp/check-standalone/server.js 2>/dev/null || echo "server.js NOT FOUND"

COPY --from=builder /output/frontend-standalone ./apps/v1-traditional/frontend/
COPY --from=builder /output/frontend-static ./apps/v1-traditional/frontend/.next/static
COPY --from=builder /output/frontend-public ./apps/v1-traditional/frontend/public

# === 调试：验证最终镜像 ===
RUN echo "=== runner 最终检查 ===" && \
    echo "apps/v1-traditional/frontend/:" && \
    ls ./apps/v1-traditional/frontend/ && \
    echo "=== server.js ===" && \
    ls ./apps/v1-traditional/frontend/server.js 2>/dev/null || echo "server.js NOT FOUND"

EXPOSE 3100
CMD ["node", "apps/v1-traditional/frontend/server.js"]
