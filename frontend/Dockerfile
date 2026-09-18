# Al Halabi Rent — Next.js frontend (standalone output)
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# `npm install` rather than `npm ci`: the lockfile is generated on Windows, so
# it does not carry the Linux-only optional binaries (SWC, Tailwind oxide) that
# `npm ci` insists on finding.
#
# The cache mount lets a retry resume instead of re-downloading everything, and
# the generous retry settings survive a slow or flaky connection.
RUN --mount=type=cache,target=/root/.npm     npm config set fetch-retries 6 fetch-retry-mintimeout 20000 fetch-retry-maxtimeout 180000 fetch-timeout 900000     && npm install --no-audit --no-fund

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next bakes `rewrites()` into the standalone server at build time, so the API
# host has to be known here. Compose always names the service `backend`;
# override with --build-arg BACKEND_URL=... for another topology.
ARG BACKEND_URL=http://backend:8000
ENV NEXT_TELEMETRY_DISABLED=1     BACKEND_URL=$BACKEND_URL     NEXT_PUBLIC_DEMO=0
# Linux has the native SWC binary, so the Windows `--webpack` workaround in the
# npm script is not needed here.
RUN npx next build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
