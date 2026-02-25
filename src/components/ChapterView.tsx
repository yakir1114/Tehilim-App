import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { X, Check, RotateCcw, Loader2, ChevronRight, ChevronLeft } from "lucide-react";

interface Props {
  chapterNumber: number;
  onFinish: () => void;
  onCancel: () => void;
  key?: string;
}

export default function ChapterView({ chapterNumber, onFinish, onCancel }: Props) {
  const [text, setText] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`https://www.sefaria.org/api/texts/Psalms.${chapterNumber}?context=0&commentary=0`)
      .then(res => res.json())
      .then(data => {
        // Sefaria returns hebrew text in 'he' field
        setText(Array.isArray(data.he) ? data.he : [data.he]);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch tehillim text", err);
        setLoading(false);
      });
  }, [chapterNumber]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-bottom border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-4">
            <button 
              onClick={onCancel}
              className="p-2 hover:bg-stone-200 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-stone-500" />
            </button>
            <h3 className="text-2xl font-bold text-stone-800">פרק {chapterNumber}</h3>
          </div>
          
          <div className="flex items-center gap-2 text-stone-400 font-medium text-sm">
            <span>תהילים</span>
            <ChevronLeft className="w-4 h-4" />
            <span>פרק {chapterNumber}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 text-right">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
              <p className="text-stone-400 animate-pulse">טוען את הפרק...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {text.map((verse, i) => (
                <p 
                  key={i} 
                  className="text-2xl md:text-3xl leading-relaxed text-stone-800 font-serif"
                  dangerouslySetInnerHTML={{ __html: verse }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-stone-50 border-t border-stone-100 flex flex-col sm:flex-row gap-4">
          <button
            onClick={onFinish}
            className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-6 h-6" />
            סיימתי לקרוא
          </button>
          
          <button
            onClick={onCancel}
            className="flex-1 py-4 bg-white hover:bg-stone-100 text-stone-600 border border-stone-200 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            לא סיימתי לקרוא
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
