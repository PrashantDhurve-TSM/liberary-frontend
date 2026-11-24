import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import AuthShell, {
  FormError,
  PasswordField,
  SubmitButton,
} from "../../components/AuthShell.jsx";
import { register } from "../../store/thunks/auth.Thunk.js";
import {
  clearAuthError,
  selectAuthError,
  selectAuthStatus,
} from "../../store/Slice/userSlice..js";

const membershipTypes = [
  { value: "student", label: "Student", detail: "For students" },
  { value: "faculty", label: "Faculty", detail: "For educators" },
  { value: "public", label: "Public", detail: "For the community" },
];

const getPasswordStrength = (password) =>
  [
    password.length >= 8,
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

const strengthLabels = ["Too short", "Getting started", "Fair", "Good", "Strong"];

const RegisterPage = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    membershipType: "",
    password: "",
  });
  const [validationError, setValidationError] = useState("");
  const dispatch = useDispatch();
  const authError = useSelector(selectAuthError);
  const loading = useSelector(selectAuthStatus) === "loading";
  const navigate = useNavigate();
  const error = validationError || authError;
  const passwordStrength = getPasswordStrength(form.password);

  const updateField = (name, value) => {
    setForm((previous) => ({ ...previous, [name]: value }));
    setValidationError("");
    dispatch(clearAuthError());
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    updateField(name, value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setValidationError("");
    dispatch(clearAuthError());

    if (!form.name.trim()) {
      return setValidationError("Enter your name.");
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      return setValidationError("Enter a valid email address.");
    }
    if (!/^[0-9+()\-\s]{7,20}$/.test(form.phone)) {
      return setValidationError("Enter a valid phone number.");
    }
    if (!form.membershipType) {
      return setValidationError("Select a membership type.");
    }
    if (form.password.length < 8 || form.password.length > 72) {
      return setValidationError(
        "Password must be between 8 and 72 characters.",
      );
    }

    const result = await dispatch(register(form));
    if (register.fulfilled.match(result)) {
      navigate("/", { state: { message: "Your account has been created." } });
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="A few details and you are ready to explore the library."
      footer={
        <p>
          Already a member?{" "}
          <Link
            to="/login"
            className="font-semibold text-prime transition hover:text-prime hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">
              Full name
            </span>
            <input
              name="name"
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={handleChange}
              maxLength={100}
              required
              placeholder="Your name"
              className="w-full rounded-xl border border-white/80 bg-white/70 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:border-prime/50 focus:outline-none focus:ring-2 focus:ring-prime/20"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">
              Phone number
            </span>
            <PhoneInput
              id="phone"
              name="phone"
              defaultCountry="IN"
              autoComplete="tel"
              placeholder="Enter your number"
              value={form.phone}
              required
              onChange={(value) => updateField("phone", value ?? "")}
              className="flex w-full items-center gap-2 rounded-xl border border-white/80 bg-white/70 px-3 py-2.5 text-sm focus-within:border-prime/50 focus-within:ring-2 focus-within:ring-prime/20"
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-slate-700">
            Email address
          </span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            required
            placeholder="you@example.com"
            className="w-full rounded-xl border border-white/80 bg-white/70 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:border-prime/50 focus:outline-none focus:ring-2 focus:ring-prime/20"
          />
        </label>

        <fieldset>
          <legend className="mb-2 block text-sm font-medium text-slate-700">
            Choose your membership
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {membershipTypes.map(({ value, label, detail }) => {
              const selected = form.membershipType === value;
              return (
                <label
                  key={value}
                  className={`relative cursor-pointer rounded-2xl border p-3 transition ${
                    selected
                      ? "border-prime/50 bg-prime/5 shadow-sm shadow-prime/10"
                      : "border-white/80 bg-white/60 hover:border-prime/20 hover:bg-white"
                  }`}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="membershipType"
                    value={value}
                    checked={selected}
                    onChange={handleChange}
                  />
                  <span
                    aria-hidden="true"
                    className={`mb-2 flex h-4 w-4 items-center justify-center rounded-full border ${
                      selected
                        ? "border-prime"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {selected && (
                      <span className="h-2 w-2 rounded-full bg-prime" />
                    )}
                  </span>
                  <span className="block text-sm font-semibold text-slate-800">
                    {label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                    {detail}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div>
          <PasswordField
            name="password"
            autoComplete="new-password"
            placeholder="Create a password"
            value={form.password}
            onChange={handleChange}
            minLength={8}
            maxLength={72}
            required
          />
          {form.password && (
            <div className="mt-2" aria-live="polite">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((level) => (
                  <span
                    key={level}
                    className={`h-1.5 flex-1 rounded-full ${
                      level <= passwordStrength
                        ? "bg-prime"
                        : "bg-slate-200"
                    }`}
                  />
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Password strength: {strengthLabels[passwordStrength]}
              </p>
            </div>
          )}
        </div>

        <FormError>{error}</FormError>
        <SubmitButton loading={loading}>Create account</SubmitButton>
      </form>
    </AuthShell>
  );
};

export default RegisterPage;
