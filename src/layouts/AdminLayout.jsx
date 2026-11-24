import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import authApi from "../services/authApi.js";
import { clearSession, selectAuthUser } from "../store/Slice/userSlice..js";
import { glass } from "../components/Ui.jsx";
import ShaderBackground from "../components/Shaderbackground.jsx";

const groups = [
  {
    title: "Overview",
    items: [{ to: "/admin", label: "Dashboard", icon: "grid", end: true }],
  },
  {
    title: "Catalog",
    items: [
      { to: "/admin/books", label: "Books", icon: "book" },
      {
        to: "/admin/members",
        label: "Members",
        icon: "users",
        adminOnly: true,
      },
    ],
  },
  {
    title: "Circulation",
    items: [
      { to: "/admin/issue", label: "Issue and return", icon: "repeat" },
      { to: "/admin/reservations", label: "Reservations", icon: "clock" },
      { to: "/admin/fines", label: "Fines", icon: "card" },
    ],
  },
  {
    title: "Insights",
    items: [
      { to: "/admin/reports", label: "Reports", icon: "chart" },
      {
        to: "/admin/settings",
        label: "Settings",
        icon: "settings",
        adminOnly: true,
      },
    ],
  },
];

export default function AdminLayout({ children }) {
  const [open, setOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(false); // desktop icon-only mode
  const [search, setSearch] = useState("");
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(selectAuthUser);
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.adminOnly || user?.role === "admin",
      ),
    }))
    .filter((group) => group.items.length > 0);

  const current =
    [...visibleGroups.flatMap((group) => group.items)]
      .reverse()
      .find((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to)))
      ?.label || "Admin";

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

  const searchBooks = (event) => {
    event.preventDefault();
    navigate(`/admin/books${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`);
  };

  return (
    <ShaderBackground>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-prime/20 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="relative z-10 flex gap-4 p-3 md:p-4">
        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-40 p-3 transition-transform duration-300
            ${open ? "translate-x-0" : "-translate-x-full"}
            md:sticky md:top-4 md:bottom-auto md:h-[calc(100vh-2rem)] md:translate-x-0 md:p-0`}
        >
          <aside
            className={`${glass} flex h-full flex-col rounded-3xl p-3 transition-[width] duration-300
          w-64 ${collapsed ? "md:w-[4.75rem]" : "md:w-64"}`}
          >
            {/* Brand */}
            <div
              className={`flex items-center gap-3 px-1.5 pb-4 pt-1 ${collapsed ? "md:justify-center" : ""}`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-prime to-prime/80 text-white shadow-lg shadow-prime/30">
                <Icon name="logo" className="h-5 w-5" />
              </div>
              <div className={`leading-tight ${collapsed ? "md:hidden" : ""}`}>
                <p className="font-semibold">LibraryHub</p>
                <span className="rounded-full bg-prime/10 px-2 py-0.5 text-[11px] font-medium capitalize text-prime">
                  {user?.role} console
                </span>
              </div>
              <button
                className="ml-auto rounded-lg p-1.5 text-slate-500 hover:bg-white/70 md:hidden"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>

            {/* Grouped navigation */}
            <nav className="flex-1 space-y-4 overflow-y-auto">
              {visibleGroups.map((g) => (
                <div key={g.title}>
                  <p
                    className={`mb-1 px-3 text-xs font-medium text-slate-400 ${collapsed ? "md:hidden" : ""}`}
                  >
                    {g.title}
                  </p>
                  <div className="space-y-1">
                    {g.items.map(({ to, label, icon, end }) => (
                      <NavLink
                        key={to}
                        to={to}
                        end={end}
                        title={collapsed ? label : undefined}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition
                          ${collapsed ? "md:justify-center md:px-0" : ""}
                          ${
                            isActive
                              ? "border border-white/70 bg-gradient-to-br from-prime/95 to-prime/85 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_8px_18px_rgba(0,16,34,0.24)] backdrop-blur-lg"
                              : "border border-transparent text-slate-600 hover:border-white/60 hover:bg-white/45 hover:text-prime hover:shadow-prime"
                          }`
                        }
                      >
                        <Icon
                          name={icon}
                          className="h-[18px] w-[18px] shrink-0"
                        />
                        <span className={collapsed ? "md:hidden" : ""}>
                          {label}
                        </span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            {/* Footer: collapse + logout */}
            <div className="mt-3 space-y-1 border-t border-white/70 pt-3">
              <button
                onClick={() => setCollapsed((c) => !c)}
                className={`hidden w-full items-center gap-3 rounded-2xl border border-transparent px-3.5 py-2.5 text-sm text-slate-500 transition hover:border-white/60 hover:bg-white/45 hover:text-prime md:flex ${
                  collapsed ? "md:justify-center md:px-0" : ""
                }`}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <Icon
                  name="chevron"
                  className={`h-[18px] w-[18px] transition-transform ${collapsed ? "rotate-180" : ""}`}
                />
                <span className={collapsed ? "md:hidden" : ""}>Collapse</span>
              </button>
              <button
                onClick={logout}
                className={`flex w-full items-center gap-3 rounded-2xl border border-transparent px-3.5 py-2.5 text-sm text-slate-500 transition hover:border-white/60 hover:bg-white/45 hover:text-prime ${
                  collapsed ? "md:justify-center md:px-0" : ""
                }`}
                title="Log out"
              >
                <Icon name="out" className="h-[18px] w-[18px] shrink-0" />
                <span className={collapsed ? "md:hidden" : ""}>Log out</span>
              </button>
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

            <h1 className="px-1 text-lg font-semibold">{current}</h1>

            <form onSubmit={searchBooks} className="relative ml-auto hidden w-64 lg:block">
              <Icon
                name="search"
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search books"
                className="w-full rounded-xl border border-white/80 bg-white/45 py-2 pl-9 pr-3 text-sm shadow-[inset_0_1px_2px_rgba(0,16,34,0.06),0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-xl placeholder:text-slate-400 transition focus:border-prime focus:bg-white/70 focus:outline-none focus:ring-2 focus:ring-prime/20"
              />
            </form>

            <button
              onClick={() => navigate("/admin/issue")}
              className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-prime to-prime/80 px-3.5 py-2 text-sm font-medium text-white shadow-lg shadow-prime/30 hover:brightness-105 lg:ml-0"
            >
              <Icon name="plus" className="h-4 w-4" />
              <span className="hidden sm:inline">Issue book</span>
            </button>

            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-gradient-to-br from-prime/90 to-prime text-sm font-semibold text-white shadow-inner">
              {user?.name?.slice(0, 2).toUpperCase() ?? "ST"}
            </div>
          </header>

          <main className="pb-6">{children ?? <Outlet />}</main>
        </div>
      </div>
    </ShaderBackground>
  );
}
