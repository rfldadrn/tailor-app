FROM node:22-bookworm-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && chown node:node /app
USER node

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

COPY --chown=node:node . .
RUN DATABASE_URL="postgresql://kasapp:build-only@localhost:5432/kasapp?schema=public" npx prisma generate
RUN DATABASE_URL="postgresql://kasapp:build-only@localhost:5432/kasapp?schema=public" \
    AUTH_SECRET="build-only-secret" \
    AUTH_TRUST_HOST="true" \
    npm run build

ENV NODE_ENV=production

EXPOSE 3000
CMD ["sh", "-c", "npm run db:migrate:deploy && exec npm start"]
