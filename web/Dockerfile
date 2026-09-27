# ── Build ─────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG VITE_MAX_INPUT_CHARS=10000
ARG VITE_SCORE_THRESHOLD=0.7
RUN npm run build

# ── Serve ─────────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# nginx substitutes these into templates/*.template at container start.
# 127.0.0.11 is Docker's embedded DNS; point NGINX_RESOLVER at your platform's DNS elsewhere.
ENV API_UPSTREAM=http://app:8000 \
    NGINX_RESOLVER=127.0.0.11
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY nginx-security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/healthz || exit 1
