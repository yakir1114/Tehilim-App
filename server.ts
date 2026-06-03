import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("tehillim.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS chapter_states (
    room_id TEXT,
    chapter_number INTEGER,
    status TEXT DEFAULT 'available', -- 'available', 'locked', 'completed'
    locked_by TEXT,
    locked_at DATETIME,
    PRIMARY KEY (room_id, chapter_number)
  );
`);

// Add last_accessed_at column to existing DBs that don't have it yet
try {
  db.exec(`ALTER TABLE rooms ADD COLUMN last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
} catch {
  // Column already exists — ignore
}

// ── Cleanup: delete rooms not accessed in 3 days ──────────────────────────────
function deleteStaleRooms() {
  const result = db.prepare(`
    DELETE FROM rooms
    WHERE last_accessed_at < datetime('now', '-3 days')
  `).run();
  if (result.changes > 0) {
    console.log(`[cleanup] Deleted ${result.changes} stale room(s) older than 3 days`);
  }
}

// Run once on startup, then every 24 hours
deleteStaleRooms();
setInterval(deleteStaleRooms, 24 * 60 * 60 * 1000);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // API Routes
  app.get("/api/room/create", (req, res) => {
    const roomId = Math.random().toString(36).substring(2, 9);
    db.prepare("INSERT INTO rooms (id) VALUES (?)").run(roomId);
    // Initialize chapters for the room
    const insertChapter = db.prepare("INSERT INTO chapter_states (room_id, chapter_number) VALUES (?, ?)");
    for (let i = 1; i <= 150; i++) {
      insertChapter.run(roomId, i);
    }
    res.json({ roomId });
  });

  app.get("/api/rooms/summary", (req, res) => {
    const idsParam = req.query.ids as string;
    if (!idsParam) {
      return res.json([]);
    }
    const ids = idsParam.split(",").filter(Boolean);
    if (ids.length === 0) {
      return res.json([]);
    }

    const placeholders = ids.map(() => "?").join(",");
    const query = `
      SELECT 
        r.id as roomId,
        r.created_at as createdAt,
        COUNT(case when cs.status = 'completed' then 1 end) as completedCount,
        COUNT(case when cs.status = 'locked' then 1 end) as lockedCount,
        COUNT(cs.chapter_number) as totalChapters
      FROM rooms r
      LEFT JOIN chapter_states cs ON r.id = cs.room_id
      WHERE r.id IN (${placeholders})
      GROUP BY r.id
    `;
    try {
      const summaries = db.prepare(query).all(...ids);
      res.json(summaries);
    } catch (error) {
      console.error("Error fetching room summaries:", error);
      res.status(500).json({ error: "Failed to fetch room summaries" });
    }
  });

  app.get("/api/room/:roomId", (req, res) => {
    const { roomId } = req.params;
    const room = db.prepare("SELECT * FROM rooms WHERE id = ?").get(roomId);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    // Update last accessed timestamp
    db.prepare("UPDATE rooms SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = ?").run(roomId);
    const states = db.prepare("SELECT * FROM chapter_states WHERE room_id = ?").all(roomId);
    res.json({ roomId, states });
  });

  // Socket.io logic
  io.on("connection", (socket) => {
    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
      // Update last accessed timestamp on socket join too
      db.prepare("UPDATE rooms SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = ?").run(roomId);
    });

    socket.on("lock-chapter", ({ roomId, chapterNumber, userId }) => {
      const chapter = db.prepare("SELECT * FROM chapter_states WHERE room_id = ? AND chapter_number = ?").get(roomId, chapterNumber);
      
      if (chapter && chapter.status === 'available') {
        db.prepare("UPDATE chapter_states SET status = 'locked', locked_by = ?, locked_at = CURRENT_TIMESTAMP WHERE room_id = ? AND chapter_number = ?")
          .run(userId, roomId, chapterNumber);
        
        io.to(roomId).emit("chapter-updated", {
          chapterNumber,
          status: 'locked',
          lockedBy: userId
        });
      }
    });

    socket.on("unlock-chapter", ({ roomId, chapterNumber }) => {
      db.prepare("UPDATE chapter_states SET status = 'available', locked_by = NULL, locked_at = NULL WHERE room_id = ? AND chapter_number = ?")
        .run(roomId, chapterNumber);
      
      io.to(roomId).emit("chapter-updated", {
        chapterNumber,
        status: 'available',
        lockedBy: null
      });
    });

    socket.on("complete-chapter", ({ roomId, chapterNumber }) => {
      db.prepare("UPDATE chapter_states SET status = 'completed', locked_by = NULL, locked_at = NULL WHERE room_id = ? AND chapter_number = ?")
        .run(roomId, chapterNumber);
      
      io.to(roomId).emit("chapter-updated", {
        chapterNumber,
        status: 'completed',
        lockedBy: null
      });
    });

    socket.on("disconnect", () => {
      // Optional: Auto-unlock chapters if user disconnects? 
      // For now, let's keep it simple as requested.
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
