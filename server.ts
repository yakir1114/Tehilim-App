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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

  app.get("/api/room/:roomId", (req, res) => {
    const { roomId } = req.params;
    const room = db.prepare("SELECT * FROM rooms WHERE id = ?").get(roomId);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    const states = db.prepare("SELECT * FROM chapter_states WHERE room_id = ?").all(roomId);
    res.json({ roomId, states });
  });

  // Socket.io logic
  io.on("connection", (socket) => {
    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
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
