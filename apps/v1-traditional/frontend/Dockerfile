# 单阶段构建：所有步骤在一个 stage，避免 BuildKit 跨 stage COPY cache invalidation 问题
FROM node:20-alpine

RUN npm install -g pnpm@9.15.4 --registry https://registry.npmmirror.com

# 配置双 registry
RUN pnpm config set registry https://registry.npmmirror.com && \
    pnpm config set @haier:registry https://npm.haier.net

WORKDIR /app

# 复制所有源码
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/database ./packages/database
COPY packages/ui ./packages/ui
COPY apps/v1-traditional/frontend ./apps/v1-traditional/frontend
COPY apps/v1-traditional/backend ./apps/v1-traditional/backend

# @haier 私有包认证（CI 通过 --build-arg NPM_HAIER_TOKEN=<token> 传入）
ARG NPM_HAIER_TOKEN
RUN if [ -n "$NPM_HAIER_TOKEN" ]; then \
      echo "//npm.haier.net/:_authToken=${NPM_HAIER_TOKEN}" >> /root/.npmrc; \
    fi

# 安装依赖
RUN pnpm install --frozen-lockfile

# 环境变量选择：CI/CD 通过 --build-arg ENV_TARGET=test|production
ARG ENV_TARGET=production
COPY apps/v1-traditional/frontend/.env.${ENV_TARGET} .env.local

# 构建
RUN pnpm --filter @filing/shared build && \
    pnpm --filter @filing/v1-frontend build

ENV NODE_ENV=production
ENV PORT=3100

EXPOSE 3100

# 启动命令
CMD ["node", "apps/v1-traditional/frontend/server.js"]
