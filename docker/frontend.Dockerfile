# Build context is the repo root (not apps/*) — this is an npm workspace
# monorepo where every app shares packages/kiosk-core, so the build needs
# visibility into the whole tree, not just one app's directory.

FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/admin/package.json apps/admin/package.json
COPY apps/entry/package.json apps/entry/package.json
COPY apps/exit/package.json apps/exit/package.json
COPY apps/fuel/package.json apps/fuel/package.json
COPY apps/kiosk/package.json apps/kiosk/package.json
COPY apps/platform/package.json apps/platform/package.json
COPY packages/kiosk-core/package.json packages/kiosk-core/package.json
RUN npm ci

COPY apps/ apps/
COPY packages/ packages/
# Each kiosk app's prebuild runs scripts/copy-ocr-model.mjs to place the
# odometer OCR models in its public/ directory — without this the build fails
# outright, because the models can't be imported from @gutenye/ocr-models
# (its exports map doesn't expose assets/).
COPY scripts/ scripts/

# Vite inlines VITE_-prefixed vars from the environment at build time — no
# .env file needed. All four kiosk/admin apps share one API origin; platform
# talks to a different path on that same origin, so it gets its own build.
ARG VITE_API_BASE_URL
ARG VITE_PLATFORM_API_BASE_URL
# Which commit this image was built from, passed down by the deploy. Shown on
# the kiosk's launcher/splash so an operator can tell at a glance whether the
# phone is running the build that was just shipped — an installed PWA can keep
# serving a cached bundle indefinitely, and from the outside that looks exactly
# like a fix that did not work.
ARG VITE_BUILD_ID=unknown
ENV VITE_BUILD_ID=${VITE_BUILD_ID}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN export VITE_BUILT_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)" && \
    npm run build:admin && npm run build:entry && npm run build:exit && \
    npm run build:fuel && npm run build:kiosk
ENV VITE_API_BASE_URL=${VITE_PLATFORM_API_BASE_URL}
RUN npm run build:platform

# ── Serve them all with one Nginx, routed by Host header ────────────────────
FROM nginx:alpine

COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html/admin
COPY --from=builder /app/apps/entry/dist /usr/share/nginx/html/entry
COPY --from=builder /app/apps/exit/dist /usr/share/nginx/html/exit
COPY --from=builder /app/apps/fuel/dist /usr/share/nginx/html/fuel
COPY --from=builder /app/apps/kiosk/dist /usr/share/nginx/html/kiosk
COPY --from=builder /app/apps/platform/dist /usr/share/nginx/html/platform
COPY docker/frontend-nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
