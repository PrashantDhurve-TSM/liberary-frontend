import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { glass, useToast } from "../../components/Ui.jsx";
import { getApiErrorMessage, unwrapApiResponse } from "../../services/apiHelpers.js";
import adminApi from "../../services/adminApi.js";
import { selectAuthUser } from "../../store/Slice/userSlice..js";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "librarian",
};

const toPolicyForm = (settings) => ({
  selfCheckout: settings.selfCheckout,
  studentLoanDays: String(settings.loanDays.student),
  facultyLoanDays: String(settings.loanDays.faculty),
  publicLoanDays: String(settings.loanDays.public),
  studentLoanLimit: String(settings.maxActiveLoans.student),
  facultyLoanLimit: String(settings.maxActiveLoans.faculty),
  publicLoanLimit: String(settings.maxActiveLoans.public),
  maxRenewals: String(settings.maxRenewals),
  renewDays: String(settings.renewDays),
  finePerDay: String(settings.finePerDay / 100),
  maxFinePerBook: String(settings.maxFinePerBook / 100),
  unpaidFineBorrowLimit: String(settings.unpaidFineBorrowLimit / 100),
  reservationHoldHours: String(settings.reservationHoldHours),
  damagedCharge: String(settings.damagedCharge / 100),
  lostCharge: String(settings.lostCharge / 100),
});

const fetchAuditLogs = async () => {
  const { data } = await adminApi.getAuditLogs({ page: 1, limit: 20 });
  const result = unwrapApiResponse(data);
  if (!Array.isArray(result?.data)) {
    throw new Error("The server returned invalid audit log data.");
  }
  return result.data;
};

export default function AdminSettings() {
  const currentUser = useSelector(selectAuthUser);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, show] = useToast();
  const [policyForm, setPolicyForm] = useState(null);
  const [policyLoading, setPolicyLoading] = useState(true);
  const [policySaving, setPolicySaving] = useState(false);
  const [policyError, setPolicyError] = useState("");
  const [policyMessage, setPolicyMessage] = useState("");
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState("");

  useEffect(() => {
    let active = true;
    adminApi
      .getSettings()
      .then(({ data }) => {
        const settings = unwrapApiResponse(data);
        if (!settings?.loanDays || !settings?.maxActiveLoans) {
          throw new Error("The server returned invalid library settings.");
        }
        if (active) setPolicyForm(toPolicyForm(settings));
      })
      .catch((requestError) => {
        if (active) setPolicyError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setPolicyLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetchAuditLogs()
      .then((logs) => {
        if (active) setAuditLogs(logs);
      })
      .catch((requestError) => {
        if (active) setAuditError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setAuditLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    adminApi
      .getMembers()
      .then(({ data }) => {
        const result = unwrapApiResponse(data);
        if (!Array.isArray(result)) {
          throw new Error("The server returned an invalid user list.");
        }
        if (active) {
          setUsers(
            result
              .filter((user) => user.role === "admin" || user.role === "librarian")
              .map((user) => ({ ...user, id: user._id ?? user.id })),
          );
        }
      })
      .catch((requestError) => {
        if (active) {
          show(getApiErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const refreshAuditHistory = async () => {
    try {
      setAuditLogs(await fetchAuditLogs());
      setAuditError("");
    } catch (requestError) {
      setAuditError(getApiErrorMessage(requestError));
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const createStaff = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      show("Enter the staff member's name.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      show("Enter a valid email address.");
      return;
    }
    if (!/^[0-9+()\-\s]{7,20}$/.test(form.phone.trim())) {
      show("Enter a valid phone number.");
      return;
    }
    if (form.password.length < 8 || form.password.length > 72) {
      show("Password must be between 8 and 72 characters.");
      return;
    }

    try {
      setSaving(true);
      const { data } = await adminApi.createUser({
        ...form,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        membershipType: "public",
      });
      const result = unwrapApiResponse(data);
      const createdUser = result?.user ?? result;
      if (!createdUser?._id && !createdUser?.id) {
        throw new Error("The server returned an invalid staff account.");
      }
      setUsers((previous) => [
        { ...createdUser, id: createdUser._id ?? createdUser.id },
        ...previous,
      ]);
      setForm(initialForm);
      const roleLabel = form.role === "admin" ? "Admin" : "Librarian";
      show(`${roleLabel} account created successfully.`);
      await refreshAuditHistory();
    } catch (requestError) {
      show(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const changePolicyField = (event) => {
    const { name, value, checked, type } = event.target;
    setPolicyForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
    setPolicyError("");
    setPolicyMessage("");
  };

  const savePolicy = async (event) => {
    event.preventDefault();
    setPolicyError("");
    setPolicyMessage("");
    const number = (field) => Number(policyForm[field]);
    const integerFields = [
      "studentLoanDays",
      "facultyLoanDays",
      "publicLoanDays",
      "studentLoanLimit",
      "facultyLoanLimit",
      "publicLoanLimit",
      "maxRenewals",
      "renewDays",
      "reservationHoldHours",
    ];
    if (integerFields.some((field) => !Number.isInteger(number(field)))) {
      setPolicyError("Loan and reservation settings must be whole numbers.");
      return;
    }
    const amountFields = [
      "finePerDay",
      "maxFinePerBook",
      "unpaidFineBorrowLimit",
      "damagedCharge",
      "lostCharge",
    ];
    if (amountFields.some((field) => !Number.isFinite(number(field)) || number(field) < 0)) {
      setPolicyError("Enter valid non-negative amounts.");
      return;
    }

    const changes = {
      selfCheckout: policyForm.selfCheckout,
      loanDays: {
        student: number("studentLoanDays"),
        faculty: number("facultyLoanDays"),
        public: number("publicLoanDays"),
      },
      maxActiveLoans: {
        student: number("studentLoanLimit"),
        faculty: number("facultyLoanLimit"),
        public: number("publicLoanLimit"),
      },
      maxRenewals: number("maxRenewals"),
      renewDays: number("renewDays"),
      finePerDay: Math.round(number("finePerDay") * 100),
      maxFinePerBook: Math.round(number("maxFinePerBook") * 100),
      unpaidFineBorrowLimit: Math.round(number("unpaidFineBorrowLimit") * 100),
      reservationHoldHours: number("reservationHoldHours"),
      damagedCharge: Math.round(number("damagedCharge") * 100),
      lostCharge: Math.round(number("lostCharge") * 100),
    };

    try {
      setPolicySaving(true);
      const { data } = await adminApi.updateSettings(changes);
      const settings = unwrapApiResponse(data);
      if (!settings?.loanDays || !settings?.maxActiveLoans) {
        throw new Error("The server returned invalid library settings.");
      }
      setPolicyForm(toPolicyForm(settings));
      setPolicyMessage("Library policy saved.");
      await refreshAuditHistory();
    } catch (requestError) {
      setPolicyError(getApiErrorMessage(requestError));
    } finally {
      setPolicySaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className={`${glass} rounded-3xl p-6`}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-prime">
          Circulation
        </p>
        <h2 className="mt-2 text-2xl font-bold text-slate-800">
          Library policy
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Changes apply when circulation actions are processed. Existing loans
          keep their recorded renewal allowance. Amounts are entered in rupees.
        </p>

        {policyLoading ? (
          <p className="mt-5 text-sm text-slate-500">Loading library policy...</p>
        ) : policyForm ? (
          <form onSubmit={savePolicy} className="mt-5 space-y-5">
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                name="selfCheckout"
                checked={policyForm.selfCheckout}
                onChange={changePolicyField}
                className="h-4 w-4 rounded border-slate-300 text-prime focus:ring-prime"
              />
              Allow member self-checkout
            </label>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Student loan days", "studentLoanDays", "1"],
                ["Faculty loan days", "facultyLoanDays", "1"],
                ["Public loan days", "publicLoanDays", "1"],
                ["Student active-loan limit", "studentLoanLimit", "1"],
                ["Faculty active-loan limit", "facultyLoanLimit", "1"],
                ["Public active-loan limit", "publicLoanLimit", "1"],
                ["Maximum renewals", "maxRenewals", "1"],
                ["Renewal extension (days)", "renewDays", "1"],
                ["Reservation hold (hours)", "reservationHoldHours", "1"],
                ["Fine per day (₹)", "finePerDay", "0.01"],
                ["Maximum fine per book (₹)", "maxFinePerBook", "0.01"],
                ["Fine balance borrowing limit (₹)", "unpaidFineBorrowLimit", "0.01"],
                ["Damaged copy charge (₹)", "damagedCharge", "0.01"],
                ["Lost copy charge (₹)", "lostCharge", "0.01"],
              ].map(([label, name, step]) => (
                <label key={name} className="text-sm font-medium text-slate-700">
                  {label}
                  <input
                    type="number"
                    name={name}
                    min={["maxRenewals", "finePerDay", "maxFinePerBook", "unpaidFineBorrowLimit", "damagedCharge", "lostCharge"].includes(name) ? "0" : "1"}
                    step={step}
                    required
                    value={policyForm[name]}
                    onChange={changePolicyField}
                    className="mt-1 block w-full rounded-xl border border-white/80 bg-white/65 px-3 py-2.5 font-normal shadow-inner focus:border-prime/50 focus:outline-none focus:ring-2 focus:ring-prime/20"
                  />
                </label>
              ))}
            </div>
            <button
              type="submit"
              disabled={policySaving}
              className="rounded-xl bg-gradient-to-r from-prime to-prime/80 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-prime/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {policySaving ? "Saving policy..." : "Save library policy"}
            </button>
          </form>
        ) : null}

        {policyError && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {policyError}
          </p>
        )}
        {policyMessage && (
          <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {policyMessage}
          </p>
        )}
      </section>

      <section className={`${glass} rounded-3xl p-6`}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-prime">
          Administration
        </p>
        <h2 className="mt-2 text-2xl font-bold text-slate-800">
          Staff and roles
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Create staff accounts with the required access. No email is sent;
          provide the initial password directly.
        </p>

        <form
          onSubmit={createStaff}
          className="mt-6 grid gap-4 sm:grid-cols-2"
          noValidate
        >
          <label className="text-sm font-medium text-slate-700">
            Name
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              maxLength={100}
              required
              className="mt-1 block w-full rounded-xl border border-white/80 bg-white/65 px-3 py-2.5 font-normal shadow-inner focus:border-prime/50 focus:outline-none focus:ring-2 focus:ring-prime/20"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-xl border border-white/80 bg-white/65 px-3 py-2.5 font-normal shadow-inner focus:border-prime/50 focus:outline-none focus:ring-2 focus:ring-prime/20"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Phone
            <input
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-xl border border-white/80 bg-white/65 px-3 py-2.5 font-normal shadow-inner focus:border-prime/50 focus:outline-none focus:ring-2 focus:ring-prime/20"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Initial role
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="mt-1 block w-full rounded-xl border border-white/80 bg-white/65 px-3 py-2.5 font-normal shadow-inner focus:border-prime/50 focus:outline-none focus:ring-2 focus:ring-prime/20"
            >
              <option value="librarian">Librarian</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">
            Initial password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              value={form.password}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-xl border border-white/80 bg-white/65 px-3 py-2.5 font-normal shadow-inner focus:border-prime/50 focus:outline-none focus:ring-2 focus:ring-prime/20"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-prime to-prime/80 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-prime/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
          >
            {saving ? "Creating account..." : "Create staff account"}
          </button>
        </form>

      </section>

      <section className={`${glass} overflow-hidden rounded-3xl`}>
        <div className="border-b border-white/70 px-5 py-4">
          <h3 className="font-semibold text-slate-800">Library accounts</h3>
          <p className="mt-1 text-sm text-slate-500">
            Staff access is assigned when an account is created.
          </p>
        </div>
        {loading ? (
          <p className="p-5 text-sm text-slate-500">Loading accounts...</p>
        ) : users.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No accounts found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-white/60">
                    <td className="px-5 py-3 font-medium text-slate-700">
                      {user.name}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{user.email}</td>
                    <td className="px-5 py-3 capitalize text-slate-600">
                      {user.role}{user.id === currentUser?.id ? " (you)" : ""}
                    </td>
                    <td className="px-5 py-3 capitalize text-slate-600">
                      {user.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={`${glass} overflow-hidden rounded-3xl`}>
        <div className="border-b border-white/70 px-5 py-4">
          <h3 className="font-semibold text-slate-800">Recent administrative changes</h3>
          <p className="mt-1 text-sm text-slate-500">
            The latest successful changes made by administrators and librarians.
          </p>
        </div>
        {auditError && (
          <p role="alert" className="m-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {auditError}
          </p>
        )}
        {auditLoading ? (
          <p className="p-5 text-sm text-slate-500">Loading audit history...</p>
        ) : auditError ? null : auditLogs.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No administrative changes recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Actor</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                  <th className="px-5 py-3 font-medium">Resource</th>
                  <th className="px-5 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((entry) => (
                  <tr key={entry._id} className="border-t border-white/60">
                    <td className="px-5 py-3 font-medium text-slate-700">
                      {entry.actor?.name || entry.actor?.memberId || "Unknown"}
                    </td>
                    <td className="px-5 py-3 uppercase text-slate-600">{entry.method}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {entry.resource}{entry.resourceId ? ` (${entry.resourceId})` : ""}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {entry.createdAt ? new Date(entry.createdAt).toLocaleString("en-IN") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {toast}
    </div>
  );
}
