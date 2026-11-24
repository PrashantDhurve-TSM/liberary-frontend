import { useState } from "react";
import Icon from "./Icon";
import { glass, inputCls, btnCls } from "./Ui";

const sides = {
  member: {
    badge: "Member portal",
    title: "Your library, always open",
    points: [
      "Search and borrow from 10,000+ titles",
      "Renew books and track due dates",
      "Clear fines instantly in demo mode",
    ],
  },
  admin: {
    badge: "Admin console",
    title: "Run the library with confidence",
    points: [
      "Issue and return books at the desk",
      "Manage members, stock and reservations",
      "Follow circulation and fine reports",
    ],
  },
};

const Logo = ({ className = "h-10 w-10" }) => (
  <div className={`flex ${className} items-center justify-center rounded-2xl bg-gradient-to-br from-prime to-prime/70 text-white shadow-lg shadow-prime/30`}>
    <Icon name="logo" className="h-5 w-5" />
  </div>
);

export default function AuthShell({ variant = "member", title, subtitle, footer, children }) {
  const side = sides[variant];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-prime/5 via-white to-slate-50 p-4 text-slate-800">
      {/* Background glow that the glass card blurs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-prime/10 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full bg-slate-200/60 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-prime/10 blur-3xl" />
      </div>

      <div className={`${glass} relative w-full max-w-4xl overflow-hidden rounded-3xl md:grid md:grid-cols-[1fr_1.1fr]`}>
        {/* Brand panel (desktop) */}
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-prime to-prime/80 p-10 text-white md:flex">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/15" />
          <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-white/10" />

          <div className="relative flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/25 backdrop-blur">
              <Icon name="logo" className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="font-semibold">LibraryHub</p>
              <p className="text-xs opacity-90">{side.badge}</p>
            </div>
          </div>

          <div className="relative">
            <h2 className="mb-6 text-3xl font-bold leading-tight">{side.title}</h2>
            <ul className="space-y-3">
              {side.points.map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/25">
                    <Icon name="check" className="h-3 w-3" />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Form panel */}
        <main className="bg-white/50 p-6 sm:p-10">
          <div className="mb-6 flex items-center gap-3 md:hidden">
            <Logo />
            <p className="font-semibold">LibraryHub</p>
          </div>

          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-slate-500">{subtitle}</p>

          {children}

          {footer && <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>}
        </main>
      </div>
    </div>
  );
}

export function PasswordField({ label = "Password", ...rest }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <div className="relative">
        <input type={show ? "text" : "password"} className={`${inputCls} pr-16`} {...rest} />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-3 text-xs font-medium text-slate-500 hover:text-prime"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </label>
  );
}

export const FormError = ({ children }) =>
  children ? (
    <p role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
      <Icon name="alert" className="h-4 w-4 shrink-0" />
      {children}
    </p>
  ) : null;

export const SubmitButton = ({ loading, children }) => (
  <button type="submit" disabled={loading} className={btnCls("primary", "w-full !py-3")}>
    {loading ? "Please wait..." : children}
  </button>
);
