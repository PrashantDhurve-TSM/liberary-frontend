import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import authApi from "../services/authApi.js";
import { clearSession, selectAuthUser } from "../store/Slice/userSlice..js";
import Icon from "../components/Icon.jsx";
import ShaderBackground from "../components/Shaderbackground.jsx";
const glass =
  "relative border border-white/70 bg-gradient-to-br from-white/75 via-white/50 to-white/30 backdrop-blur-2xl backdrop-saturate-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_18px_45px_rgba(88,52,24,0.12)] ring-1 ring-white/30 before:pointer-events-none before:absolute before:inset-x-5 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white before:to-transparent";

const nav = [
  { to: "/", label: "Dashboard", icon: "home" },
  { to: "/catalog", label: "Catalog", icon: "book" },
  { to: "/loans", label: "My loans", icon: "bookmark" },
  { to: "/fines", label: "Fines", icon: "card" },
  { to: "/profile", label: "Profile", icon: "user" },
];

const UserLayout = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(selectAuthUser);

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error("Logout request failed.", error);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      dispatch(clearSession());
      navigate("/login", { replace: true });
    }
  };

  const onSearch = (e) => {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    navigate(q ? `/catalog?q=${encodeURIComponent(q)}` : "/catalog");
  };

  return (
    <ShaderBackground>
      <div className="relative min-h-screen text-slate-800">
        {/* Background glow that the glass panels blur */}
  

        <div className="relative z-10 flex gap-4 p-3 md:p-4">
          {/* Mobile overlay */}
          {open && (
            <div
              className="fixed inset-0 z-30 bg-prime/20 backdrop-blur-sm md:hidden"
              onClick={() => setOpen(false)}
            />
          )}

          {/* Sidebar */}
          <div
            className={`fixed inset-y-0 left-0 z-50 p-3 transition-transform duration-300
            ${open ? "translate-x-0" : "-translate-x-full"}
            md:sticky md:top-4 md:bottom-auto md:z-auto md:h-[calc(100vh-2rem)] md:translate-x-0 md:p-0`}
          >
            <aside
              className={`${glass} flex h-full w-64 flex-col rounded-3xl p-4`}
            >
              <div className="flex items-center gap-3 px-2 pb-5 pt-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-prime to-prime/70 text-white shadow-lg shadow-prime/30">
                  <Icon name="logo" className="h-5 w-5" />
                </div>
                <div className="leading-tight">
                  <p className="font-semibold">LibraryHub</p>
                  <p className="text-xs text-slate-500">Member portal</p>
                </div>
                <button
                  className="ml-auto rounded-xl border border-white/50 bg-white/35 p-1.5 text-slate-500 shadow-sm transition hover:bg-white/70 md:hidden"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                >
                  <Icon name="x" className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 space-y-1">
                {nav.map(({ to, label, icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition
                ${
                  isActive
                    ? "border border-white/70 bg-gradient-to-br from-prime to-prime/80 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_8px_18px_rgba(0,16,34,0.24)] backdrop-blur-lg"
                    : "border border-transparent text-slate-600 hover:border-white/60 hover:bg-white/45 hover:text-prime hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                }`
                    }
                  >
                    <Icon name={icon} className="h-[18px] w-[18px]" />
                    {label}
                  </NavLink>
                ))}
              </nav>

              {/* Member card + logout */}
              <div className="rounded-2xl border border-white/70 bg-gradient-to-br from-white/70 to-white/35 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_6px_18px_rgba(88,52,24,0.06)] backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-gradient-to-br from-prime/10 to-prime/20 text-sm font-semibold text-prime shadow-inner">
                    {user?.name?.slice(0, 1).toUpperCase() ?? "M"}
                  </div>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-sm font-medium">{user?.name ?? "Member"}</p>
                    <p className="text-xs text-slate-500">{user?.memberId ?? "Library member"}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="rounded-xl border border-transparent p-2 text-slate-500 transition hover:border-white/70 hover:bg-white/60 hover:text-prime hover:shadow-sm"
                    aria-label="Log out"
                    title="Log out"
                  >
                    <Icon name="out" className="h-[18px] w-[18px]" />
                  </button>
                </div>
              </div>
            </aside>
          </div>

          {/* Main column */}
          <div className="min-w-0 flex-1">
            <header
              className={`${glass} sticky top-3 z-20 mb-4 flex items-center gap-3 rounded-2xl px-3 py-2.5 md:top-4`}
            >
              <button
                className="rounded-xl border border-white/50 bg-white/35 p-2 text-slate-600 shadow-sm transition hover:bg-white/75 md:hidden"
                onClick={() => setOpen(true)}
                aria-label="Open menu"
              >
                <Icon name="menu" />
              </button>

              <form onSubmit={onSearch} className="relative flex-1 max-w-md">
                <Icon
                  name="search"
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                />
                <input
                  name="q"
                  placeholder="Search books or authors"
                  className="w-full rounded-xl border border-white/80 bg-white/45 py-2 pl-9 pr-3 text-sm shadow-[inset_0_1px_2px_rgba(0,16,34,0.06),0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-xl placeholder:text-slate-400 transition focus:border-prime/50 focus:bg-white/70 focus:outline-none focus:ring-2 focus:ring-prime/20"
                />
              </form>

            </header>

            <main className="pb-6">{<Outlet />}</main>
          </div>
        </div>
      </div>
    </ShaderBackground>
  );
};

export default UserLayout;
