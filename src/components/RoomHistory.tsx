import { CheckCircle2, ChevronRight } from "lucide-react";
import { RoomHistoryItem } from "../App";

interface Props {
  rooms: RoomHistoryItem[];
  onNavigate: (roomId: string) => void;
}

export default function RoomHistory({ rooms, onNavigate }: Props) {
  if (rooms.length === 0) return null;

  return (
    <div className="bg-white/60 p-6 rounded-3xl shadow-sm border border-stone-100/50 space-y-4 text-right">
      <h3 className="text-lg font-bold text-stone-700 mb-2 px-2">החדרים האחרונים שלי</h3>
      
      {/* Scrollable Container with custom styling */}
      <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-stone-200 scrollbar-track-transparent">
        {rooms.map((room) => (
          <button
            key={room.roomId}
            onClick={() => room.status === 'active' ? onNavigate(room.roomId) : null}
            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
              room.status === 'active' 
                ? 'bg-white border-stone-200 hover:border-emerald-300 hover:shadow-md cursor-pointer' 
                : 'bg-stone-50 border-stone-100 opacity-70 cursor-default'
            }`}
          >
            <div className="flex flex-col items-start gap-1">
              <span className="font-bold text-stone-800">חדר: {room.roomId}</span>
              <span className="text-xs text-stone-400 font-medium">
                {new Date(room.lastVisited).toLocaleDateString('he-IL')}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              {room.status === 'closed' ? (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                  <CheckCircle2 className="w-3 h-3" />
                  הושלם ונסגר
                </span>
              ) : (
                <>
                  <div className="text-left hidden sm:block">
                    <div className="w-20 bg-stone-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${room.progress || 0}%` }} />
                    </div>
                  </div>
                  <span className="font-bold text-emerald-600 text-sm w-10 text-center text-left" dir="ltr">{room.progress}%</span>
                  <ChevronRight className="w-5 h-5 text-stone-400" />
                </>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
