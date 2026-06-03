import { Heart } from "lucide-react";

const PAYPAL_ME = "https://paypal.me/yakirkarandian";

export default function DonationFooter() {
  return (
    <footer style={{
      marginTop: 24,
      borderTop: "1px solid var(--line)",
      paddingTop: 28,
      paddingBottom: 20,
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink-soft)" }}>
        <Heart size={15} color="#f87171" fill="#f87171" />
        <span style={{ fontSize: 14, fontWeight: 500 }}>אתר זה נועד לטובת הכלל</span>
        <Heart size={15} color="#f87171" fill="#f87171" />
      </div>

      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7, color: "var(--ink-soft)", maxWidth: 340 }}>
        האתר ניתן לשימוש חינם לכולם ונועד לזכות את הרבים.
        <br />
        על מנת שיוכל להמשיך לפעול, נדרשים תשלומים עבור השרת והאחסון.
        <br />
        כל תרומה, קטנה כגדולה, מסייעת לקיום האתר.
      </p>

      <a
        href={PAYPAL_ME}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 24px",
          background: "#0070BA",
          color: "#fff",
          textDecoration: "none",
          borderRadius: 16,
          fontWeight: 700,
          fontSize: 15,
          fontFamily: "inherit",
          transition: "background 0.18s ease",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "#005ea6")}
        onMouseLeave={e => (e.currentTarget.style.background = "#0070BA")}
      >
        <img
          src="https://www.paypalobjects.com/webstatic/icon/pp258.png"
          alt="PayPal"
          style={{ width: 20, height: 20, objectFit: "contain", filter: "brightness(10)" }}
        />
        תרמו דרך PayPal
      </a>

      <p style={{ margin: 0, fontSize: 11.5, color: "var(--ink-faint)" }}>
        תהילים יחד — לרפואת כל החולים
      </p>
    </footer>
  );
}
