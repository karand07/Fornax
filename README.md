# Fornax

Academic LMS platform with AI-assisted handwritten grading, explainable assessment reviews, and attendance verification.

## Architecture

- **Backend**: `/server` (Express + TypeScript + Prisma + PostgreSQL)
- **Frontend**: `/client` (React + Vite + TypeScript + Tailwind CSS + shadcn/ui)

## Environment Variables

Key variables in `server/.env`:
- `DATABASE_URL`: PostgreSQL connection string.
- `JWT_SECRET`: Secret key for JWT authentication.
- `ANTHROPIC_API_KEY`: API key for Claude vision & LLM services.
- `SCAN_DIR`: Directory where uploaded handwritten scans are saved (default: `./storage/scans`).
- `MAX_SCAN_MB`: Max upload size for handwritten scan images in MB (default: `5`).

## Docker Storage Volumes

When deploying with Docker, mount a persistent volume for handwritten answer scans:

```yaml
services:
  server:
    volumes:
      - scan_storage:/app/storage/scans

volumes:
  scan_storage:
```
This ensures student scans remain persisted across container rebuilds and restarts.
