# syntax=docker/dockerfile:1

############################################################
# Stage 1 — build: compile NestJS, generate the Prisma client
# and prepare a migrated + seeded SQLite template database.
############################################################
FROM node:22-alpine AS build
WORKDIR /app

# Prisma engines on Alpine need OpenSSL
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

# Create a ready-to-use SQLite DB (schema + seed) at build time, so the
# runtime image needs neither the Prisma CLI nor ts-node. The entrypoint
# copies this template into the data volume on first start.
ENV DATABASE_URL="file:./template.db"
RUN npx prisma db push --skip-generate && npx prisma db seed

############################################################
# Stage 2 — production dependencies only
############################################################
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

############################################################
# Stage 3 — runtime
############################################################
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY --from=prod-deps /app/node_modules ./node_modules
# Generated Prisma client (query engine included) from the build stage
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma/template.db ./prisma/template.db
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh && mkdir -p /app/data && chown -R node:node /app
USER node

# SQLite file lives in /app/data — mount a volume there to persist data
ENV DATABASE_URL="file:/app/data/app.db" \
    PORT=3000

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
# tsconfig.build.json compiles prisma/ and scripts/ too, so the compiled
# entrypoint lands in dist/src/, not dist/.
CMD ["node", "dist/src/main"]
