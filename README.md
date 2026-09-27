# Zero Drop

A secure paste service with client-side encryption for text sharing.

## Features

- Client-side encryption with AES-256-GCM
- Optional password protection using PBKDF2
- Expiration time and view limits
- No plaintext or password stored on the server
- Rate limiting and security headers
- Automatic cleanup of expired drops

## How It Works

```text
User
  │
  │ plaintext
  ▼
Browser
  │
  ├── AES-256-GCM encryption
  │
  ├── encryption key ───────────────► URL fragment
  │                                    (#xYz...)
  │
  ├── ciphertext
  ├── IV
  ├── optional KDF salt
  └── hashed consume token
              │
              ▼
           FastAPI
              │
              ▼
          PostgreSQL
```

For regular drops, the encryption key is kept in the URL fragment and never sent to the server.

For password-protected drops, the password is used locally to derive the encryption key. The password itself is never sent to the server.

## Stack

- FastAPI
- PostgreSQL
- Vue 3
- TypeScript
- Tailwind CSS

## Development

### Environment

Create `.env` in the project root:

```env
POSTGRES_PASSWORD=
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql+asyncpg://zero_drop:your_password@localhost:5432/zero_drop
MAX_DROP_SIZE_BYTES=
```

### Run

```bash
# Start PostgreSQL
docker compose up -d

# Backend
cd backend
uv sync
uv run alembic upgrade head
uv run fastapi dev

# Frontend
cd frontend
pnpm install
pnpm dev
```
