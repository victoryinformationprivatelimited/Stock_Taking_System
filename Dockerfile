# Single-container build: React/Vite web app served by the NestJS API.
# Build context must be the repo root (docker build -f Dockerfile .)

FROM node:20-bookworm-slim AS web-build
WORKDIR /web
COPY apps/web/package*.json ./
RUN npm install
COPY apps/web ./
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM node:20-bookworm-slim AS api-build
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY apps/api/package*.json ./
RUN npm install

COPY apps/api/prisma ./prisma
RUN npx prisma generate

COPY apps/api .
RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY apps/api/package*.json ./
RUN npm install --omit=dev

COPY --from=api-build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=api-build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=api-build /app/dist ./dist
COPY --from=api-build /app/prisma ./prisma
COPY --from=web-build /web/dist ./public

RUN mkdir -p /app/static/layouts

EXPOSE 3000
CMD ["node", "dist/src/main.js"]
