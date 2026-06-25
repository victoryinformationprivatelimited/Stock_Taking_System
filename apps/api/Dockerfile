FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true

# Bake environment variables with container names
ENV DATABASE_URL="postgresql://sts:sts_dev_password@postgres:5432/stock_taking?schema=public"
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379
ENV JWT_ACCESS_SECRET="ZmM3ZjdiMmUtODA3OC00NmE1LWJkNjEtMmY5OTNjMTVmMTJjNzM3ZTg4MDgtNDM2YS00MzQyLTk0YWYtOTVhMDQ0MGU1ZjAz"
ENV JWT_REFRESH_SECRET="NGFlMTllZmUtNjU1Mi00MTlhLWIwNGMtYTEyMDFmMzM1YWFhNzJjMGIxZWItYjU5NS00MGNhLTg5YmItZjlhZTRhZmY2M2M1"
ENV JWT_ACCESS_EXPIRES_IN=15m
ENV JWT_REFRESH_EXPIRES_IN=7d
ENV PORT=3000

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

RUN mkdir -p /app/static/layouts

EXPOSE 3000
CMD ["node", "dist/src/main.js"]

# port 3000
# running commands on docker
# docker build -t stock-taking-api:1.0.0 .
# docker tag stock-taking-api:1.0.0 stock-taking-api:latest


#  docker run -d --name sts-api-test -p 3000:3000 `         
# >>   -e DATABASE_URL="postgresql://sts:sts_dev_password@host.docker.internal:5433/stock_taking?schema=public" `
# >>   -e REDIS_HOST=host.docker.internal `
# >>   -e REDIS_PORT=6379 `
# >>   -e JWT_ACCESS_SECRET="ZmM3ZjdiMmUtODA3OC00NmE1LWJkNjEtMmY5OTNjMTVmMTJjNzM3ZTg4MDgtNDM2YS00MzQyLTk0YWYtOTVhMDQ0MGU1ZjAz" `
# >>   -e JWT_REFRESH_SECRET="NGFlMTllZmUtNjU1Mi00MTlhLWIwNGMtYTEyMDFmMzM1YWFhNzJjMGIxZWItYjU5NS00MGNhLTg5YmItZjlhZTRhZmY2M2M1" `
# >>   -e JWT_ACCESS_EXPIRES_IN=15m `
# >>   -e JWT_REFRESH_EXPIRES_IN=7d `
# >>   -e PORT=3000 `
# >>   -e NODE_ENV=production `
# >>   stock-taking-api:latest
