# syntax=docker/dockerfile:1

############################################################
# Stage 1 — build the Vite bundle
############################################################
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines these at build time. Leave VITE_API_URL empty for local runs
# (the app then falls back to scanning http://localhost:3000-3005); set it to
# a full backend URL (e.g. http://myserver:3000) for server deployments.
ARG VITE_API_URL=""
ARG VITE_GOOGLE_CLIENT_ID=""
ENV VITE_API_URL=$VITE_API_URL \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

RUN npm run build

############################################################
# Stage 2 — serve static files with nginx
############################################################
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
