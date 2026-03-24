# syntax=docker/dockerfile:1

FROM node:20-bookworm AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --ignore-scripts

FROM node:20-bookworm AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
RUN npx prisma generate
RUN DEBUG=prisma* npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY --from=build /app/prisma ./prisma

EXPOSE 3000

CMD ["npm", "run", "start"]
