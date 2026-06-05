import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import { createClient } from "@libsql/client";
import path from "path";

// ── Turso DB client ────────────────────────────────────────────────────────────
const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// ── Initialize tables ─────────────────────────────────────────────────────────
async function initDB() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS chapter_states (
      room_id TEXT,
      chapter_number INTEGER,
      status TEXT DEFAULT 'available',
      locked_by TEXT,
      locked_at DATETIME,
      PRIMARY KEY (room_id, chapter_number)
    );
  `);
}

// ── Cleanup: delete rooms not accessed in 3 days ──────────────────────────────
async function deleteStaleRooms() {
  const result = await db.execute(
    `DELETE FROM rooms WHERE last_accessed_at < datetime('now', '-3 days')`
  );
  if (result.rowsAffected > 0) {
    console.log(`[cleanup] Deleted ${result.rowsAffected} stale room(s) older than 3 days`);
  }
}

async function startServer() {
  await initDB();
  await deleteStaleRooms();
  setInterval(deleteStaleRooms, 24 * 60 * 60 * 1000);

  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: "*" } });

  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // ── REST API ───────────────────────────────────────────────────────────────

  app.get("/api/room/create", async (req, res) => {
    const roomId = Math.random().toString(36).substring(2, 9);
    await db.execute({ sql: "INSERT INTO rooms (id) VALUES (?)", args: [roomId] });

    const stmts = [];
    for (let i = 1; i <= 150; i++) {
      stmts.push({
        sql: "INSERT INTO chapter_states (room_id, chapter_number) VALUES (?, ?)",
        args: [roomId, i],
      });
    }
    await db.batch(stmts);

    res.json({ roomId });
  });

  app.get("/api/rooms/summary", async (req, res) => {
    const idsParam = req.query.ids as string;
    if (!idsParam) return res.json([]);
    const ids = idsParam.split(",").filter(Boolean);
    if (ids.length === 0) return res.json([]);

    const placeholders = ids.map(() => "?").join(",");
    const query = `
      SELECT
        r.id as roomId,
        r.created_at as createdAt,
        COUNT(CASE WHEN cs.status = 'completed' THEN 1 END) as completedCount,
        COUNT(CASE WHEN cs.status = 'locked' THEN 1 END) as lockedCount,
        COUNT(cs.chapter_number) as totalChapters
      FROM rooms r
      LEFT JOIN chapter_states cs ON r.id = cs.room_id
      WHERE r.id IN (${placeholders})
      GROUP BY r.id
    `;
    try {
      const result = await db.execute({ sql: query, args: ids });
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching room summaries:", error);
      res.status(500).json({ error: "Failed to fetch room summaries" });
    }
  });

  app.get("/api/room/:roomId", async (req, res) => {
    const { roomId } = req.params;
    const roomResult = await db.execute({
      sql: "SELECT * FROM rooms WHERE id = ?",
      args: [roomId],
    });
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }
    await db.execute({
      sql: "UPDATE rooms SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [roomId],
    });
    const statesResult = await db.execute({
      sql: "SELECT * FROM chapter_states WHERE room_id = ?",
      args: [roomId],
    });
    res.json({ roomId, states: statesResult.rows });
  });

  // ── Socket.IO ──────────────────────────────────────────────────────────────

  io.on("connection", (socket) => {
    socket.on("join-room", async (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
      await db.execute({
        sql: "UPDATE rooms SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = ?",
        args: [roomId],
      });
    });

    socket.on("lock-chapter", async ({ roomId, chapterNumber, userId }) => {
      const result = await db.execute({
        sql: "SELECT * FROM chapter_states WHERE room_id = ? AND chapter_number = ?",
        args: [roomId, chapterNumber],
      });
      const chapter = result.rows[0];
      if (chapter && chapter.status === "available") {
        await db.execute({
          sql: "UPDATE chapter_states SET status = 'locked', locked_by = ?, locked_at = CURRENT_TIMESTAMP WHERE room_id = ? AND chapter_number = ?",
          args: [userId, roomId, chapterNumber],
        });
        io.to(roomId).emit("chapter-updated", {
          chapterNumber,
          status: "locked",
          lockedBy: userId,
        });
      }
    });

    socket.on("unlock-chapter", async ({ roomId, chapterNumber }) => {
      await db.execute({
        sql: "UPDATE chapter_states SET status = 'available', locked_by = NULL, locked_at = NULL WHERE room_id = ? AND chapter_number = ?",
        args: [roomId, chapterNumber],
      });
      io.to(roomId).emit("chapter-updated", {
        chapterNumber,
        status: "available",
        lockedBy: null,
      });
    });

    socket.on("complete-chapter", async ({ roomId, chapterNumber }) => {
      await db.execute({
        sql: "UPDATE chapter_states SET status = 'completed', locked_by = NULL, locked_at = NULL WHERE room_id = ? AND chapter_number = ?",
        args: [roomId, chapterNumber],
      });
      io.to(roomId).emit("chapter-updated", {
        chapterNumber,
        status: "completed",
        lockedBy: null,
      });
    });

    socket.on("disconnect", () => {
      // Chapters stay locked on disconnect (by design)
    });
  });

  // ── Static / Vite ──────────────────────────────────────────────────────────

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
