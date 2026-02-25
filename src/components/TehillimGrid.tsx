import { motion } from "motion/react";
import { Lock, CheckCircle2 } from "lucide-react";

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

export default function TehillimGrid({ chapters, onChapterClick, currentUserId }: Props) {
  return (
    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 md:gap-3">
      {chapters.map((chapter) => {
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
            {chapter.chapter_number}
            
            <div className="absolute top-1 right-1">
              {isCompleted && <CheckCircle2 className="w-3 h-3 md:w-4 h-4" />}
              {isLockedByOther && <Lock className="w-3 h-3 md:w-4 h-4" />}
              {isLockedByMe && <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
