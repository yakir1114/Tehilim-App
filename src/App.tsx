import { BrowserRouter, Routes, Route, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, Users, Share2, CheckCircle2, Lock, ChevronRight, Home, Loader2, Trophy, Sparkles, PartyPopper, Trash2, Clock } from "lucide-react";

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

// Helper functions for localStorage tracking
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

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans" dir="rtl">
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/room/:roomId" element={<RoomView />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function HomeView() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [summaries, setSummaries] = useState<RoomSummary[]>([]);
  const [fetching, setFetching] = useState(false);

  const loadSummaries = async () => {
    const list = getVisitedRooms();
    if (list.length === 0) {
      setSummaries([]);
      return;
    }
    setFetching(true);
    try {
      const res = await fetch(`/api/rooms/summary?ids=${list.join(",")}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        // Sort summaries according to the order in the list (most recent first)
        const sorted = data.sort((a, b) => {
          return list.indexOf(a.roomId) - list.indexOf(b.roomId);
        });
        setSummaries(sorted);
      }
    } catch (err) {
      console.error("Failed to fetch summaries", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadSummaries();
  }, []);

  const createRoom = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/room/create");
      const { roomId } = await res.json();
      // Add to history right away
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

  const hasHistory = getVisitedRooms().length > 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-[#FDFCFB]">
      <motion.div 
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`w-full ${hasHistory ? "max-w-5xl" : "max-w-md"} space-y-8`}
      >
        <div className={`${hasHistory ? "grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch" : "block"}`}>
          
          {/* Create Room Card */}
          <div className={`${hasHistory ? "md:col-span-12 lg:col-span-5" : "w-full"} bg-white p-8 rounded-3xl shadow-xl border border-stone-100 flex flex-col justify-between space-y-6 text-center`}>
            <div className="space-y-6 my-auto py-4">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                <BookOpen className="w-10 h-10 text-emerald-600" />
              </div>
              <div className="space-y-2">
                <h1 className="text-4xl font-extrabold tracking-tight text-stone-800">תהילים יחד</h1>
                <p className="text-stone-500 text-base leading-relaxed">
                  קריאת ספר תהילים משותפת בזמן אמת. חלקו את הפרקים בין חברים וסיימו את הספר יחד.
                </p>
              </div>
              
              <div className="space-y-4 pt-4">
                <button
                  onClick={createRoom}
                  disabled={loading}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-lg transition-all shadow-lg hover:shadow-emerald-100 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Users className="w-5 h-5" />}
                  התחלת קריאה משותפת
                </button>
                
                <p className="text-xs text-stone-400">
                  בלחיצה על הכפתור יווצר חדר קריאה ייחודי שתוכלו לשתף
                </p>
              </div>
            </div>
          </div>

          {/* Active Rooms Side-Pane */}
          {hasHistory && (
            <div className="md:col-span-12 lg:col-span-7 bg-white p-8 rounded-3xl shadow-xl border border-stone-100 flex flex-col justify-start space-y-6">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-bold text-stone-800">החדרים שלי</h2>
                    <p className="text-xs text-stone-400">היסטוריית החדרים שבהם השתתפת</p>
                  </div>
                </div>
                <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
                  {summaries.length} חדרים פעילים
                </span>
              </div>

              {fetching && summaries.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-3">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                  <p className="text-stone-400 text-sm font-medium">טוען את החדרים שלך...</p>
                </div>
              ) : summaries.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-2">
                  <p className="text-stone-500 font-medium">לא נמצאו חדרים פעילים</p>
                  <p className="text-stone-400 text-xs">ברגע שתצטרפו או תפתחו חדר, הוא יופיע כאן</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto max-h-[380px] space-y-4 pr-1 pl-1 scrollbar-thin">
                  {summaries.map((room) => {
                    const percentage = room.totalChapters > 0 
                      ? Math.round((room.completedCount / room.totalChapters) * 100) 
                      : 0;

                    return (
                      <div
                        key={room.roomId}
                        onClick={() => navigate(`/room/${room.roomId}`)}
                        className="relative p-5 bg-stone-50/50 hover:bg-emerald-50/10 rounded-2xl border border-stone-200/50 hover:border-emerald-200/50 transition-all text-right flex flex-col gap-3 group cursor-pointer duration-200"
                      >
                        {/* Title of Room & Delete */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-stone-800 text-lg group-hover:text-emerald-700 transition-colors">
                              חדר {room.roomId}
                            </span>
                            <span className="text-xs text-stone-400 font-semibold bg-stone-100/80 rounded-md px-2 py-0.5">
                              {percentage}% הושלם
                            </span>
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRoom(room.roomId);
                            }}
                            className="p-1.5 hover:bg-rose-50 hover:text-rose-600 text-stone-400 rounded-lg transition-all cursor-pointer"
                            title="הסר מהרשימה"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Creation Date Status Line */}
                        <div className="flex items-center gap-1.5 text-stone-400 text-xs text-right">
                          <Clock className="w-3.5 h-3.5" />
                          <span>נוצר ב-{formatDate(room.createdAt)}</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-semibold text-stone-500">
                            <span>הושלמו {room.completedCount} מתוך {room.totalChapters} פרקים</span>
                            <span className="text-emerald-600 font-bold">{percentage}%</span>
                          </div>
                          <div className="w-full bg-stone-200/50 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-full rounded-full transition-all duration-350"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>

                        {/* Hover hint arrow */}
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 text-emerald-600">
                          <ChevronRight className="w-5 h-5 rotate-180" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
}

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
        if (roomId) {
          addVisitedRoom(roomId);
        }
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
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="p-3 hover:bg-stone-100 rounded-2xl transition-all text-stone-500 hover:text-stone-800 flex items-center justify-center border border-stone-200/60 bg-white shadow-xs cursor-pointer"
            title="חזרה לדף הבית"
          >
            <Home className="w-5 h-5" />
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
              const res = await fetch("/api/room/create");
              const { roomId } = await res.json();
              navigate(`/room/${roomId}`);
              setShowCompletionModal(false);
            }}
            onHome={() => navigate("/")}
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
