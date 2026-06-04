# CLAUDE.md — Tehilim App

## Project Overview

**תהילים יחד** is a real-time collaborative Tehilim (Psalms) reading web application. It allows groups of people to collectively complete all 150 chapters of Psalms together — each person takes a chapter, reads it, and marks it as done. Everyone sees live progress on screen with no duplicates and no registration required.

Live deployment: https://tehilim-app.onrender.com/

---

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Frontend   | React 19, React Router v7, TypeScript, Tailwind CSS v4, Motion |
| Backend    | Node.js, Express, Socket.IO                     |
| Database   | SQLite via `better-sqlite3`                     |
| Dev server | Vite 6 (via middleware in dev mode)             |
| Runtime    | `tsx` for running TypeScript directly           |
| AI         | `@google/genai` (Gemini) — optional integration |

---

## Project Structure

```
Tehilim-App/
├── server.ts          # Express + Socket.IO server (entry point)
├── src/               # React frontend (components, pages, hooks)
├── index.html         # Vite HTML entry
├── vite.config.ts     # Vite configuration
├── tsconfig.json      # TypeScript config
├── package.json       # Dependencies and scripts
├── metadata.json      # App metadata
├── .env.example       # Environment variable template
└── tehillim.db        # SQLite database (auto-created at runtime)
```

---

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs server.ts with tsx, Vite in middleware mode)
npm run dev

# Build frontend for production
npm run build

# Preview production build
npm run preview

# Type-check without emitting files
npm run lint

# Clean build output
npm run clean
```

The dev server runs on **http://localhost:3000**.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
GEMINI_API_KEY="your-gemini-api-key"   # Required if using Gemini AI features
APP_URL="http://localhost:3000"         # App base URL
```

Set `NODE_ENV=production` to switch from Vite middleware mode to serving the static `dist/` build.

---

## Architecture

### Server (`server.ts`)

The server is a single file combining:

- **Express REST API** — room creation, room state, room summaries
- **Socket.IO** — real-time chapter state synchronization across all connected clients
- **SQLite** — persistent storage of rooms and chapter states

**Database schema:**

```sql
-- Rooms table
CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Chapter states per room
CREATE TABLE chapter_states (
  room_id TEXT,
  chapter_number INTEGER,          -- 1–150
  status TEXT DEFAULT 'available', -- 'available' | 'locked' | 'completed'
  locked_by TEXT,
  locked_at DATETIME,
  PRIMARY KEY (room_id, chapter_number)
);
```

### REST API Endpoints

| Method | Path                    | Description                                         |
|--------|-------------------------|-----------------------------------------------------|
| GET    | `/api/room/create`      | Creates a new room, returns `{ roomId }`            |
| GET    | `/api/room/:roomId`     | Returns room details and all 150 chapter states     |
| GET    | `/api/rooms/summary`    | Batch summary for multiple rooms (query: `?ids=...`)|

### Socket.IO Events

**Client → Server:**

| Event             | Payload                              | Description                          |
|-------------------|--------------------------------------|--------------------------------------|
| `join-room`       | `roomId`                             | Join a room's socket room            |
| `lock-chapter`    | `{ roomId, chapterNumber, userId }`  | Lock a chapter (mark as being read)  |
| `unlock-chapter`  | `{ roomId, chapterNumber }`          | Release a chapter back to available  |
| `complete-chapter`| `{ roomId, chapterNumber }`          | Mark a chapter as completed          |

**Server → Client:**

| Event              | Payload                                        | Description              |
|--------------------|------------------------------------------------|--------------------------|
| `chapter-updated`  | `{ chapterNumber, status, lockedBy }`          | Broadcast state changes  |

---

## Key Design Decisions

- **No authentication** — Users are anonymous; `userId` is a client-generated identifier (stored in `localStorage` on the frontend).
- **No auto-unlock on disconnect** — Chapters stay locked if a user disconnects. This was a deliberate simplicity choice.
- **Optimistic locking** — `lock-chapter` only succeeds server-side if the chapter is currently `available`; the server is the source of truth.
- **Vite as middleware** — In development, Vite runs inside the Express process so both API and frontend are served from one port (3000).
- **SQLite for simplicity** — No external database needed; `tehillim.db` is created automatically on first run.

---

## Common Gotchas

- The database file `tehillim.db` is created at the project root when the server first starts. It is gitignored.
- Room IDs are short random alphanumeric strings (7 characters). There is no collision check — acceptable for the expected scale.
- The `@google/genai` package is a dependency but Gemini may not be actively used in the core flow. Check `src/` for any AI-related usage before modifying.
- Tailwind CSS v4 is used — syntax and configuration differ from v3. Use the `@tailwindcss/vite` plugin, not the PostCSS plugin.

---

## Deployment

The app is deployed on **Render** (`tehilim-app.onrender.com`). For production:

1. Run `npm run build` to produce `dist/`
2. Start with `NODE_ENV=production tsx server.ts`
3. Set environment variables (`GEMINI_API_KEY`, `APP_URL`) in the hosting environment

The server will serve the static `dist/` folder and handle all API/socket routes.