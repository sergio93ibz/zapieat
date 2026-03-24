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
# DATABASE_URL ficticia para que prisma generate y next build no fallen en build time.
# La URL real se inyecta en tiempo de ejecución via docker-compose.
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
RUN npx prisma generate
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

# Con output: "standalone", Next.js genera una carpeta .next/standalone
# que incluye solo lo necesario para producción
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000

# Ejecutar prisma db push pasando DATABASE_URL directamente, luego arrancar la app
CMD ["sh", "-c", "DATABASE_URL=$DATABASE_URL npx prisma db push --schema=prisma/schema.prisma && node server.js"]
