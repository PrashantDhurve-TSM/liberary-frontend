import { createSlice } from "@reduxjs/toolkit";
import { login, register as registerThunk } from "../thunks/auth.Thunk.js";

const readStoredSession = () => {
  if (typeof localStorage === "undefined") {
    return { user: null, accessToken: null };
  }

  const accessToken = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  if (!accessToken || !storedUser) {
    return { user: null, accessToken: null };
  }

  try {
    return { user: JSON.parse(storedUser), accessToken };
  } catch {
    return { user: null, accessToken: null };
  }
};

const storedSession = readStoredSession();
const initialState = {
  username: storedSession.user?.name ?? "",
  user: storedSession.user,
  accessToken: storedSession.accessToken,
  isAuthenticated: Boolean(storedSession.user && storedSession.accessToken),
  status: "idle",
  error: null,
};

export const userSlice = createSlice({
  name: "userSlice",
  initialState,
  reducers: {
    register: (state, action) => {
      state.username = action.payload;
    },
    clearAuthError: (state) => {
      state.error = null;
    },
    setAuthSession: (state, action) => {
      state.user = action.payload.user;
      state.username = action.payload.user.name;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
    },
    updateAuthUser: (state, action) => {
      state.user = action.payload;
      state.username = action.payload.name;
    },
    clearSession: (state) => {
      state.username = "";
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.status = "idle";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.error = null;
        state.user = action.payload.user;
        state.username = action.payload.user.name;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? action.error.message ?? "Login failed.";
      })
      .addCase(registerThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(registerThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.error = null;
        state.user = action.payload.user;
        state.username = action.payload.user.name;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          action.payload ?? action.error.message ?? "Registration failed.";
      });
  },
});

export const {
  register,
  clearAuthError,
  setAuthSession,
  updateAuthUser,
  clearSession,
} = userSlice.actions;
export const selectname = (state) => state.userSlice.username;
export const selectAuthUser = (state) => state.userSlice.user;
export const selectAuthRole = (state) => state.userSlice.user?.role ?? null;
export const selectIsAuthenticated = (state) =>
  state.userSlice.isAuthenticated;
export const selectAuthStatus = (state) => state.userSlice.status;
export const selectAuthError = (state) => state.userSlice.error;

export default userSlice.reducer;