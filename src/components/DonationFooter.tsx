import { Heart } from "lucide-react";

const PAYPAL_ME = "https://paypal.me/yakirkarandian";

export default function DonationFooter() {
  const paypalUrl = PAYPAL_ME;

  return (
    <footer className="mt-12 border-t border-stone-100 pt-8 pb-6 text-center space-y-4">
      <div className="flex items-center justify-center gap-2 text-stone-400">
        <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
        <span className="text-sm font-medium">אתר זה נועד לטובת הכלל</span>
        <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
      </div>

      <p className="text-stone-500 text-sm leading-relaxed max-w-sm mx-auto">
        האתר ניתן לשימוש חינם לכולם ונועד לזכות את הרבים.
        <br />
        על מנת שיוכל להמשיך לפעול, נדרשים תשלומים עבור השרת והאחסון.
        <br />
        כל תרומה, קטנה כגדולה, מסייעת לקיום האתר.
      </p>

      <a
        href={paypalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2.5 px-6 py-3 bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
      >
        <img
          src="https://www.paypalobjects.com/webstatic/icon/pp258.png"
          alt="PayPal"
          className="w-5 h-5 object-contain brightness-200"
        />
        תרמו דרך PayPal
      </a>

      <p className="text-xs text-stone-300 pt-1">תהילים יחד — לרפואת כל החולים</p>
    </footer>
  );
}
