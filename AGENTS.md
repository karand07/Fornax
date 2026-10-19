# Project Rules

- **Monorepo Structure**: `/server` (Express + TS + Prisma + Postgres) and `/client` (Vite + React + TS + shadcn + Axios).
- **Validation**: Validate every request body with `zod`. Return errors formatted strictly as `{ error: string }`.
- **Authentication & Authorization**: JWT auth in `Authorization` header (`Bearer <token>`). Roles: `STUDENT`, `TEACHER`, `ADMIN`. Enforce with role-checking middleware.
- **Architecture**: Never put business logic in route files: `routes` -> `controller` -> `service`.
- **Environment & Secrets**: Never commit secrets. Always use `.env` and keep `.env.example` updated.
- **Verification**: After each task: run `tsc --noEmit`, fix errors, and explain how to manually test it.
- **Simplicity**: Keep it simple. No queues, no microservices, no unnecessary abstractions.
- **Workflow**: Build one task at a time. Stop and summarize when done.
