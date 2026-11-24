import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import AuthShell, {
  FormError,
  PasswordField,
  SubmitButton,
} from "../../components/AuthShell.jsx";
import { Field } from "../../components/Ui.jsx";
import { login } from "../../store/thunks/auth.Thunk.js";
import {
  clearAuthError,
  selectAuthError,
  selectAuthStatus,
} from "../../store/Slice/userSlice..js";

export default function LoginPage() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    remember: false,
  });
  const [validationError, setValidationError] = useState("");
  const dispatch = useDispatch();
  const authError = useSelector(selectAuthError);
  const loading = useSelector(selectAuthStatus) === "loading";
  const navigate = useNavigate();
  const location = useLocation();
  const error = validationError || authError;

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
    setValidationError("");
    dispatch(clearAuthError());
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setValidationError("");
    dispatch(clearAuthError());

    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      return setValidationError("Enter a valid email address.");
    }
    if (!form.password || form.password.length > 72) {
      return setValidationError("Enter a valid password.");
    }

    const result = await dispatch(
      login({
        email: form.email,
        password: form.password,
        allowedRoles: ["member"],
      }),
    );
    if (login.fulfilled.match(result)) {
      navigate("/", { state: { message: "You are signed in." } });
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your LibraryHub account and keep reading."
      footer={
        <>
          <p>
            New to LibraryHub?{" "}
            <Link
              to="/register"
              className="font-semibold text-prime transition hover:text-prime hover:underline"
            >
              Create an account
            </Link>
          </p>
          <p className="mt-2">
            Library staff?{" "}
            <Link
              to="/admin/login"
              className="font-semibold text-prime transition hover:text-prime hover:underline"
            >
              Staff sign in
            </Link>
          </p>
          <p className="mt-2">
            <Link
              to="/"
              className="font-medium text-slate-500 transition hover:text-prime"
            >
              Back to home
            </Link>
          </p>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {location.state?.message && (
          <p role="status" className="rounded-xl border border-prime/20 bg-prime/5 p-3 text-sm text-prime">
            {location.state.message}
          </p>
        )}
        <Field
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange}
          required
        />
        <PasswordField
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={form.password}
          onChange={handleChange}
          maxLength={72}
          required
        />

        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            name="remember"
            checked={form.remember}
            onChange={handleChange}
            className="h-4 w-4 rounded border-slate-300 text-prime focus:ring-prime"
          />
          Remember me
        </label>

        <FormError>{error}</FormError>
        <SubmitButton loading={loading}>Sign in</SubmitButton>
      </form>
    </AuthShell>
  );
}
