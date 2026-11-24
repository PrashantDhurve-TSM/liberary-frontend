import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  Badge,
  Btn,
  Card,
  Empty,
  Field,
  inputCls,
  Modal,
  PageHeader,
  StatCard,
  Table,
  Tabs,
  td,
  useToast,
} from "../../components/Ui";
import { getApiErrorMessage, unwrapApiResponse } from "../../services/apiHelpers.js";
import api from "../../services/libraryApi.js";
import { selectAuthUser } from "../../store/Slice/userSlice..js";

const formatMoney = (paise) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format((Number(paise) || 0) / 100);

const fineLabel = (fine) =>
  fine.snapshot?.title || fine.description || fine.reason || "Library fine";

const payableStatus = (status) => status === "unpaid" || status === "partial";

export default function AdminFines() {
  const [fines, setFines] = useState([]);
  const [totals, setTotals] = useState({ pending: 0, collected: 0, waived: 0 });
  const [meta, setMeta] = useState({ page: 1, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("unpaid");
  const [waiving, setWaiving] = useState(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [reason, setReason] = useState("");
  const [creating, setCreating] = useState(false);
  const [manualFine, setManualFine] = useState({
    memberId: "",
    amount: "",
    reason: "manual",
    description: "",
  });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [toast, show] = useToast();
  const user = useSelector(selectAuthUser);
  const isAdmin = user?.role === "admin";

  const refreshFines = useCallback(async (nextPage = 1) => {
    const { data } = await api.get("/admin/fines", {
      params: { status: "all", page: nextPage, limit: 100 },
    });
    const result = unwrapApiResponse(data);
    if (!Array.isArray(result?.data) || !result?.totals || !result?.meta) {
      throw new Error("The server returned invalid fine data.");
    }
    setFines(result.data);
    setTotals(result.totals);
    setMeta(result.meta);
    setPage(result.meta.page);
  }, []);

  useEffect(() => {
    refreshFines(1)
      .catch((requestError) => show(getApiErrorMessage(requestError)))
      .finally(() => setLoading(false));
  }, [refreshFines]);

  const list = fines.filter((fine) =>
      tab === "all" ||
      (tab === "unpaid" ? payableStatus(fine.status) : fine.status === tab),
  );

  const mutateFine = async (fine, request, successMessage) => {
    setBusyId(fine._id);
    try {
      await request();
      show(successMessage);
      try {
        await refreshFines(page);
      } catch (requestError) {
        show(`Action completed, but the fine list could not be refreshed: ${getApiErrorMessage(requestError)}`);
      }
      return true;
    } catch (requestError) {
      show(getApiErrorMessage(requestError));
      return false;
    } finally {
      setBusyId("");
    }
  };

  const collectCash = (fine) =>
    mutateFine(
      fine,
      () => api.post(`/admin/fines/${fine._id}/pay`, { method: "cash" }),
      `Cash payment of ${formatMoney(fine.amount - (fine.paidAmount || 0))} recorded.`,
    );

  const waiveFine = async () => {
    if (!waiving || !reason.trim()) {
      show("Enter a reason for the waiver.");
      return;
    }
    const updated = await mutateFine(
      waiving,
      () => api.post(`/admin/fines/${waiving._id}/waive`, { reason: reason.trim() }),
      "Fine waived.",
    );
    if (!updated) return;
    setWaiving(null);
    setReason("");
  };

  const createFine = async (event) => {
    event.preventDefault();
    const amountText = manualFine.amount.trim();
    const [rupeesPart, paisePart = ""] = amountText.split(".");
    const amountPaise = Number(rupeesPart) * 100 + Number(paisePart.padEnd(2, "0"));
    if (
      !manualFine.memberId.trim() ||
      !/^\d+(?:\.\d{1,2})?$/.test(amountText) ||
      !Number.isSafeInteger(amountPaise) ||
      amountPaise <= 0 ||
      !manualFine.description.trim()
    ) {
      show("Enter a member ID, positive amount, and description.");
      return;
    }
    setCreating(true);
    try {
      await api.post("/admin/fines", {
        memberId: manualFine.memberId.trim(),
        amount: amountPaise,
        reason: manualFine.reason,
        description: manualFine.description.trim(),
      });
      setManualFine({
        memberId: "",
        amount: "",
        reason: "manual",
        description: "",
      });
      setTab("unpaid");
      setShowManualForm(false);
      show("Fine created.");
      try {
        await refreshFines(1);
      } catch (requestError) {
        show(`Fine created, but the list could not be refreshed: ${getApiErrorMessage(requestError)}`);
      }
    } catch (requestError) {
      show(getApiErrorMessage(requestError));
    } finally {
      setCreating(false);
    }
  };

  const goToPage = async (nextPage) => {
    setLoading(true);
    try {
      await refreshFines(nextPage);
    } catch (requestError) {
      show(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Fines"
        subtitle="Track and collect outstanding library charges."
        action={<Btn onClick={() => { setManualFine({ memberId: "", amount: "", reason: "manual", description: "" }); setShowManualForm(true); }}>Add manual fine</Btn>}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending" value={formatMoney(totals.pending)} icon="alert" />
        <StatCard label="Collected" value={formatMoney(totals.collected)} icon="card" />
        <StatCard label="Waived" value={formatMoney(totals.waived)} icon="waived" />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "unpaid", label: "Unpaid", count: fines.filter((fine) => payableStatus(fine.status)).length },
          { key: "paid", label: "Paid", count: fines.filter((fine) => fine.status === "paid").length },
          { key: "waived", label: "Waived", count: fines.filter((fine) => fine.status === "waived").length },
          { key: "all", label: "All" },
        ]}
      />

      <Card>
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading fines…</p>
        ) : list.length === 0 ? (
          <Empty icon="check" title="Nothing here" text="No fines match this filter." />
        ) : (
          <Table head={["Member", "Description", "Days late", "Amount due", "Status", "Actions"]}>
            {list.map((fine) => {
              const amount = Number(fine.amount) || 0;
              return (
                <tr key={fine._id}>
                  <td className={`${td} font-medium`}>{fine.snapshot?.memberName ?? "Member"}</td>
                  <td className={td}>{fineLabel(fine)}</td>
                  <td className={td}>{fine.daysLate ?? 0}</td>
                  <td className={td}>{formatMoney(amount)}</td>
                  <td className={td}>
                    <Badge tone={
                      fine.status === "paid" ? "green" :
                        payableStatus(fine.status) ? "red" : "slate"
                    }>
                      {fine.status}
                    </Badge>
                  </td>
                  <td className={`${td} space-x-2`}>
                    {payableStatus(fine.status) ? (
                      <>
                        <Btn
                          variant="soft"
                          className="!py-1.5"
                          disabled={busyId === fine._id}
                          onClick={() => collectCash(fine)}
                        >
                          Collect cash
                        </Btn>
                        {isAdmin && (
                          <Btn
                            variant="soft"
                            className="!py-1.5"
                            disabled={busyId === fine._id}
                            onClick={() => { setWaiving(fine); setReason(""); }}
                          >
                            Waive
                          </Btn>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400">No action</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      {meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Btn variant="soft" disabled={loading || page <= 1} onClick={() => goToPage(page - 1)}>Previous</Btn>
          <span className="text-sm text-slate-500">Page {page} of {meta.totalPages}</span>
          <Btn variant="soft" disabled={loading || page >= meta.totalPages} onClick={() => goToPage(page + 1)}>Next</Btn>
        </div>
      )}

      <Modal
        open={Boolean(waiving)}
        onClose={() => setWaiving(null)}
        title="Waive fine"
      >
        {waiving && (
          <>
            <p className="mb-3 text-sm text-slate-600">
              Waive <span className="font-semibold text-slate-900">
                {formatMoney(waiving.amount - (waiving.paidAmount || 0))}
              </span> for {waiving.snapshot?.memberName ?? "this member"}?
            </p>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Reason</span>
              <textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why this fine is being waived" className={inputCls} />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <Btn variant="soft" onClick={() => setWaiving(null)}>Cancel</Btn>
              <Btn onClick={waiveFine} disabled={busyId === waiving._id}>Waive fine</Btn>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={showManualForm}
        onClose={() => setShowManualForm(false)}
        title="Add manual fine"
      >
        <form onSubmit={createFine} className="space-y-3">
          <Field label="Member ID" value={manualFine.memberId} onChange={(event) => setManualFine({ ...manualFine, memberId: event.target.value })} required />
          <Field label="Amount (₹)" type="number" min="0.01" step="0.01" value={manualFine.amount} onChange={(event) => setManualFine({ ...manualFine, amount: event.target.value })} required />
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Reason</span>
            <select value={manualFine.reason} onChange={(event) => setManualFine({ ...manualFine, reason: event.target.value })} className={inputCls}>
              <option value="manual">Manual</option>
              <option value="damaged">Damaged</option>
              <option value="lost">Lost</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Description</span>
            <textarea rows={3} maxLength={500} value={manualFine.description} onChange={(event) => setManualFine({ ...manualFine, description: event.target.value })} className={inputCls} required />
          </label>
          <p className="text-xs text-slate-500">The server stores money amounts in paise.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Btn type="button" variant="soft" onClick={() => setShowManualForm(false)}>Cancel</Btn>
            <Btn type="submit" disabled={creating}>{creating ? "Saving…" : "Create fine"}</Btn>
          </div>
        </form>
      </Modal>
      {toast}
    </>
  );
}
