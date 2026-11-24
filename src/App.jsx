import { lazy, Suspense, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Outlet, Route, Routes, useNavigate } from "react-router-dom";

import {
  clearSession,
  selectAuthUser,
  selectIsAuthenticated,
  setAuthSession,
} from "./store/Slice/userSlice..js";
import { refreshAccessToken } from "./services/api.js";

const REFRESH_CHECK_INTERVAL = 60 * 2000; 
const REFRESH_LEEWAY_SECONDS = 2 * 60; 

const getTokenExpiry = (token) => {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return null;
    }

    const decoded = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    );
    return typeof decoded.exp === "number" ? decoded.exp : null;
  } catch {
    return null;
  }
};

const LoginPage = lazy(() => import("./views/Auth/LoginPage"));
const RegisterPage = lazy(() => import("./views/Auth/RegisterPage"));
const UserLayout = lazy(() => import("./layouts/UserLayout"));
const AdminLayout = lazy(() => import("./layouts/AdminLayout.jsx"));
const Dashboard = lazy(() => import("./views/Users/Dashboard.jsx"));
const Profile = lazy(() => import("./views/Users/Profile.jsx"));
const Fines = lazy(() => import("./views/Users/Fines.jsx"));
const MyLoans = lazy(() => import("./views/Users/MyLoans.jsx"));
const Catalog = lazy(() => import("./views/Users/Catalog.jsx"));
const BookDetail = lazy(() => import("./views/Users/BookDetail.jsx"));
const AdminLogin = lazy(() => import("./views/Auth/AdminLogin.jsx"));
const AdminSettings = lazy(() => import("./views/Admin/AdminSettings.jsx"));
const AdminDashboard = lazy(() => import("./views/Admin/AdminDashboard.jsx"));
const AdminBooks = lazy(() => import("./views/Admin/AdminBooks.jsx"));
const AdminMembers = lazy(() => import("./views/Admin/AdminMembers.jsx"));
const AdminReservations = lazy(() => import("./views/Admin/AdminReservation.jsx"));
const AdminFines = lazy(() => import("./views/Admin/AdminFines.jsx"));
const AdminReports = lazy(() => import("./views/Admin/AdminReports.jsx"));
const IssueReturn = lazy(() => import("./views/Admin/IssueReturn.jsx"));

function PageLoading() {
  return (
    <div role="status" className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
      Loading page…
    </div>
  );
}

const getRoleHome = (user) => {
  if (user?.role === "admin") {
    return "/admin";
  }
  if (user?.role === "librarian") {
    return "/admin/issue";
  }
  return "/";
};

function GuestOnlyRoute({ children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectAuthUser);
  return isAuthenticated ? (
    <Navigate to={getRoleHome(user)} replace />
  ) : (
    children
  );
}

function RequireRole({ roles }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectAuthUser);

  if (!isAuthenticated) {
    return (
      <Navigate
        to={roles.includes("member") ? "/login" : "/admin/login"}
        replace
      />
    );
  }
  if (!user || !roles.includes(user.role)) {
    return <Navigate to={getRoleHome(user)} replace />;
  }
  return <Outlet />;
}

export default function App() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    const handleLogout = () => {
      dispatch(clearSession());
      navigate("/login", {
        replace: true,
        state: { message: "Your session expired. Please sign in again." },
      });
    };
    const handleTokenRefresh = (event) => {
      dispatch(setAuthSession(event.detail));
    };
    const refresh = () => {
      const token = localStorage.getItem("token");
      const expiresAt = token ? getTokenExpiry(token) : null;
      const expiresSoon =
        !expiresAt || expiresAt - Math.floor(Date.now() / 1000) <= REFRESH_LEEWAY_SECONDS;

      if (!expiresSoon) {
        return;
      }

      refreshAccessToken().catch((error) => {
        console.error("Session refresh failed; signing out.", error);
      });
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    window.addEventListener("auth:logout", handleLogout);
    window.addEventListener("auth:token-refreshed", handleTokenRefresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    const intervalId = window.setInterval(refresh, REFRESH_CHECK_INTERVAL);
    refresh();

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("auth:logout", handleLogout);
      window.removeEventListener("auth:token-refreshed", handleTokenRefresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [dispatch, isAuthenticated, navigate]);

  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route element={<RequireRole roles={["member"]} />}>
          <Route path="/" element={<UserLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />
            <Route path="fines" element={<Fines />} />
            <Route path="loans" element={<MyLoans />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="catalog/:id" element={<BookDetail />} />
          </Route>
        </Route>

        <Route element={<RequireRole roles={["librarian", "admin"]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="books" element={<AdminBooks />} />
            <Route element={<RequireRole roles={["admin"]} />}>
              <Route path="members" element={<AdminMembers />} />
            </Route>
            <Route path="issue" element={<IssueReturn />} />
            <Route path="reservations" element={<AdminReservations />} />
            <Route path="fines" element={<AdminFines />} />
            <Route path="reports" element={<AdminReports />} />
            <Route element={<RequireRole roles={["admin"]} />}>
              <Route path="settings" element={<AdminSettings />} />
            </Route>
          </Route>
        </Route>

        <Route path="/login" element={<GuestOnlyRoute><LoginPage /></GuestOnlyRoute>} />
        <Route path="/register" element={<GuestOnlyRoute><RegisterPage /></GuestOnlyRoute>} />
        <Route path="/admin/login" element={<GuestOnlyRoute><AdminLogin /></GuestOnlyRoute>} />
        <Route
          path="*"
          element={
            <div className="flex h-screen w-screen items-center justify-center">
              <h1 className="text-center">Page not found</h1>
            </div>
          }
        />
      </Routes>
    </Suspense>
  );
}
