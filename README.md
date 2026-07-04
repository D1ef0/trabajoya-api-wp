# trabajoya-api-wp

Agente WhatsApp con NestJS, Zavu, PostgreSQL, Redis y BullMQ.

## Requisitos

- Node.js 22+
- pnpm
- Docker (Postgres + Redis)

## Setup local

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres redis
pnpm exec prisma migrate deploy
pnpm run start:dev
```

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/webhooks/zavu` | Webhook entrante de Zavu |
| GET | `/health` | Health check (Postgres + Redis) |

## Deploy

```bash
docker compose up -d
```

Variables requeridas: `DATABASE_URL`, `REDIS_HOST`, `ZAVUDEV_API_KEY`, `ZAVU_WEBHOOK_SECRET`.
