# Zero Drop 

A secure paste service with client-side encryption for text sharing.

## Features

- Client-side encryption with AES-256-GCM (No plaintext or password stored on the server)
- Expiration time and view limits
- Optional password protection using PBKDF2 with live strength checker
- Markdown support with XSS sanitization
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

### 1. Environment Setup

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Set environment variables.

### 2. Start Database

```bash
docker compose up -d
```

### 3. Backend

```bash
cd backend
uv sync

# Backend (create test database once if not present)
docker exec zero-drop-db createdb -U zero_drop zero_drop_test
uv run pytest

uv run alembic upgrade head
uv run fastapi dev
```

### 4. Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

## License

This project is licensed under the [MIT License](LICENSE).
