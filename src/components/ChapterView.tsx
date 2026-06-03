import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { X, Check, RotateCcw, Loader2 } from "lucide-react";
import { getHebrewGematria } from "../lib/gematria";

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
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        background: "rgba(4,6,10,.62)",
        backdropFilter: "blur(2px)",
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        style={{
          background: "var(--surface)",
          borderRadius: 26,
          border: "1px solid var(--line)",
          width: "100%",
          maxWidth: 560,
          maxHeight: "92vh",
          boxShadow: "0 30px 70px rgba(0,0,0,.34)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          background: "var(--surface-alt)",
          padding: "18px 22px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={onCancel}
              style={{
                width: 36, height: 36,
                borderRadius: "50%",
                background: "var(--surface)",
                border: "1px solid var(--line)",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--ink-soft)",
              }}
            >
              <X size={16} />
            </button>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)" }}>
                פרק {getHebrewGematria(chapterNumber)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-faint)" }}>
                תהילים ← פרק {getHebrewGematria(chapterNumber)}
              </div>
            </div>
          </div>
        </div>

        {/* Verse area */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "26px 30px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          textAlign: "right",
        }}>
          {loading ? (
            <div style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              height: 200, gap: 14,
            }}>
              <Loader2 size={36} color="var(--accent-text)" className="animate-spin" />
              <p style={{ margin: 0, fontSize: 14, color: "var(--ink-faint)" }}>טוען את הפרק...</p>
            </div>
          ) : (
            text.map((verse, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                {/* Verse number badge */}
                <div style={{
                  minWidth: 26, height: 26,
                  borderRadius: 8,
                  background: "var(--accent-soft)",
                  color: "var(--accent-text)",
                  fontSize: 13,
                  fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 4,
                }}>
                  {i + 1}
                </div>
                {/* Verse text */}
                <p
                  style={{
                    margin: 0,
                    fontSize: 22,
                    fontWeight: 500,
                    lineHeight: 1.85,
                    color: "var(--ink)",
                    flex: 1,
                    fontFamily: "serif",
                  }}
                  dangerouslySetInnerHTML={{ __html: verse }}
                />
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          background: "var(--surface-alt)",
          padding: 18,
          borderTop: "1px solid var(--line)",
          display: "flex",
          gap: 12,
          flexDirection: "row",
        }}>
          <button
            onClick={onFinish}
            style={{
              flex: 1,
              padding: "14px",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              border: "none",
              borderRadius: 18,
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: "0 10px 24px var(--complete-shadow)",
              fontFamily: "inherit",
            }}
          >
            <Check size={18} strokeWidth={2.5} />
            סיימתי לקרוא
          </button>

          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "14px",
              background: "transparent",
              color: "var(--ink-soft)",
              border: "1px solid var(--line)",
              borderRadius: 18,
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontFamily: "inherit",
            }}
          >
            <RotateCcw size={16} />
            עוד לא
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
