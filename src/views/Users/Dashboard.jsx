import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import Icon from "../../components/Icon";
import {
  Badge,
  Card,
  Empty,
  PageHeader,
  StatCard,
  Table,
  td,
  btnCls,
} from "../../components/Ui";
import { selectAuthUser } from "../../store/Slice/userSlice..js";
import memberApi from "../../services/memberApi.js";
import paymentApi from "../../services/paymentApi.js";

const errorMessage = (error) => {
  const message = error.response?.data?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message)) return message.join(", ");
  return error.message || "Your dashboard could not be loaded.";
};

const money = (paise) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format((paise || 0) / 100);

const dateLabel = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

export default function Dashboard() {
  const user = useSelector(selectAuthUser);
  const [dashboard, setDashboard] = useState(null);
  const [borrowingHistory, setBorrowingHistory] = useState([]);
  const [fineHistory, setFineHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      memberApi.getDashboard({ signal: controller.signal }),
      memberApi.getLoans({ status: "history" }, { signal: controller.signal }),
      paymentApi.getFines({ signal: controller.signal }),
    ])
      .then(([dashboardResponse, loansResponse, finesResponse]) => {
        const result =
          dashboardResponse.data?.success === true
            ? dashboardResponse.data.data
            : dashboardResponse.data;
        const loans =
          loansResponse.data?.success === true
            ? loansResponse.data.data
            : loansResponse.data;
        const finesPayload =
          finesResponse.data?.success === true
            ? finesResponse.data.data
            : finesResponse.data;
        if (
          !result?.stats ||
          !Array.isArray(result.currentLoans) ||
          !Array.isArray(result.newArrivals) ||
          !Array.isArray(loans) ||
          !Array.isArray(finesPayload?.items)
        ) {
          throw new Error("The server returned an invalid dashboard response.");
        }
        setDashboard(result);
        setBorrowingHistory(loans);
        setFineHistory(finesPayload.items);
      })
      .catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED") {
          setError(errorMessage(requestError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const loans = dashboard?.currentLoans ?? [];
  const overdue = dashboard?.stats.overdue ?? 0;
  const name = user?.name?.trim().split(/\s+/)[0] || "there";

  return (
    <>
      <PageHeader
        title={`Hello, ${name}`}
        subtitle="Here is your library summary"
        action={
          <Link to="/catalog" className={btnCls()}>
            Browse catalog
          </Link>
        }
      />
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {!loading && overdue > 0 && (
        <Card className="mb-5 flex flex-wrap items-center gap-3 !border-red-200 !bg-red-50/70 !p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <Icon name="alert" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-red-700">
              {overdue} book{overdue > 1 ? "s are" : " is"} overdue
            </p>
            <p className="text-sm text-red-600/80">
              Return or renew to stop fines from growing.
            </p>
          </div>
          <Link to="/loans" className={btnCls("danger")}>
            View loans
          </Link>
        </Card>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Books borrowed"
          value={loading || !dashboard ? "—" : dashboard.stats.borrowed}
          icon="book"
        />
        <StatCard
          label="Due this week"
          value={loading || !dashboard ? "—" : dashboard.stats.dueThisWeek}
          icon="clock"
        />
        <StatCard
          label="Reservations"
          value={loading || !dashboard ? "—" : dashboard.stats.reservations}
          icon="bookmark"
        />
        <StatCard
          label="Pending fines"
          value={
            loading || !dashboard ? "—" : money(dashboard.stats.pendingFines)
          }
          icon="card"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Currently borrowed</h2>
            <Link
              to="/loans"
              className="text-sm font-medium text-prime hover:underline"
            >
              See all
            </Link>
          </div>
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Loading your loans…
            </p>
          ) : !dashboard ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Your loan data is unavailable.
            </p>
          ) : loans.length ? (
            <Table head={["Book", "Due date", "Status"]}>
              {loans.map((loan) => (
                <tr key={loan._id}>
                  <td className={td}>
                    <Link
                      to="/catalog"
                      className="font-medium hover:text-prime"
                    >
                      {loan.snapshot?.title || "Untitled book"}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {loan.snapshot?.authors?.join(", ")}
                    </p>
                  </td>
                  <td className={td}>{dateLabel(loan.dueAt)}</td>
                  <td className={td}>
                    {loan.status === "overdue" ? (
                      <Badge tone="red">Overdue</Badge>
                    ) : loan.status === "pending" ? (
                      <Badge tone="amber">Awaiting approval</Badge>
                    ) : (
                      <Badge tone="green">On time</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <Empty
              icon="book"
              title="No active loans"
              text="Books you borrow will appear here."
            />
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">New arrivals</h2>
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Loading new arrivals…
            </p>
          ) : !dashboard ? (
            <p className="py-8 text-center text-sm text-slate-500">
              New arrivals are unavailable.
            </p>
          ) : dashboard?.newArrivals.length ? (
            <div className="space-y-3">
              {dashboard.newArrivals.map((book) => (
                <Link
                  key={book._id}
                  to={`/catalog/${book._id}`}
                  className="flex items-center gap-3 rounded-2xl p-1.5 hover:bg-white/70"
                >
                  <div className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-prime to-prime/60 text-white">
                    {/* {book.coverUrl ? ( */}
                      <img
                        className="h-full w-full object-cover object-center"
                        src="https://images.unsplash.com/photo-1592496431122-2349e0fbc666?q=80&w=1512&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D"
                        alt=""
                      />
                    {/* ) : ( */}
                      {/* <Icon name="book" className="h-5 w-5" /> */}
                    {/* )} */}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{book.title}</p>
                    <p className="truncate text-xs text-slate-500">
                      {book.authors?.join(", ")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              icon="book"
              title="No new arrivals"
              text="New catalog titles will appear here."
            />
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Borrowing history</h2>
            <Link
              to="/loans"
              className="text-sm font-medium text-prime hover:underline"
            >
              See all
            </Link>
          </div>
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Loading borrowing historyâ€¦
            </p>
          ) : borrowingHistory.length ? (
            <Table head={["Book", "Borrowed", "Returned", "Status"]}>
              {borrowingHistory.slice(0, 5).map((loan) => (
                <tr key={loan._id}>
                  <td className={`${td} max-w-[220px] truncate font-medium`}>
                    {loan.snapshot?.title || "Untitled book"}
                  </td>
                  <td className={td}>{dateLabel(loan.issuedAt)}</td>
                  <td className={td}>{dateLabel(loan.returnedAt)}</td>
                  <td className={td}>
                    <Badge tone={loan.status === "lost" ? "red" : "green"}>
                      {loan.status === "lost" ? "Lost" : "Returned"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <Empty
              icon="book"
              title="No borrowing history"
              text="Returned books will appear here."
            />
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Fine history</h2>
            <Link
              to="/fines"
              className="text-sm font-medium text-prime hover:underline"
            >
              See all
            </Link>
          </div>
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Loading fine historyâ€¦
            </p>
          ) : fineHistory.length ? (
            <Table head={["Book", "Date", "Amount", "Status"]}>
              {fineHistory.slice(0, 5).map((fine) => {
                const outstanding = Math.max(
                  0,
                  (Number(fine.amount) || 0) - (Number(fine.paidAmount) || 0),
                );
                return (
                  <tr key={fine._id || fine.id}>
                    <td className={`${td} max-w-[180px] truncate font-medium`}>
                      {fine.snapshot?.title ||
                        fine.description ||
                        "Library fine"}
                    </td>
                    <td className={td}>{dateLabel(fine.createdAt)}</td>
                    <td className={td}>{money(outstanding)}</td>
                    <td className={td}>
                      <Badge
                        tone={
                          fine.status === "paid"
                            ? "green"
                            : fine.status === "waived"
                              ? "slate"
                              : "red"
                        }
                      >
                        {fine.status === "partial"
                          ? "Partial"
                          : fine.status === "paid"
                            ? "Paid"
                            : fine.status === "waived"
                              ? "Waived"
                              : "Unpaid"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </Table>
          ) : (
            <Empty
              icon="check"
              title="No fine history"
              text="Your fines will appear here."
            />
          )}
        </Card>
      </div>
    </>
  );
}
