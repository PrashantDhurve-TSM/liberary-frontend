import { createAsyncThunk } from "@reduxjs/toolkit";
import { AuthService } from "../../services/AuthServices.js";

const getAuthData = (response) =>
  response?.data?.data ?? response?.data ?? response;

const saveSession = (response, actionName) => {
  const authData = getAuthData(response);
  if (
    typeof authData?.accessToken !== "string" ||
    !authData.accessToken ||
    typeof authData?.refreshToken !== "string" ||
    !authData.refreshToken ||
    !authData.user
  ) {
    throw new Error(`The server returned an invalid ${actionName} response.`);
  }

  localStorage.setItem("token", authData.accessToken);
  localStorage.setItem("refreshToken", authData.refreshToken);
  localStorage.setItem("user", JSON.stringify(authData.user));

  return {
    user: authData.user,
    accessToken: authData.accessToken,
  };
};

const getErrorMessage = (error, fallback) =>
  error instanceof Error ? error.message : fallback;

export const login = createAsyncThunk(
  "userSlice/login",
  async (
    { email, password, allowedRoles, loginType },
    { rejectWithValue },
  ) => {
    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return rejectWithValue("Email and password are required.");
    }

    try {
      const credentials = {
        email: email.trim().toLowerCase(),
        password,
      };
      const response =
        loginType === "staff"
          ? await AuthService.staffLogin(credentials)
          : await AuthService.login(credentials);
      const authData = getAuthData(response);
      if (
        Array.isArray(allowedRoles) &&
        !allowedRoles.includes(authData?.user?.role)
      ) {
        return rejectWithValue(
          "This account does not have permission to use this sign-in page.",
        );
      }
      return saveSession(response, "login");
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Login failed."));
    }
  },
);

export const register = createAsyncThunk(
  "userSlice/register",
  async (form, { rejectWithValue }) => {
    const membershipTypes = ["student", "faculty", "public"];
    if (
      typeof form?.name !== "string" ||
      !form.name.trim() ||
      form.name.trim().length > 100 ||
      typeof form.email !== "string" ||
      !form.email.trim() ||
      typeof form.phone !== "string" ||
      !/^[0-9+()\-\s]{7,20}$/.test(form.phone.trim()) ||
      !membershipTypes.includes(form.membershipType) ||
      typeof form.password !== "string" ||
      form.password.length < 8 ||
      form.password.length > 72
    ) {
      return rejectWithValue(
        "Check the registration details. Passwords must be between 8 and 72 characters.",
      );
    }

    try {
      const response = await AuthService.register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        membershipType: form.membershipType,
        password: form.password,
      });
      return saveSession(response, "registration");
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Registration failed."));
    }
  },
);

