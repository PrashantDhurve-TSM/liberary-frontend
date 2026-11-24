import Icon from "./Icon";
import { toast } from "react-toastify";

export const glass =
  "relative border border-white/70 bg-gradient-to-br from-white/75 via-white/50 to-white/30 backdrop-blur-2xl backdrop-saturate-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_18px_45px_rgba(0,16,34,0.12)] ring-1 ring-white/30 before:pointer-events-none before:absolute before:inset-x-5 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white before:to-transparent";

export const Card = ({ className = "", children, ...rest }) => (
  <div className={`${glass} rounded-3xl p-5 ${className}`} {...rest}>
    {children}
  </div>
);

const tones = {
  green: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-700",
  prime: "bg-prime/10 text-prime",
  slate: "bg-slate-100 text-slate-600",
};
export const Badge = ({ tone = "slate", children }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
    {children}
  </span>
);

export const PageHeader = ({ title, subtitle, action }) => (
  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 className="text-2xl font-bold">{title}</h1>
      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
    </div>
    {action}
  </div>
);

export const StatCard = ({ label, value, icon }) => (
  <Card className="flex items-center gap-4 !p-4">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-prime to-prime text-white shadow-lg shadow-prime/30">
      <Icon name={icon} />
    </div>
    <div>
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  </Card>
);

const variants = {
  primary: "bg-gradient-to-r from-prime to-prime/80 text-white shadow-lg shadow-prime/30 hover:brightness-105",
  soft: "border border-white/80 bg-white/70 text-slate-700 hover:bg-white hover:text-prime",
  danger: "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100",
};
export const btnCls = (variant = "primary", extra = "") =>
  `inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${extra}`;
export const Btn = ({ variant, className, ...rest }) => (
  <button className={btnCls(variant, className)} {...rest} />
);

export const inputCls =
  "w-full rounded-xl border border-white/80 bg-white/55 px-3 py-2.5 text-sm shadow-[inset_0_1px_2px_rgba(0,16,34,0.06),0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-xl placeholder:text-slate-400 transition focus:border-prime/50 focus:bg-white/75 focus:outline-none focus:ring-2 focus:ring-prime/20";
export const Field = ({ label, className = "", ...rest }) => (
  <label className="block text-sm">
    <span className="mb-1 block font-medium text-slate-700">{label}</span>
    <input className={`${inputCls} ${className}`} {...rest} />
  </label>
);

export const Tabs = ({ tabs, value, onChange }) => (
  <div className="mb-5 inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-white/70 bg-gradient-to-br from-white/70 to-white/35 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_24px_rgba(88,52,24,0.08)] backdrop-blur-2xl">
    {tabs.map((t) => (
      <button
        key={t.key}
        onClick={() => onChange(t.key)}
        className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition ${
          value === t.key
            ? "bg-gradient-to-r from-prime to-prime/80 text-white shadow-md shadow-prime/30"
            : "text-slate-600 hover:text-prime"
        }`}
      >
        {t.label}
        {t.count != null && <span className="ml-1.5 opacity-70">{t.count}</span>}
      </button>
    ))}
  </div>
);

export const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-prime" : "bg-slate-300"}`}
  >
    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
  </button>
);

export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-prime/25 backdrop-blur-sm" onClick={onClose} />
      <div className={`${glass} relative w-full max-w-md rounded-3xl !bg-white/85 p-6`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-prime/5" aria-label="Close">
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const coverColors = [
  "from-prime to-prime/70",
  "from-prime/90 to-prime/60",
  "from-rose-400 to-prime/80",
  "from-slate-600 to-slate-800",
  "from-yellow-400 to-amber-600",
  "from-red-400 to-rose-600",
];
const coverColor = (book) => {
  const numericId = Number(book.id);
  if (Number.isFinite(numericId)) {
    return coverColors[Math.abs(Math.trunc(numericId)) % coverColors.length];
  }
  const value = String(book.title ?? book.id ?? "");
  const hash = [...value].reduce(
    (result, character) => (result * 31 + character.charCodeAt(0)) % coverColors.length,
    0,
  );
  return coverColors[Math.abs(hash)];
};

export const BookCover = ({ book, className = "h-40" }) => (
  <div className={` overflow-hidden relative flex flex-col justify-end rounded-2xl bg-gradient-to-br p-3 text-white shadow-inner ${coverColor(book)} ${className}`}>
    <img className=" absolute top-0 left-0 h-full w-full object-cover object-center" src="https://images.unsplash.com/photo-1592496431122-2349e0fbc666?q=80&w=1512&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D" alt="" />
    <p className="line-clamp-3 text-sm font-semibold leading-tight">{book.title}</p>
    <p className="mt-0.5 truncate text-[11px] opacity-80">
      {Array.isArray(book.authors) ? book.authors.join(", ") : book.author}
    </p>
  </div>
);

export const th = "border-b border-prime/10 px-3 py-2 text-xs font-medium text-slate-500 whitespace-nowrap";
export const td = "border-b border-prime/5 px-3 py-3 whitespace-nowrap";
export const Table = ({ head, children }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead>
        <tr>{head.map((h) => <th key={h} className={th}>{h}</th>)}</tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

export const Empty = ({ icon = "book", title, text }) => (
  <div className="py-12 text-center">
    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-prime/10 text-prime">
      <Icon name={icon} />
    </div>
    <p className="font-medium">{title}</p>
    {text && <p className="text-sm text-slate-500">{text}</p>}
  </div>
);

// Backwards-compatible page API: notifications are rendered by ToastProvider.
export const useToast = () => [null, toast];

