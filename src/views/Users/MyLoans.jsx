import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Btn,
  Card,
  Empty,
  PageHeader,
  Table,
  Tabs,
  td,
  useToast,
} from "../../components/Ui";
import { getApiErrorMessage, unwrapApiResponse } from "../../services/apiHelpers.js";
import memberApi from "../../services/memberApi.js";

const dateLabel = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const formatMoney = (paise) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format((paise || 0) / 100);

const asArray = (value, label) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  throw new Error(`The server returned invalid ${label} data.`);
};

const toLoan = (loan) => ({
  ...loan,
  id: loan._id,
  title: loan.snapshot?.title || "Library book",
  issued: dateLabel(loan.issuedAt),
  due: dateLabel(loan.dueAt),
  returned: dateLabel(loan.returnedAt),
  renewals: loan.renewCount ?? 0,
  requested: Boolean(loan.returnRequestedAt),
});

const toReservation = (reservation) => ({
  ...reservation,
  id: reservation._id,
  title: reservation.snapshot?.title || "Library book",
  since: dateLabel(reservation.createdAt),
});

export default function MyLoans() {
  const [tab, setTab] = useState("active");
  const [loans, setLoans] = useState([]);
  const [history, setHistory] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [toast, show] = useToast();

  const refreshActivity = useCallback(async (signal) => {
    const [{ data: activeResponse }, { data: historyResponse }, { data: reservationResponse }] =
      await Promise.all([
        memberApi.getLoans({ status: "active" }, { signal }),
        memberApi.getLoans({ status: "history" }, { signal }),
        memberApi.getReservations({ signal }),
      ]);

    setLoans(asArray(unwrapApiResponse(activeResponse), "active loan").map(toLoan));
    setHistory(asArray(unwrapApiResponse(historyResponse), "loan history").map(toLoan));
    setReservations(
      asArray(unwrapApiResponse(reservationResponse), "reservation").map(toReservation),
    );
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    refreshActivity(controller.signal)
      .catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED") {
          setError(getApiErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [refreshActivity]);

  const runAction = async (id, request, successMessage) => {
    setBusyId(id);
    setError("");
    try {
      await request();
      await refreshActivity();
      show(successMessage);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setBusyId("");
    }
  };

  const renew = (loan) =>
    runAction(
      loan.id,
      () => memberApi.renewLoan(loan.id),
      "Loan renewed.",
    );

  const requestReturn = (loan) =>
    runAction(
      loan.id,
      () => memberApi.requestReturn(loan.id),
      "Return request sent.",
    );

  const cancel = (reservation) =>
    runAction(
      reservation.id,
      () => memberApi.cancelReservation(reservation.id),
      "Reservation cancelled.",
    );

  const currentLoans = tab === "history" ? history : loans;

  return (
    <>
      <PageHeader title="My loans" subtitle="Active borrowings, reservations and past history" />
      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "active", label: "Active", count: loans.length },
          { key: "reservations", label: "Reservations", count: reservations.length },
          { key: "history", label: "History", count: history.length },
        ]}
      />

      <Card>
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading your library activity…</p>
        ) : tab === "reservations" ? (
          reservations.length === 0 ? (
            <Empty icon="clock" title="No reservations" text="Reserve a book that is currently borrowed." />
          ) : (
            <Table head={["Book", "Requested", "Queue position", "Status", "Hold until", ""]}>
              {reservations.map((reservation) => (
                <tr key={reservation.id}>
                  <td className={`${td} font-medium`}>{reservation.title}</td>
                  <td className={td}>{reservation.since}</td>
                  <td className={td}>#{reservation.queuePosition}</td>
                  <td className={td}>
                    <Badge tone={reservation.status === "ready" ? "green" : "amber"}>
                      {reservation.status}
                    </Badge>
                  </td>
                  <td className={td}>{reservation.holdUntil ? dateLabel(reservation.holdUntil) : "—"}</td>
                  <td className={td}>
                    <Btn
                      variant="danger"
                      className="!py-1.5"
                      disabled={busyId === reservation.id}
                      onClick={() => cancel(reservation)}
                    >
                      Cancel
                    </Btn>
                  </td>
                </tr>
              ))}
            </Table>
          )
        ) : currentLoans.length === 0 ? (
          <Empty
            title={tab === "history" ? "No loan history" : "No active loans"}
            text={tab === "history" ? "Returned books will appear here." : "Browse the catalog to borrow your next book."}
          />
        ) : tab === "history" ? (
          <Table head={["Book", "Borrowed", "Returned", "Status", "Fine"]}>
            {history.map((loan) => (
              <tr key={loan.id}>
                <td className={`${td} font-medium`}>{loan.title}</td>
                <td className={td}>{loan.issued}</td>
                <td className={td}>{loan.returned}</td>
                <td className={td}><Badge tone={loan.status === "lost" ? "red" : "green"}>{loan.status}</Badge></td>
                <td className={td}>
                  {loan.fine?.amount
                    ? formatMoney(loan.fine.amount)
                    : <span className="text-slate-400">None</span>}
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <Table head={["Book", "Issued", "Due", "Renewals", "Status", "Actions"]}>
            {loans.map((loan) => (
              <tr key={loan.id}>
                <td className={`${td} font-medium`}>{loan.title}</td>
                <td className={td}>{loan.issued}</td>
                <td className={td}>{loan.due}</td>
                <td className={td}>{loan.renewals} of {loan.maxRenewals}</td>
                <td className={td}>
                  <Badge tone={
                    loan.status === "overdue" ? "red" :
                      loan.status === "pending" ? "amber" : "green"
                  }>
                    {loan.status}
                  </Badge>
                </td>
                <td className={`${td} space-x-2`}>
                  <Btn
                    variant="soft"
                    className="!py-1.5"
                    disabled={
                      busyId === loan.id ||
                      loan.status !== "issued" ||
                      loan.renewals >= loan.maxRenewals
                    }
                    onClick={() => renew(loan)}
                  >
                    Renew
                  </Btn>
                  <Btn
                    variant="soft"
                    className="!py-1.5"
                    disabled={
                      busyId === loan.id ||
                      loan.status === "pending" ||
                      loan.requested
                    }
                    onClick={() => requestReturn(loan)}
                  >
                    {loan.requested ? "Requested" : "Return"}
                  </Btn>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {toast}
    </>
  );
}
