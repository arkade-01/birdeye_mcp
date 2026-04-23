# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:20-slim AS runner

WORKDIR /app

# Only copy what's needed to run
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/build ./build

EXPOSE 3000

CMD ["node", "build/index.js"]