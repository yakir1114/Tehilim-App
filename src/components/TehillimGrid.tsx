import { useState, Key } from "react";
import { Lock, Check } from "lucide-react";
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

function ChapterTile({
  chapter,
  isLockedByMe,
  isLockedByOther,
  isCompleted,
  onClick,
}: {
  key?: Key;
  chapter: ChapterState;
  isLockedByMe: boolean;
  isLockedByOther: boolean;
  isCompleted: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  let bg: string;
  let borderColor: string;
  let textColor: string;
  let cursor = "pointer";
  let shadow = "none";
  let transform = "translateY(0)";

  if (isCompleted) {
    bg = "var(--accent)";
    borderColor = "var(--accent)";
    textColor = "var(--accent-ink)";
    shadow = "0 6px 16px var(--complete-shadow)";
  } else if (isLockedByMe) {
    bg = "var(--mine)";
    borderColor = "var(--mine-line)";
    textColor = "var(--mine-ink)";
    if (hovered) transform = "translateY(-2px)";
  } else if (isLockedByOther) {
    bg = "var(--surface-alt)";
    borderColor = "var(--line)";
    textColor = "var(--ink-faint)";
    cursor = "not-allowed";
  } else {
    // available
    bg = "var(--surface)";
    borderColor = "var(--line)";
    textColor = "var(--ink-soft)";
    if (hovered) transform = "translateY(-2px)";
  }

  return (
    <button
      onClick={onClick}
      disabled={isLockedByOther}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 15,
        border: `1px solid ${borderColor}`,
        background: bg,
        color: textColor,
        fontSize: 19,
        fontWeight: 600,
        cursor,
        transform,
        transition: "transform 0.16s ease, box-shadow 0.16s ease",
        boxShadow: shadow,
        fontFamily: "inherit",
        padding: 0,
      }}
    >
      {getHebrewGematria(chapter.chapter_number)}

      {/* Status indicators (top-right) */}
      <div style={{ position: "absolute", top: 4, right: 4, display: "flex" }}>
        {isCompleted && (
          <Check size={11} strokeWidth={3} color="var(--accent-ink)" />
        )}
        {isLockedByMe && (
          <div style={{
            width: 7, height: 7,
            background: "var(--mine-line)",
            borderRadius: "50%",
            animation: "pulseDot 1.8s ease-in-out infinite",
          }} />
        )}
        {isLockedByOther && (
          <Lock size={10} color="var(--ink-faint)" />
        )}
      </div>
    </button>
  );
}

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
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Filter tabs */}
      <div style={{
        display: "inline-flex",
        background: "var(--surface-alt)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        padding: 4,
        gap: 2,
        margin: "0 auto",
      }}>
        {([['all', 'הכל'], ['days', 'לפי יום'], ['books', 'לפי ספר']] as [FilterMode, string][]).map(([mode, label]) => (
          <button
            key={mode}
            onClick={() => handleModeChange(mode)}
            style={{
              background: filterMode === mode ? "var(--surface)" : "transparent",
              color: filterMode === mode ? "var(--accent-text)" : "var(--ink-faint)",
              border: "none",
              borderRadius: 10,
              padding: "9px 18px",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: filterMode === mode ? "0 1px 4px rgba(0,0,0,.08)" : "none",
              fontFamily: "inherit",
              transition: "all 0.15s ease",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Group selector */}
      {groups && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {groups.map((group, i) => (
            <button
              key={i}
              onClick={() => setSelectedGroup(i)}
              style={{
                background: selectedGroup === i ? "var(--accent)" : "var(--surface)",
                color: selectedGroup === i ? "var(--accent-ink)" : "var(--ink-soft)",
                border: `1px solid ${selectedGroup === i ? "var(--accent)" : "var(--line)"}`,
                borderRadius: 10,
                padding: "7px 14px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s ease",
              }}
            >
              {group.label}
              <span style={{ marginRight: 6, fontSize: 11, opacity: 0.7 }}>
                ({getHebrewGematria(group.range[0])}–{getHebrewGematria(group.range[1])})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Chapter grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(10, 1fr)",
        gap: 8,
      }} className="chapter-grid">
        {visibleChapters.map((chapter) => {
          const isLockedByMe = chapter.status === 'locked' && chapter.locked_by === currentUserId;
          const isLockedByOther = chapter.status === 'locked' && chapter.locked_by !== currentUserId;
          const isCompleted = chapter.status === 'completed';
          return (
            <ChapterTile
              key={chapter.chapter_number}
              chapter={chapter}
              isLockedByMe={isLockedByMe}
              isLockedByOther={isLockedByOther}
              isCompleted={isCompleted}
              onClick={() => onChapterClick(chapter.chapter_number)}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 18,
        justifyContent: "center",
        fontSize: 12.5,
        color: "var(--ink-soft)",
        paddingTop: 4,
      }}>
        {[
          { bg: "var(--surface)", border: "var(--line)", label: "פנוי" },
          { bg: "var(--mine)", border: "var(--mine-line)", label: "קורא עכשיו" },
          { bg: "var(--surface-alt)", border: "var(--line)", label: "תפוס" },
          { bg: "var(--accent)", border: "var(--accent)", label: "הושלם" },
        ].map(({ bg, border, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 20, height: 20,
              background: bg,
              border: `1px solid ${border}`,
              borderRadius: 6,
            }} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Responsive grid */}
      <style>{`
        @media (max-width: 600px) {
          .chapter-grid { grid-template-columns: repeat(5, 1fr) !important; }
        }
        @media (min-width: 601px) and (max-width: 800px) {
          .chapter-grid { grid-template-columns: repeat(8, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}
