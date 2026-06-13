# Brama Backend

Node.js, Express, and TypeScript API for Brama.

## Scripts

- `npm run dev` starts the API in watch mode.
- `npm run build` compiles TypeScript to `dist/`.
- `npm run start` runs the compiled server.
- `npm run lint` checks source files with ESLint.
- `npm run typecheck` runs TypeScript without emitting files.

## Environment

Copy `.env.example` to `.env` for local development.

```sh
cp .env.example .env
```

The default API URL is `http://localhost:4000`.

## Architecture

- `src/server.ts` starts the HTTP server and handles shutdown signals.
- `src/app.ts` composes Express middleware and route modules.
- `src/config/` validates environment variables with Zod.
- `src/schemas/` stores shared Zod schemas and inferred TypeScript types.
- `src/validators/` contains reusable request validation middleware.
- `src/routes/` maps URL paths to validators and controllers.
- `src/controllers/` translates HTTP requests into service calls.
- `src/services/` owns business logic, Ollama calls, and SQLite persistence.

## Chat API

- `POST /api/chat` streams assistant responses as `text/plain`.
- `POST /api/reset` clears one conversation.
- `GET /api/history/:id` returns the last stored conversation messages.

Chat history is stored in SQLite at `CHAT_DATABASE_PATH`. The default local path is
`./data/chats.db`; production can set it to `/opt/lublin-assistant/chats.db` to match
the previous standalone server.
