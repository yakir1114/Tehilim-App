import { useState } from "react";
import { motion } from "motion/react";
import { Lock, CheckCircle2 } from "lucide-react";
import { getHebrewGematria } from "../lib/gematria";

interface ChapterState {
  chapter_number: number;
  status: 'available' | 'locked' | 'completed';
  locked_by?: string;
}

interface Props {
  chapters: ChapterState[];
  onChapterClick: (num: number) => void;
  currentUserId: string;
}

type FilterMode = 'all' | 'days' | 'books';

const DAYS = [
  { label: "ראשון", range: [1, 29] },
  { label: "שני",   range: [30, 50] },
  { label: "שלישי", range: [51, 72] },
  { label: "רביעי", range: [73, 89] },
  { label: "חמישי", range: [90, 106] },
  { label: "שישי",  range: [107, 119] },
  { label: "שבת",   range: [120, 150] },
] as const;

const BOOKS = [
  { label: "ספר א", range: [1, 41] },
  { label: "ספר ב", range: [42, 72] },
  { label: "ספר ג", range: [73, 89] },
  { label: "ספר ד", range: [90, 106] },
  { label: "ספר ה", range: [107, 150] },
] as const;

export default function TehillimGrid({ chapters, onChapterClick, currentUserId }: Props) {
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedGroup, setSelectedGroup] = useState<number>(0);

  const groups = filterMode === 'days' ? DAYS : filterMode === 'books' ? BOOKS : null;
  const activeRange = groups ? groups[selectedGroup].range : null;

  const visibleChapters = activeRange
    ? chapters.filter(c => c.chapter_number >= activeRange[0] && c.chapter_number <= activeRange[1])
    : chapters;

  const handleModeChange = (mode: FilterMode) => {
    setFilterMode(mode);
    setSelectedGroup(0);
  };

  return (
    <div className="space-y-4">
      {/* Filter mode tabs */}
      <div className="flex gap-2 bg-stone-100 p-1 rounded-2xl w-fit mx-auto">
        {([['all', 'הכל'], ['days', 'לפי יום'], ['books', 'לפי ספר']] as [FilterMode, string][]).map(([mode, label]) => (
          <button
            key={mode}
            onClick={() => handleModeChange(mode)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              filterMode === mode
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Group selector */}
      {groups && (
        <div className="flex flex-wrap gap-2 justify-center">
          {groups.map((group, i) => (
            <button
              key={i}
              onClick={() => setSelectedGroup(i)}
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all cursor-pointer border ${
                selectedGroup === i
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-emerald-300 hover:text-emerald-700'
              }`}
            >
              {group.label}
              <span className="mr-1.5 text-xs opacity-70">
                ({getHebrewGematria(group.range[0])}–{getHebrewGematria(group.range[1])})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 md:gap-3">
        {visibleChapters.map((chapter) => {
          const isLockedByMe = chapter.status === 'locked' && chapter.locked_by === currentUserId;
          const isLockedByOther = chapter.status === 'locked' && chapter.locked_by !== currentUserId;
          const isCompleted = chapter.status === 'completed';

          return (
            <motion.button
              key={chapter.chapter_number}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onChapterClick(chapter.chapter_number)}
              disabled={isLockedByOther}
              className={`
                relative aspect-square flex flex-col items-center justify-center rounded-xl md:rounded-2xl text-sm md:text-base font-bold transition-all border-2
                ${isCompleted
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100'
                  : isLockedByMe
                  ? 'bg-amber-100 border-amber-400 text-amber-700 shadow-lg shadow-amber-50'
                  : isLockedByOther
                  ? 'bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed'
                  : 'bg-white border-stone-100 text-stone-600 hover:border-emerald-200 hover:bg-emerald-50 shadow-sm'}
              `}
            >
              {getHebrewGematria(chapter.chapter_number)}

              <div className="absolute top-1 right-1">
                {isCompleted && <CheckCircle2 className="w-3 h-3 md:w-4 h-4" />}
                {isLockedByOther && <Lock className="w-3 h-3 md:w-4 h-4" />}
                {isLockedByMe && <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
