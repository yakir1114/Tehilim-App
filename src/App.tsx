import { BrowserRouter, Routes, Route, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, MouseEvent, Key } from "react";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen, Users, Share2, CheckCircle2, Home,
  Loader2, Trophy, Sparkles, Trash2, Clock, Check, RotateCcw
} from "lucide-react";

// Types
type ChapterStatus = 'available' | 'locked' | 'completed';

interface ChapterState {
  chapter_number: number;
  status: ChapterStatus;
  locked_by?: string;
}

interface RoomSummary {
  roomId: string;
  createdAt: string;
  completedCount: number;
  lockedCount: number;
  totalChapters: number;
}

// Helpers
function getVisitedRooms(): string[] {
  try {
    const stored = localStorage.getItem("tehillim_visited_rooms");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addVisitedRoom(roomId: string) {
  try {
    let list = getVisitedRooms();
    if (!list.includes(roomId)) {
      list = [roomId, ...list];
      localStorage.setItem("tehillim_visited_rooms", JSON.stringify(list));
    }
  } catch (e) {
    console.error(e);
  }
}

function removeVisitedRoom(roomId: string) {
  try {
    let list = getVisitedRooms();
    list = list.filter((id) => id !== roomId);
    localStorage.setItem("tehillim_visited_rooms", JSON.stringify(list));
  } catch (e) {
    console.error(e);
  }
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("he-IL", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

// Components
import TehillimGrid from "./components/TehillimGrid";
import ChapterView from "./components/ChapterView";
import DonationFooter from "./components/DonationFooter";
import ThemeToggle from "./components/ThemeToggle";

// Feather icon (pen nib) — used in branding
function FeatherIcon({ size = 20, color = "var(--accent-text)" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
      <line x1="16" y1="8" x2="2" y2="22" />
      <line x1="17.5" y1="15" x2="9" y2="15" />
    </svg>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div dir="rtl" style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)" }}>
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/room/:roomId" element={<RoomView />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

// ─── Home View ───────────────────────────────────────────────────────────────

function HomeView() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [summaries, setSummaries] = useState<RoomSummary[]>([]);
  const [fetching, setFetching] = useState(false);

  const loadSummaries = async () => {
    const list = getVisitedRooms();
    if (list.length === 0) { setSummaries([]); return; }
    setFetching(true);
    try {
      const res = await fetch(`/api/rooms/summary?ids=${list.join(",")}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSummaries(data.sort((a, b) => list.indexOf(a.roomId) - list.indexOf(b.roomId)));
      }
    } catch (err) {
      console.error("Failed to fetch summaries", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { loadSummaries(); }, []);

  const createRoom = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/room/create");
      const { roomId } = await res.json();
      addVisitedRoom(roomId);
      navigate(`/room/${roomId}`);
    } catch (err) {
      console.error("Failed to create room", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = (id: string) => {
    removeVisitedRoom(id);
    setSummaries(prev => prev.filter(s => s.roomId !== id));
  };

  const hasHistory = summaries.length > 0;
  const activeCount = summaries.filter(s => s.completedCount < s.totalChapters).length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "20px 28px",
      }}>
        {/* RIGHT: branding */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38,
            background: "var(--accent-soft)",
            borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <FeatherIcon size={18} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 18, color: "var(--ink)" }}>תהילים יחד</span>
        </div>
        {/* LEFT: theme toggle */}
        <ThemeToggle />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: "0 28px 28px", maxWidth: 900, margin: "0 auto", width: "100%" }}>
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{
            display: "grid",
            gridTemplateColumns: hasHistory ? "1fr 1.15fr" : "1fr",
            gap: 18,
          }}
          className="home-grid"
        >
          {/* Create Room card */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 26,
            padding: 30,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 22,
            textAlign: "center",
          }}>
            {/* Hero icon */}
            <div style={{
              width: 76, height: 76,
              background: "var(--accent-soft)",
              borderRadius: 22,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <BookOpen size={32} strokeWidth={1.8} color="var(--accent-text)" />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--ink)" }}>
                נקרא יחד
              </h1>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: "var(--ink-soft)" }}>
                קריאת ספר תהילים משותפת בזמן אמת. חלקו את הפרקים בין חברים וסיימו את הספר יחד.
              </p>
            </div>

            <button
              onClick={createRoom}
              disabled={loading}
              style={{
                width: "100%",
                padding: "15px",
                background: "var(--accent)",
                color: "var(--accent-ink)",
                border: "none",
                borderRadius: 18,
                fontSize: 16.5,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 10px 24px var(--complete-shadow)",
                fontFamily: "inherit",
                transition: "opacity 0.18s",
              }}
            >
              {loading
                ? <Loader2 size={20} className="animate-spin" />
                : <Users size={20} />}
              התחלת קריאה חדשה
            </button>

            <p style={{ margin: 0, fontSize: 12, color: "var(--ink-faint)" }}>
              בלחיצה יווצר חדר ייחודי שתוכלו לשתף עם חברים
            </p>
          </div>

          {/* My Rooms card */}
          {hasHistory && (
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 26,
              padding: 30,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 34, height: 34,
                    background: "var(--accent-soft)",
                    borderRadius: 10,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Clock size={16} color="var(--accent-text)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15.5, color: "var(--ink)" }}>החדרים שלי</div>
                    <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>היסטוריית החדרים שבהם השתתפת</div>
                  </div>
                </div>
                <span style={{
                  background: "var(--accent-soft)",
                  color: "var(--accent-text)",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: 999,
                }}>
                  {activeCount} פעילים
                </span>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: "var(--line)" }} />

              {/* Room list */}
              {fetching && summaries.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 12 }}>
                  <Loader2 size={28} color="var(--accent-text)" className="animate-spin" />
                  <p style={{ margin: 0, fontSize: 13, color: "var(--ink-faint)" }}>טוען את החדרים שלך...</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", maxHeight: 360 }}>
                  {summaries.map((room) => {
                    const percentage = room.totalChapters > 0
                      ? Math.round((room.completedCount / room.totalChapters) * 100)
                      : 0;
                    const isDone = percentage === 100;
                    return (
                      <RoomCard
                        key={room.roomId}
                        room={room}
                        percentage={percentage}
                        isDone={isDone}
                        onClick={() => navigate(`/room/${room.roomId}`)}
                        onDelete={(e) => { e.stopPropagation(); handleDeleteRoom(room.roomId); }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      <DonationFooter />

      {/* Responsive grid fix */}
      <style>{`
        @media (max-width: 768px) {
          .home-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function RoomCard({
  room, percentage, isDone, onClick, onDelete,
}: {
  key?: Key;
  room: RoomSummary;
  percentage: number;
  isDone: boolean;
  onClick: () => void | Promise<void>;
  onDelete: (e: MouseEvent<HTMLButtonElement>) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--surface-alt)",
        border: "1px solid var(--line)",
        borderRadius: 18,
        padding: 15,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
        transition: "transform 0.18s ease",
      }}
    >
      {/* Row 1: name + icons */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 15.5, color: "var(--ink)" }}>חדר {room.roomId}</span>
          {isDone && <CheckCircle2 size={15} color="var(--accent-text)" />}
        </div>
        <button
          onClick={onDelete}
          title="הסר מהרשימה"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--ink-faint)",
            padding: "4px",
            display: "flex",
            borderRadius: 6,
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Row 2: chapter count + % */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{room.completedCount} מתוך 150 פרקים</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: isDone ? "var(--accent-text)" : "var(--ink-faint)" }}>
          {percentage}%
        </span>
      </div>

      {/* Row 3: progress bar */}
      <div style={{ height: 7, background: "var(--bg)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${percentage}%`,
          background: "var(--accent)",
          borderRadius: 999,
          transition: "width 0.4s ease",
        }} />
      </div>

      {/* Row 4: timestamp */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--ink-faint)" }}>
        <Clock size={12} />
        <span style={{ fontSize: 11 }}>נוצר ב-{formatDate(room.createdAt)}</span>
      </div>
    </div>
  );
}

// ─── Room View ────────────────────────────────────────────────────────────────

function RoomView() {
  const { roomId } = useParams<{ roomId: string }>();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [chapters, setChapters] = useState<ChapterState[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [userId] = useState(() => Math.random().toString(36).substring(7));
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    fetch(`/api/room/${roomId}`)
      .then(res => res.json())
      .then(data => {
        setChapters(data.states);
        setLoading(false);
        newSocket.emit("join-room", roomId);
        if (roomId) addVisitedRoom(roomId);
      });

    newSocket.on("chapter-updated", ({ chapterNumber, status, lockedBy }) => {
      setChapters(prev => {
        const updated = prev.map(c =>
          c.chapter_number === chapterNumber
            ? { ...c, status, locked_by: lockedBy }
            : c
        );
        if (updated.filter(c => c.status === 'completed').length === 150) {
          setShowCompletionModal(true);
        }
        return updated;
      });
    });

    return () => { newSocket.disconnect(); };
  }, [roomId]);

  const handleChapterClick = (chapterNumber: number) => {
    const chapter = chapters.find(c => c.chapter_number === chapterNumber);
    if (chapter?.status === 'available') {
      socket?.emit("lock-chapter", { roomId, chapterNumber, userId });
      setSelectedChapter(chapterNumber);
    } else if (chapter?.status === 'locked' && chapter.locked_by === userId) {
      setSelectedChapter(chapterNumber);
    }
  };

  const handleFinish = (chapterNumber: number) => {
    socket?.emit("complete-chapter", { roomId, chapterNumber });
    setSelectedChapter(null);
  };

  const handleCancel = (chapterNumber: number) => {
    socket?.emit("unlock-chapter", { roomId, chapterNumber });
    setSelectedChapter(null);
  };

  const copyLink = async () => {
    const baseUrl = process.env.APP_URL || window.location.origin;
    const shareUrl = `${baseUrl}/room/${roomId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'תהילים יחד', text: 'בואו לקרוא תהילים יחד איתי', url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (clipErr) {
        console.error("Clipboard fallback failed", clipErr);
      }
    }
  };

  const completedCount = chapters.filter(c => c.status === 'completed').length;
  const progress = (completedCount / 150) * 100;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <Loader2 size={40} color="var(--accent-text)" className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{
      background: "var(--bg)",
      minHeight: "100vh",
      padding: 28,
      display: "flex",
      flexDirection: "column",
      gap: 18,
      maxWidth: 860,
      margin: "0 auto",
    }}>
      {/* Header card */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 22,
        padding: 18,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
      }}>
        {/* RIGHT: home + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => navigate("/")}
            title="חזרה לדף הבית"
            style={{
              width: 42, height: 42,
              background: "var(--surface-alt)",
              border: "none",
              borderRadius: 13,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Home size={20} color="var(--accent-text)" />
          </button>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "var(--ink)" }}>קריאת תהילים משותפת</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>חדר: {roomId}</div>
          </div>
        </div>

        {/* LEFT: theme toggle + share */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ThemeToggle />
          <button
            onClick={copyLink}
            style={{
              background: "var(--accent-soft)",
              color: "var(--accent-text)",
              border: "none",
              borderRadius: 12,
              padding: "10px 16px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "inherit",
              transition: "opacity 0.18s",
            }}
          >
            {copied ? <Check size={15} /> : <Share2 size={15} />}
            {copied ? "הועתק!" : "שיתוף"}
          </button>
        </div>
      </div>

      {/* Progress card */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 22,
        padding: "18px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <span style={{ fontSize: 30, fontWeight: 800, color: "var(--ink)" }}>{completedCount}</span>
            <span style={{ fontSize: 16, color: "var(--ink-faint)" }}> / 150 פרקים</span>
          </div>
          <span style={{ fontSize: 22, fontWeight: 800, color: "var(--accent-text)" }}>
            {Math.round(progress)}%
          </span>
        </div>

        {/* Progress bar with shimmer */}
        <div style={{ height: 12, background: "var(--surface-alt)", borderRadius: 999, overflow: "hidden", position: "relative" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            style={{ height: "100%", background: "var(--accent)", borderRadius: 999, position: "relative", overflow: "hidden" }}
          >
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.10) 50%, transparent 100%)",
              animation: "shimmer 3.2s ease-in-out infinite",
              width: "60%",
            }} />
          </motion.div>
        </div>
      </div>

      {/* Grid (filter tabs are inside TehillimGrid) */}
      <TehillimGrid
        chapters={chapters}
        onChapterClick={handleChapterClick}
        currentUserId={userId}
      />

      <AnimatePresence mode="wait">
        {selectedChapter && (
          <ChapterView
            key={`chapter-view-${selectedChapter}`}
            chapterNumber={selectedChapter}
            onFinish={() => handleFinish(selectedChapter)}
            onCancel={() => handleCancel(selectedChapter)}
          />
        )}
        {showCompletionModal && (
          <CompletionModal
            key="completion-modal"
            onClose={() => setShowCompletionModal(false)}
            onNewRoom={async () => {
              const res = await fetch("/api/room/create");
              const { roomId: newId } = await res.json();
              navigate(`/room/${newId}`);
              setShowCompletionModal(false);
            }}
            onHome={() => navigate("/")}
          />
        )}
      </AnimatePresence>

      <DonationFooter />
    </div>
  );
}

// ─── Completion Modal ─────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  "var(--accent)", "var(--accent-text)", "var(--mine-line)",
  "oklch(0.75 0.13 80)", "oklch(0.70 0.10 260)",
];

function confettiSeed(i: number, max: number) {
  // simple deterministic pseudo-random using index
  return ((i * 7 + 13) % max);
}

function CompletionModal({
  onClose, onNewRoom, onHome,
}: {
  key?: Key;
  onClose: () => void;
  onNewRoom: () => void | Promise<void>;
  onHome: () => void | Promise<void>;
}) {
  const particles = Array.from({ length: 28 }, (_, i) => {
    const left = ((i * 37 + 11) % 100);
    const delay = confettiSeed(i, 240) / 100;
    const dur = 2.6 + confettiSeed(i + 3, 200) / 100;
    const size = 6 + confettiSeed(i + 1, 8);
    const isRound = i % 3 !== 0;
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    return { left, delay, dur, size, isRound, color };
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        background: "rgba(4,6,10,.66)",
        backdropFilter: "blur(3px)",
      }}
    >
      {/* Confetti */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {particles.map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: -14,
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              background: p.color,
              borderRadius: p.isRound ? "999px" : "2px",
              animation: `confettiFall ${p.dur}s ${p.delay}s linear infinite`,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ scale: 0.8, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 40 }}
        style={{
          background: "var(--surface)",
          borderRadius: 30,
          maxWidth: 480,
          width: "100%",
          boxShadow: "0 30px 80px rgba(0,0,0,.40)",
          overflow: "hidden",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* Top accent bar */}
        <div style={{ width: "100%", height: 5, background: "var(--accent)" }} />

        <div style={{ padding: "44px 36px", display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
          {/* Trophy */}
          <div style={{ position: "relative" }}>
            <div style={{
              width: 96, height: 96,
              background: "var(--accent-soft)",
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 0 8px var(--accent-soft)",
              animation: "trophyFloat 3.4s ease-in-out infinite",
            }}>
              <Trophy size={46} strokeWidth={1.8} color="var(--accent-text)" />
            </div>
            <div style={{ position: "absolute", top: -6, right: -6, animation: "sparklePulse 2s ease-in-out infinite" }}>
              <Sparkles size={20} color="var(--accent-text)" />
            </div>
            <div style={{ position: "absolute", bottom: -6, left: -6, animation: "sparklePulse 2s 0.8s ease-in-out infinite" }}>
              <Sparkles size={16} color="var(--mine-line)" />
            </div>
          </div>

          {/* Text */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 38, fontWeight: 900, color: "var(--ink)" }}>!אשריכם</h2>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 500, lineHeight: 1.6, color: "var(--ink-soft)" }}>
              סיימתם את כל ספר התהילים יחד.<br />
              יהי רצון שיתקבלו התפילות לרצון.
            </p>
          </div>

          {/* Buttons */}
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              onClick={onNewRoom}
              style={{
                width: "100%", padding: "16px",
                background: "var(--accent)", color: "var(--accent-ink)",
                border: "none", borderRadius: 18,
                fontSize: 17, fontWeight: 700,
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                boxShadow: "0 10px 24px var(--complete-shadow)",
                fontFamily: "inherit",
              }}
            >
              <BookOpen size={20} />
              התחלת ספר חדש
            </button>

            <button
              onClick={onHome}
              style={{
                width: "100%", padding: "16px",
                background: "transparent", color: "var(--ink-soft)",
                border: "1px solid var(--line)", borderRadius: 18,
                fontSize: 17, fontWeight: 700,
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                fontFamily: "inherit",
              }}
            >
              <Home size={20} />
              חזרה לדף הבית
            </button>

            <button
              onClick={onClose}
              style={{
                background: "none", border: "none",
                color: "var(--ink-faint)", fontSize: 13,
                cursor: "pointer", padding: "4px",
                fontFamily: "inherit",
              }}
            >
              סגור והישאר בחדר
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
