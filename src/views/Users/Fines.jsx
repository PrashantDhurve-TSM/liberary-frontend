import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "../../components/Icon";
import { Badge, Btn, Card, Empty, PageHeader, Table, td, useToast } from "../../components/Ui";
import paymentApi from "../../services/paymentApi.js";

const money = (paise) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format((Number(paise) || 0) / 100);

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

const responsePayload = (response) => {
  let value = response;
  while (value?.success === true) value = value.data;
  return value;
};

const responseItems = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return null;
};

const errorMessage = (error) => {
  const message = error.response?.data?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message)) return message.join(", ");
  return error.message || "The request could not be completed.";
};

const toFine = (fine) => ({
  id: fine.id || fine._id,
  title: fine.snapshot?.title || fine.description || "Library fine",
  daysLate: Number(fine.daysLate) || 0,
  amount: Math.max(
    0,
    (Number(fine.amount) || 0) - (Number(fine.paidAmount) || 0),
  ),
  status: fine.status,
  paidAt: fine.paidAt,
});

const toPayment = (payment) => ({
  id: payment.id || payment._id,
  receiptNo: payment.receiptNo,
  date: payment.paidAt || payment.createdAt,
  amount: payment.amount,
  method: payment.method === "cash" ? "Cash" : "Demo payment",
});

export default function Fines() {
  const [fines, setFines] = useState([]);
  const [payments, setPayments] = useState([]);
  const [totalDue, setTotalDue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [toast, show] = useToast();
  const idempotencyKey = useRef(null);
  const paymentInFlight = useRef(false);

  const refreshData = useCallback(async (signal) => {
    const [fineResponse, paymentResponse] = await Promise.all([
      paymentApi.getFines({ signal }),
      paymentApi.getPayments({ signal }),
    ]);
    const fineData = responsePayload(fineResponse.data);
    const paymentData = responsePayload(paymentResponse.data);
    const fineItems = responseItems(fineData);
    const paymentItems = responseItems(paymentData);
    if (!fineItems || !paymentItems) {
      throw new Error("The server returned invalid fine or payment data.");
    }
    setFines(fineItems.map(toFine));
    setTotalDue(
      Number.isFinite(Number(fineData?.totalDue))
        ? Math.max(0, Number(fineData.totalDue))
        : fineItems.reduce(
            (sum, fine) =>
              sum + Math.max(0, (Number(fine.amount) || 0) - (Number(fine.paidAmount) || 0)),
            0,
          ),
    );
    setPayments(paymentItems.map(toPayment));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refreshData(controller.signal)
      .catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED") {
          setError(errorMessage(requestError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [refreshData]);

  const payableFines = fines.filter(
    (fine) =>
      (fine.status === "unpaid" || fine.status === "partial") &&
      fine.amount > 0,
  );
  const totalPaise = payableFines.reduce((sum, fine) => sum + fine.amount, 0) || totalDue;

  const pay = async () => {
    if (!payableFines.length || paymentInFlight.current) return;
    paymentInFlight.current = true;
    setError("");
    setPaying(true);
    const paidFineIds = payableFines.map((fine) => fine.id);
    idempotencyKey.current ||= window.crypto.randomUUID();

    try {
      const { data } = await paymentApi.payFines(paidFineIds, {
        headers: { "Idempotency-Key": idempotencyKey.current },
      });
      const payment = responsePayload(data);
      if (payment?.status !== "paid" || !payment.receiptNo) {
        throw new Error("The server did not confirm the demo payment.");
      }

      idempotencyKey.current = null;
      const paidAt = new Date().toISOString();
      setFines((current) =>
        current.map((fine) =>
          paidFineIds.includes(fine.id)
            ? { ...fine, amount: 0, status: "paid", paidAt }
            : fine,
        ),
      );
      setPayments((current) => [
        {
          id: payment.paymentId,
          receiptNo: payment.receiptNo,
          date: paidAt,
          amount: payment.amount,
          method: "Demo payment",
        },
        ...current,
      ]);
      show("Demo payment recorded. No money was charged.");
      try {
        await refreshData();
      } catch {
        setError("The payment was recorded, but the page could not refresh.");
      }
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      paymentInFlight.current = false;
      setPaying(false);
    }
  };

  const downloadReceipt = async (payment) => {
    setError("");
    try {
      const { data } = await paymentApi.downloadReceipt(payment.id);
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${payment.receiptNo || "library-receipt"}.pdf`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      show("Receipt downloaded");
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  return (
    <>
      <PageHeader title="Fines and payments" subtitle="Overdue charges are ₹5 per day" />
      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-3 font-semibold">Your fines</h2>
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading fines…</p>
          ) : fines.length ? (
            <Table head={["Book", "Days late", "Amount due", "Status"]}>
              {fines.map((fine) => (
                <tr key={fine.id}>
                  <td className={td}>{fine.title}</td>
                  <td className={td}>{fine.daysLate}</td>
                  <td className={td}>{money(fine.amount)}</td>
                  <td className={td}>
                    {fine.status === "unpaid" || fine.status === "partial" ? (
                      <Badge tone="red">Unpaid</Badge>
                    ) : fine.status === "paid" ? (
                      <Badge tone="green">Paid {dateLabel(fine.paidAt)}</Badge>
                    ) : (
                      <Badge tone="amber">Waived</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <Empty icon="check" title="No fines" text="Your fine list is empty." />
          )}
        </Card>

        <Card className="flex flex-col justify-between bg-gradient-to-br !from-prime !to-prime/80 text-white">
          <div>
            <p className="text-sm opacity-90">Total due</p>
            <p className="my-2 text-4xl font-bold">{money(totalPaise)}</p>
            <p className="text-sm opacity-90">
              {payableFines.length
                ? `${payableFines.length} unpaid fine${payableFines.length > 1 ? "s" : ""}`
                : "You are all clear"}
            </p>
          </div>
          <p className="mt-4 text-xs opacity-90">
            Demo only: this records payment for display. No money is charged.
          </p>
          <button
            disabled={loading || paying || !totalPaise}
            onClick={pay}
            className="mt-5 rounded-xl bg-white py-2.5 text-sm font-semibold text-prime opacity-80 transition hover:bg-white hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {paying ? "Recording…" : "Pay now"}
          </button>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">Payment history</h2>
        {payments.length ? (
          <Table head={["Receipt", "Date", "Method", "Amount", ""]}>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td className={td}>{payment.receiptNo}</td>
                <td className={td}>{dateLabel(payment.date)}</td>
                <td className={td}>{payment.method}</td>
                <td className={td}>{money(payment.amount)}</td>
                <td className={td}>
                  <Btn
                    variant="soft"
                    className="!py-1.5"
                    onClick={() => downloadReceipt(payment)}
                  >
                    <Icon name="down" className="h-4 w-4" /> Receipt
                  </Btn>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty icon="card" title="No payments yet" text="Completed payments will appear here." />
        )}
      </Card>

      {toast}
    </>
  );
}
