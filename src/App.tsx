import { HashRouter , Routes, Route, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, Users, Share2, CheckCircle2, Lock, ChevronRight, Home, Loader2, Trophy, Sparkles, PartyPopper } from "lucide-react";

// Types
type ChapterStatus = 'available' | 'locked' | 'completed';

interface ChapterState {
  chapter_number: number;
  status: ChapterStatus;
  locked_by?: string;
}

export interface RoomHistoryItem {
  roomId: string;
  lastVisited: number;
  status?: 'active' | 'closed';
  progress?: number;
}

// Components
import TehillimGrid from "./components/TehillimGrid";
import ChapterView from "./components/ChapterView";
import RoomHistory from "./components/RoomHistory";

export default function App() {
  return (
    <HashRouter >
      <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans" dir="rtl">
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/room/:roomId" element={<RoomView />} />
        </Routes>
      </div>
    </HashRouter >
  );
}

// Custom hook to manage local history
function useRoomHistory() {
  const [history, setHistory] = useState<RoomHistoryItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('tehillim-history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history");
      }
    }
  }, []);

  const addRoom = (roomId: string) => {
    setHistory(prev => {
      const filtered = prev.filter(item => item.roomId !== roomId);
      const newHistory = [{ roomId, lastVisited: Date.now() }, ...filtered].slice(0, 10); // Keep last 10
      localStorage.setItem('tehillim-history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  return { history, addRoom };
}

function HomeView() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { history } = useRoomHistory();
  const [enrichedHistory, setEnrichedHistory] = useState<RoomHistoryItem[]>([]);

  useEffect(() => {
    // Fetch current status for all rooms in history
    const loadHistoryStatus = async () => {
      if (history.length === 0) return;
      
      const updated = await Promise.all(history.map(async (item) => {
        try {
          const res = await fetch(`/api/room/${item.roomId}`);
          if (res.status === 404) {
             return { ...item, status: 'closed' as const, progress: 100 };
          }
          const data = await res.json();
          if (data && data.states) {
            const completedCount = data.states.filter((s: any) => s.status === 'completed').length;
            const progress = Math.round((completedCount / 150) * 100);
            return { ...item, status: 'active' as const, progress };
          }
          return item;
        } catch {
          return item; // Keep as is if network fails
        }
      }));
      setEnrichedHistory(updated);
    };

    loadHistoryStatus();
  }, [history]);

  const createRoom = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/room/create");
      const { roomId } = await res.json();
      navigate(`/room/${roomId}`);
    } catch (err) {
      console.error("Failed to create room", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8"
      >
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-stone-100 space-y-6">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
            <BookOpen className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-stone-800">תהילים יחד</h1>
          <p className="text-stone-500 text-lg leading-relaxed">
            קריאת ספר תהילים משותפת בזמן אמת. חלקו את הפרקים בין חברים וסיימו את הספר יחד.
          </p>
          
          <div className="space-y-4 pt-4">
            <button
              onClick={createRoom}
              disabled={loading}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-semibold text-lg transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Users className="w-5 h-5" />}
              התחלת קריאה משותפת
            </button>
            
            <p className="text-xs text-stone-400">
              בלחיצה על הכפתור יווצר חדר קריאה ייחודי שתוכלו לשתף
            </p>
          </div>
        </div>

        {enrichedHistory.length > 0 && (
          <RoomHistory rooms={enrichedHistory} onNavigate={(roomId) => navigate(`/room/${roomId}`)} />
        )}
      </motion.div>
    </div>
  );
}

function RoomView() {
  const { roomId } = useParams<{ roomId: string }>();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [chapters, setChapters] = useState<ChapterState[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [userId] = useState(() => crypto.randomUUID());
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const navigate = useNavigate();
  const { addRoom } = useRoomHistory();

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    fetch(`/api/room/${roomId}`)
      .then(res => res.json())
      .then(data => {
        if (data.closed) {
          alert("This room has been closed because the entire Tehillim book was finished or expired!");
          navigate("/");
          return;
        }
        setChapters(data.states);
        setLoading(false);
        newSocket.emit("join-room", roomId);
        if (roomId) addRoom(roomId);
      })
      .catch(() => {
        navigate("/");
      });

    newSocket.on("chapter-updated", ({ chapterNumber, status, lockedBy }) => {
      setChapters(prev => {
        const updated = prev.map(c => 
          c.chapter_number === chapterNumber 
            ? { ...c, status, locked_by: lockedBy } 
            : c
        );
        
        // Check if all are completed
        const completedCount = updated.filter(c => c.status === 'completed').length;
        if (completedCount === 150) {
          setShowCompletionModal(true);
        }
        
        return updated;
      });
    });

    newSocket.on("room-deleted", () => {
      // If a user gets this event, it means someone else deleted the completed room
      alert("This room has been closed because the entire Tehillim book was finished!");
      navigate("/");
    });

    return () => {
      newSocket.disconnect();
    };
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
        await navigator.share({
          title: 'תהילים יחד',
          text: 'בואו לקרוא תהילים יחד איתי',
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error("Failed to share", err);
      // Fallback to clipboard if share fails or is cancelled
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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
        <div className="flex items-start gap-8">
          <button
            onClick={() => navigate("/")}
            title="חזרה לדף הבית"
            className="mt-1 p-2  text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors shrink-0"
          >
            <Home className="w-6 h-6" />
          </button>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-emerald-600" />
              קריאת תהילים משותפת
            </h2>
            <p className="text-stone-500 text-sm">חדר: {roomId}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-left md:text-right ml-4">
            <div className="text-sm font-medium text-stone-400">התקדמות</div>
            <div className="text-xl font-bold text-emerald-600">{completedCount}/150</div>
          </div>
          <button 
            onClick={copyLink}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium ${
              copied 
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            {copied ? <CheckCircle2 className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            {copied ? 'הועתק!' : 'שיתוף'}
          </button>
        </div>
      </header>

      <div className="space-y-2">
        <div className="flex justify-between items-end px-1">
          <span className="text-sm font-bold text-emerald-600">{Math.round(progress)}%</span>
          <span className="text-xs text-stone-400 font-medium">הושלם</span>
        </div>
        <div className="w-full bg-stone-100 h-3 rounded-full overflow-hidden shadow-inner">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="bg-emerald-500 h-full relative"
          >
            <motion.div 
              animate={{ x: ["0%", "100%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-1/2"
            />
          </motion.div>
        </div>
      </div>

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
              socket?.emit("delete-room", roomId);
              const res = await fetch("/api/room/create");
              const { roomId: newRoomId } = await res.json();
              navigate(`/room/${newRoomId}`);
              setShowCompletionModal(false);
            }}
            onHome={() => {
              socket?.emit("delete-room", roomId);
              navigate("/");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CompletionModal({ onClose, onNewRoom, onHome, key }: { onClose: () => void; onNewRoom: () => void; onHome: () => void; key?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.8, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 40 }}
        className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden text-center p-10 space-y-8 relative"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400" />
        
        <div className="relative">
          <motion.div 
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Trophy className="w-12 h-12 text-emerald-600" />
          </motion.div>
          
          <div className="absolute -top-2 -right-2">
            <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
          </div>
          <div className="absolute -bottom-2 -left-2">
            <PartyPopper className="w-8 h-8 text-emerald-400 animate-bounce" />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-4xl font-black text-stone-800 tracking-tight">אשריכם!</h2>
          <p className="text-xl text-stone-500 font-medium leading-relaxed">
            סיימתם את כל ספר התהילים יחד. <br />
            יהי רצון שיתקבלו התפילות לרצון.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 pt-4">
          <button
            onClick={onNewRoom}
            className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xl shadow-xl shadow-emerald-100 transition-all flex items-center justify-center gap-3 group"
          >
            <BookOpen className="w-6 h-6 group-hover:scale-110 transition-transform" />
            התחלת ספר חדש
          </button>
          
          <button
            onClick={onHome}
            className="w-full py-5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl font-bold text-xl transition-all flex items-center justify-center gap-3"
          >
            <Home className="w-6 h-6" />
            חזרה לדף הבית
          </button>
          
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 font-medium text-sm transition-colors"
          >
            סגור והישאר בחדר
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
