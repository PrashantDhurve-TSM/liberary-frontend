import { useCallback, useEffect, useState } from "react";
import Icon from "../../components/Icon";
import {
  Badge,
  Btn,
  Card,
  Empty,
  Field,
  inputCls,
  Modal,
  PageHeader,
  Table,
  Tabs,
  td,
  useToast,
} from "../../components/Ui";
import { getApiErrorMessage, unwrapApiResponse } from "../../services/apiHelpers.js";
import adminApi from "../../services/adminApi.js";
import { AuthService } from "../../services/AuthServices.js";
import { downloadBlob } from "../../services/downloadFile.js";

const blankMember = {
  name: "",
  email: "",
  phone: "",
  role: "member",
  membershipType: "student",
  password: "",
};

const formatMoney = (paise) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format((paise || 0) / 100);

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      });
};

const toMember = (user) => ({
  ...user,
  id: user._id,
  type: user.membershipType,
  loans: user.stats?.activeLoans ?? 0,
  fines: user.stats?.unpaidFines ?? 0,
  joined: formatDate(user.createdAt),
});

export default function AdminMembers() {
  const [members, setMembers] = useState([]);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkResult, setBulkResult] = useState(null);
  const [toast, show] = useToast();

  const refreshMembers = useCallback(async () => {
    const response = await adminApi.getMembers();
    const users = unwrapApiResponse(response.data);
    if (!Array.isArray(users)) {
      throw new Error("The server returned invalid member data.");
    }
    setMembers(users.filter((user) => user.role === "member").map(toMember));
  }, []);

  useEffect(() => {
    refreshMembers()
      .catch((requestError) => setError(getApiErrorMessage(requestError)))
      .finally(() => setLoading(false));
  }, [refreshMembers]);

  const counts = {
    all: members.length,
    active: members.filter((member) => member.status === "active").length,
    suspended: members.filter((member) => member.status === "suspended").length,
  };
  const normalizedQuery = query.trim().toLowerCase();
  const list = members.filter((member) => {
    const matchesStatus = tab === "all" || member.status === tab;
    const matchesQuery = [member.name, member.email, member.memberId]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
    return matchesStatus && matchesQuery;
  });

  const toggleStatus = async (member) => {
    const status = member.status === "active" ? "suspended" : "active";
    setError("");
    try {
      await adminApi.updateMember(member.id, { status });
      await refreshMembers();
      show(status === "suspended" ? "Member suspended." : "Member activated.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  };

  const addAccount = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    if (
      !name ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      form.password.length < 8 ||
      form.password.length > 72
    ) {
      setError("Enter a name, valid email, and password between 8 and 72 characters.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const account = {
        name,
        email,
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
        password: form.password,
        ...(form.role === "member"
          ? { membershipType: form.membershipType }
          : {}),
      };
      if (form.role === "librarian") {
        await AuthService.registerLibrarian(account);
      } else if (form.role === "admin") {
        await AuthService.registerAdmin(account);
      } else {
        await adminApi.createMember(account);
      }
      setForm(null);
      await refreshMembers();
      const roleLabel = form.role === "admin" ? "Administrator" : form.role;
      show(`${roleLabel[0].toUpperCase()}${roleLabel.slice(1)} account created. They can sign in with their credentials.`);
    } catch (requestError) {
      setError(
        requestError instanceof Error && !requestError.response
          ? requestError.message
          : getApiErrorMessage(requestError),
      );
    } finally {
      setSaving(false);
    }
  };

  const downloadBulkTemplate = async () => {
    try {
      const { data } = await adminApi.getMemberImportTemplate();
      downloadBlob(data, "member-import-template.xlsx");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  };

  const importMembers = async (event) => {
    event.preventDefault();
    if (!bulkFile) {
      setError("Choose a .xlsx workbook first.");
      return;
    }
    const formData = new FormData();
    formData.append("file", bulkFile);
    setSaving(true);
    setError("");
    try {
      const { data } = await adminApi.importMembers(formData);
      const result = unwrapApiResponse(data);
      setBulkResult(result);
      setBulkFile(null);
      await refreshMembers();
      show(`Imported ${result.membersCreated} members.`);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Members"
        subtitle="Manage library member accounts"
        action={
          <div className="flex flex-wrap gap-2">
            <Btn variant="soft" onClick={() => { setError(""); setBulkOpen(true); setBulkResult(null); }}>
              <Icon name="upload" className="h-4 w-4" /> Bulk import
            </Btn>
            <Btn onClick={() => { setError(""); setForm({ ...blankMember }); }}>
              <Icon name="plus" className="h-4 w-4" /> Add account
            </Btn>
          </div>
        }
      />

      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { key: "all", label: "All", count: counts.all },
            { key: "active", label: "Active", count: counts.active },
            { key: "suspended", label: "Suspended", count: counts.suspended },
          ]}
        />
        <div className="relative w-full sm:w-72">
          <Icon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email or ID"
            className={`${inputCls} pl-9`}
          />
        </div>
      </div>

      <Card>
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading members…</p>
        ) : list.length === 0 ? (
          <Empty icon="users" title="No members found" />
        ) : (
          <Table head={["Member", "Type", "Loans", "Fines due", "Joined", "Status", "Actions"]}>
            {list.map((member) => (
              <tr key={member.id}>
                <td className={td}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-prime/10 text-sm font-semibold text-prime">
                      {member.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-xs text-slate-500">{member.memberId} · {member.email}</p>
                    </div>
                  </div>
                </td>
                <td className={`${td} capitalize`}>{member.type}</td>
                <td className={td}>{member.loans}</td>
                <td className={td}>{formatMoney(member.fines)}</td>
                <td className={td}>{member.joined}</td>
                <td className={td}>
                  {member.status === "active"
                    ? <Badge tone="green">Active</Badge>
                    : <Badge tone="red">{member.status}</Badge>}
                </td>
                <td className={td}>
                  {member.status === "active" || member.status === "suspended" ? (
                    <Btn
                      variant={member.status === "active" ? "danger" : "soft"}
                      className="!py-1.5"
                      onClick={() => toggleStatus(member)}
                    >
                      {member.status === "active" ? "Suspend" : "Activate"}
                    </Btn>
                  ) : (
                    <span className="text-slate-400">No action</span>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.role === "member" ? "Add member" : "Add staff account"}
      >
        {form && (
          <form onSubmit={addAccount} className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Account role</span>
              <select
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value })}
                className={inputCls}
              >
                <option value="member">Member</option>
                <option value="librarian">Librarian</option>
                <option value="admin">Administrator</option>
              </select>
            </label>
            <Field label="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required maxLength={100} />
            <Field label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
            <Field label="Phone (optional)" type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            <Field
              label="Initial password"
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              minLength={8}
              maxLength={72}
              required
              autoComplete="new-password"
            />
            {form.role === "member" && (
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Membership type</span>
                <select
                  value={form.membershipType}
                  onChange={(event) => setForm({ ...form, membershipType: event.target.value })}
                  className={inputCls}
                >
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="public">Public</option>
                </select>
              </label>
            )}
            <p className="text-xs text-slate-500">
              Share the initial password with the account holder directly. They can change it after signing in.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Btn type="button" variant="soft" onClick={() => setForm(null)}>Cancel</Btn>
              <Btn type="submit" disabled={saving}>{saving ? "Creating…" : "Create account"}</Btn>
            </div>
          </form>
        )}
      </Modal>
      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="Bulk import members">
        <form onSubmit={importMembers} className="space-y-4">
          <p className="text-sm text-slate-600">
            Upload the Members worksheet with name, email, membershipType and an initial password. Passwords are hashed by the server and are never returned.
          </p>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => setBulkFile(event.target.files?.[0] ?? null)}
            className="block w-full rounded-xl border border-slate-200 bg-white p-2 text-sm"
          />
          {bulkResult && (
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <p>Created: {bulkResult.membersCreated}</p>
              <p>Errors: {bulkResult.errors?.length ?? 0}</p>
              {bulkResult.errors?.length > 0 && <p className="mt-1 text-red-600">Review row errors before retrying.</p>}
            </div>
          )}
          <div className="flex flex-wrap justify-between gap-2">
            <Btn type="button" variant="soft" onClick={downloadBulkTemplate}>Download template</Btn>
            <div className="flex gap-2">
              <Btn type="button" variant="soft" onClick={() => setBulkOpen(false)}>Close</Btn>
              <Btn type="submit" disabled={saving}>{saving ? "Importing…" : "Import members"}</Btn>
            </div>
          </div>
        </form>
      </Modal>
      {toast}
    </>
  );
}
