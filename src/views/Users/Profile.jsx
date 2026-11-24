import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import Icon from "../../components/Icon";
import { Badge, Btn, Card, Field, PageHeader } from "../../components/Ui";
import { getApiErrorMessage, unwrapApiResponse } from "../../services/apiHelpers.js";
import authApi from "../../services/authApi.js";
import memberApi from "../../services/memberApi.js";
import { clearSession, updateAuthUser } from "../../store/Slice/userSlice..js";

const emptyProfile = { name: "", email: "", phone: "" };

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyProfile);
  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    memberApi.getProfile({ signal: controller.signal })
      .then(({ data }) => {
        const result = unwrapApiResponse(data);
        if (!result?._id || !result.email) {
          throw new Error("The server returned invalid profile data.");
        }
        setProfile(result);
        setForm({
          name: result.name ?? "",
          email: result.email ?? "",
          phone: result.phone ?? "",
        });
      })
      .catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED") {
          setError(getApiErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setError("");
    setMessage("");
    try {
      const { data } = await memberApi.updateProfile({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
      });
      const updatedProfile = unwrapApiResponse(data);
      setProfile(updatedProfile);
      setForm({
        name: updatedProfile.name ?? "",
        email: updatedProfile.email ?? "",
        phone: updatedProfile.phone ?? "",
      });
      const authUser = {
        id: updatedProfile._id,
        memberId: updatedProfile.memberId,
        name: updatedProfile.name,
        email: updatedProfile.email,
        phone: updatedProfile.phone,
        role: updatedProfile.role,
        membershipType: updatedProfile.membershipType,
        status: updatedProfile.status,
      };
      localStorage.setItem("user", JSON.stringify(authUser));
      dispatch(updateAuthUser(authUser));

      if (updatedProfile.email?.toLowerCase() !== profile.email?.toLowerCase()) {
        await endSession("Your email was updated. Sign in again with your new email.");
        return;
      }
      setMessage("Profile saved.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSavingProfile(false);
    }
  };

  const endSession = async (loginMessage) => {
    try {
      await authApi.logout();
    } catch (requestError) {
      console.error("Could not revoke the current session.", requestError);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      dispatch(clearSession());
      navigate("/login", { replace: true, state: { message: loginMessage } });
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    if (
      password.newPassword.length < 8 ||
      password.newPassword.length > 72
    ) {
      setError("New password must be between 8 and 72 characters.");
      return;
    }
    if (password.newPassword !== password.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setSavingPassword(true);
    setError("");
    setMessage("");
    try {
      await memberApi.changePassword({
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });
      await endSession("Your password was changed. Sign in with your new password.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      setSavingPassword(false);
    }
  };

  if (loading) {
    return <Card><p className="py-8 text-center text-sm text-slate-500">Loading profile…</p></Card>;
  }
  if (!profile) {
    return (
      <Card>
        <p role="alert" className="text-sm text-red-700">{error || "Profile unavailable."}</p>
      </Card>
    );
  }

  const initials = profile.name
    ?.trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const activeLoans = profile.stats?.activeLoans ?? 0;
  const totalBorrowed = profile.stats?.totalBorrowed ?? 0;
  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
    : "—";

  return (
    <>
      <PageHeader title="My profile" subtitle="Manage your account details and password" />
      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mb-4 rounded-xl border border-prime/20 bg-prime/5 p-3 text-sm text-prime">
          {message}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="h-fit text-center">
          <div className="mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-prime to-prime/70 text-3xl font-bold text-white shadow-lg shadow-prime/30">
            {initials || "M"}
          </div>
          <p className="text-lg font-semibold">{profile.name}</p>
          <p className="mb-3 text-sm text-slate-500">
            {profile.memberId} · {profile.membershipType}
          </p>
          <Badge tone={profile.status === "active" ? "green" : "red"}>{profile.status}</Badge>
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-prime/10 pt-4">
            {[
              [activeLoans, "Active"],
              [totalBorrowed, "Borrowed"],
              [memberSince, "Since"],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="text-sm font-semibold">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <h2 className="mb-4 font-semibold">Personal details</h2>
            <form onSubmit={saveProfile}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" name="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required maxLength={100} />
                <Field label="Email" name="email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
                <Field label="Phone" name="phone" type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              </div>
              <div className="mt-5 flex justify-end">
                <Btn type="submit" disabled={savingProfile}>
                  {savingProfile ? "Saving…" : "Save changes"}
                </Btn>
              </div>
            </form>
          </Card>

          <Card>
            <h2 className="mb-4 flex items-center gap-2 font-semibold">
              <Icon name="lock" className="h-[18px] w-[18px] text-prime" /> Change password
            </h2>
            <form onSubmit={savePassword}>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field
                  label="Current password"
                  type="password"
                  autoComplete="current-password"
                  value={password.currentPassword}
                  onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })}
                  required
                />
                <Field
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  value={password.newPassword}
                  onChange={(event) => setPassword({ ...password, newPassword: event.target.value })}
                  required
                />
                <Field
                  label="Confirm new password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  value={password.confirmPassword}
                  onChange={(event) => setPassword({ ...password, confirmPassword: event.target.value })}
                  required
                />
              </div>
              <div className="mt-5 flex justify-end">
                <Btn type="submit" disabled={savingPassword}>
                  {savingPassword ? "Updating…" : "Update password"}
                </Btn>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
