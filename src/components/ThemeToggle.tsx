import { useTheme } from "../ThemeContext";

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function ThemeToggle() {
  const { mode, toggle } = useTheme();

  return (
    <div
      style={{
        display: "inline-flex",
        padding: "3px",
        background: "var(--surface-alt)",
        border: "1px solid var(--line)",
        borderRadius: "999px",
        gap: "2px",
      }}
    >
      {/* Light button */}
      <button
        onClick={() => mode !== "light" && toggle()}
        title="מצב בהיר"
        style={{
          width: 30,
          height: 30,
          borderRadius: "999px",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.18s ease",
          background: mode === "light" ? "var(--surface)" : "transparent",
          color: mode === "light" ? "var(--accent-text)" : "var(--ink-faint)",
          boxShadow: mode === "light" ? "0 1px 4px rgba(0,0,0,.10)" : "none",
        }}
      >
        <SunIcon />
      </button>

      {/* Dark button */}
      <button
        onClick={() => mode !== "dark" && toggle()}
        title="מצב כהה"
        style={{
          width: 30,
          height: 30,
          borderRadius: "999px",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.18s ease",
          background: mode === "dark" ? "var(--surface)" : "transparent",
          color: mode === "dark" ? "var(--accent-text)" : "var(--ink-faint)",
          boxShadow: mode === "dark" ? "0 1px 4px rgba(0,0,0,.10)" : "none",
        }}
      >
        <MoonIcon />
      </button>
    </div>
  );
}
