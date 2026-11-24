import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Icon from "../../components/Icon.jsx";
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

export default function AdminLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [validationError, setValidationError] = useState("");
  const dispatch = useDispatch();
  const authError = useSelector(selectAuthError);
  const loading = useSelector(selectAuthStatus) === "loading";
  const navigate = useNavigate();
  const error = validationError || authError;

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setValidationError("");
    dispatch(clearAuthError());
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setValidationError("");
    dispatch(clearAuthError());
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      return setValidationError("Enter your staff email address.");
    }
    if (!form.password) {
      return setValidationError("Enter your password.");
    }

    const result = await dispatch(
      login({
        email: form.email.trim(),
        password: form.password,
        loginType: "staff",
        allowedRoles: ["admin", "librarian"],
      }),
    );
    if (login.fulfilled.match(result)) {
      navigate(
        result.payload.user.role === "admin" ? "/admin" : "/admin/issue",
        { replace: true },
      );
    }
  };

  return (
    <AuthShell
      variant="admin"
      title="Staff sign in"
      subtitle="Use your librarian or administrator account."
      footer={
        <p>
          Not staff?{" "}
          <Link
            to="/login"
            className="font-medium text-prime hover:underline"
          >
            Member sign in
          </Link>
        </p>
      }
    >
      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-prime/15 bg-prime/5 p-3 text-sm text-prime">
        <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Access to staff tools depends on your assigned role.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field
          label="Staff email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="librarian@library.org"
          value={form.email}
          onChange={onChange}
          required
        />
        <PasswordField
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={form.password}
          onChange={onChange}
          required
        />
        <FormError>{error}</FormError>
        <SubmitButton loading={loading}>Sign in to staff console</SubmitButton>
      </form>
    </AuthShell>
  );
}
