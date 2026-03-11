import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const db = new Database("tehillim.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

// Migration for existing databases
try {
  db.exec("ALTER TABLE rooms ADD COLUMN last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP");
} catch (e) {
  // Column already exists, safe to ignore
}

async function startServer() {
  const app = express();
  
  // Security middlewares
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled for Vite Dev Server compatibility
    crossOriginEmbedderPolicy: false,
  }));
  
  // Rate limiting for API routes to prevent DoS/brute-force
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window`
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." }
  });
  
  // Apply the rate limiting middleware to API calls only
  app.use("/api/", apiLimiter);

  const httpServer = createServer(app);
  
  // Hardened CORS config
  const allowedOrigins = process.env.NODE_ENV === "production" 
    ? [process.env.APP_URL || ""] // In production, restrict to your specific domain
    : "*"; // During local dev, allow all

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"]
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

  app.get("/api/room/:roomId", (req, res) => {
    const { roomId } = req.params;
    const room = db.prepare("SELECT * FROM rooms WHERE id = ?").get(roomId);
    if (!room) {
      // Room was either manually deleted or TTL expired.
      return res.status(404).json({ error: "Room not found", closed: true });
    }
    const states = db.prepare("SELECT * FROM chapter_states WHERE room_id = ?").all(roomId);
    res.json({ roomId, states });
  });

  // Socket.io logic
  io.on("connection", (socket) => {
    socket.on("join-room", (roomId) => {
      if (typeof roomId !== 'string' || roomId.length > 50) return; // Validation
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on("lock-chapter", ({ roomId, chapterNumber, userId }) => {
      // Input Validation
      if (typeof roomId !== 'string' || typeof userId !== 'string' || typeof chapterNumber !== 'number') return;
      if (chapterNumber < 1 || chapterNumber > 150) return;

      const chapter = db.prepare("SELECT * FROM chapter_states WHERE room_id = ? AND chapter_number = ?").get(roomId, chapterNumber);
      
      if (chapter && chapter.status === 'available') {
        db.prepare("UPDATE chapter_states SET status = 'locked', locked_by = ?, locked_at = CURRENT_TIMESTAMP WHERE room_id = ? AND chapter_number = ?")
          .run(userId, roomId, chapterNumber);
        
        // Update room activity
        db.prepare("UPDATE rooms SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?").run(roomId);
        
        io.to(roomId).emit("chapter-updated", {
          chapterNumber,
          status: 'locked',
          lockedBy: userId
        });
      }
    });

    socket.on("unlock-chapter", ({ roomId, chapterNumber }) => {
      if (typeof roomId !== 'string' || typeof chapterNumber !== 'number') return;
      if (chapterNumber < 1 || chapterNumber > 150) return;

      db.prepare("UPDATE chapter_states SET status = 'available', locked_by = NULL, locked_at = NULL WHERE room_id = ? AND chapter_number = ?")
        .run(roomId, chapterNumber);
      
      // Update room activity
      db.prepare("UPDATE rooms SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?").run(roomId);
      
      io.to(roomId).emit("chapter-updated", {
        chapterNumber,
        status: 'available',
        lockedBy: null
      });
    });

    socket.on("complete-chapter", ({ roomId, chapterNumber }) => {
      if (typeof roomId !== 'string' || typeof chapterNumber !== 'number') return;
      if (chapterNumber < 1 || chapterNumber > 150) return;

      db.prepare("UPDATE chapter_states SET status = 'completed', locked_by = NULL, locked_at = NULL WHERE room_id = ? AND chapter_number = ?")
        .run(roomId, chapterNumber);
      
      // Update room activity
      db.prepare("UPDATE rooms SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?").run(roomId);
      
      io.to(roomId).emit("chapter-updated", {
        chapterNumber,
        status: 'completed',
        lockedBy: null
      });
    });

    socket.on("delete-room", (roomId) => {
      // Validate that the room string exists and is properly formatted
      if (typeof roomId !== 'string' || roomId.length > 50) return;

      // Delete from DB completely
      db.prepare("DELETE FROM chapter_states WHERE room_id = ?").run(roomId);
      db.prepare("DELETE FROM rooms WHERE id = ?").run(roomId);
      
      // Let everyone know it's destroyed, including the person who clicked it
      io.to(roomId).emit("room-deleted");
    });

    socket.on("disconnect", () => {
      // Optional: Auto-unlock chapters if user disconnects? 
      // For now, let's keep it simple as requested.
    });
  });

  // Background Cleanup Job (Runs every 1 hour)
  setInterval(() => {
    try {
      // Delete chapters belonging to inactive rooms first, then the rooms themselves
      const result = db.exec(`
        DELETE FROM chapter_states WHERE room_id IN (
          SELECT id FROM rooms WHERE last_active_at <= datetime('now', '-24 hours')
        );
        DELETE FROM rooms WHERE last_active_at <= datetime('now', '-24 hours');
      `);
      // Since db.exec() doesn't return rows changed directly, we assume silent success.
    } catch (err) {
      console.error("Scheduled cleanup failed:", err);
    }
  }, 1000 * 60 * 60);

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
