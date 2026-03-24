# ZapiEat

Fullstack Next.js (App Router) + Prisma/Postgres + Redis.

## Local (Node)

1) Create `.env` from `.env.example`.
2) Install and run:

```bash
npm install
npm run db:push
npm run dev
```

Open `http://localhost:3000`.

## Local (Docker)

1) Create `.env` from `.env.example`.
2) Start stack:

```bash
docker compose up --build
```

App: `http://localhost:3000`
Postgres: `localhost:5432`
Redis: `localhost:6379`

Healthcheck: `http://localhost:3000/api/health`

Notes:
- Docker compose runs `npx prisma db push` on container start.
- Email via Resend is best-effort and is disabled if `RESEND_API_KEY` / `RESEND_FROM` are missing.
