# ---------- STAGE 1: Builder ----------
FROM node:20-slim AS builder

WORKDIR /app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN corepack enable && pnpm install --frozen-lockfile

COPY . .

RUN pnpm install prisma @prisma/client @prisma/config ioredis@5.8.2
RUN npx prisma generate
#RUN pnpm run build
# ---------- STAGE 2: Produção ----------
FROM node:20-slim AS prod

WORKDIR /app

ENV NODE_ENV=production \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libgtk-3-0 \
    libnss3 \
    libxshmfence1 \
    libx11-xcb1 \
    ca-certificates \
    wget \
    dumb-init \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && useradd -m appuser

# 🔥 cria a pasta e já entrega pro appuser
RUN mkdir -p /app/userDataDir /app/public && \
    chown -R appuser:appuser /app/userDataDir /app/public
COPY --from=builder --chown=appuser:appuser /app /app
COPY --chown=appuser:appuser entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

USER appuser

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--", "/app/entrypoint.sh"]
CMD ["pnpm", "run", "dev"]

