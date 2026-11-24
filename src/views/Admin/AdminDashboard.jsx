import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../../components/Icon";
import { Badge, Card, Empty, PageHeader, StatCard, Table, td, btnCls, useToast } from "../../components/Ui";
import BarChart from "../../components/Barchart";
import api from "../../services/libraryApi.js";

const errorMessage = (error) => {
  const message = error.response?.data?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message)) return message.join(", ");
  return error.message || "The dashboard could not be loaded.";
};

const dateLabel = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

const actionTone = {
  Issued: "prime",
  Returned: "green",
  Overdue: "red",
  Requested: "amber",
  Lost: "red",
};

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, show] = useToast();

  useEffect(() => {
    const controller = new AbortController();
    api.get("/admin/dashboard", { signal: controller.signal })
      .then(({ data: response }) => {
        const result = response?.success === true ? response.data : response;
        if (!result?.stats || !Array.isArray(result.circulation)) {
          throw new Error("The server returned an invalid dashboard response.");
        }
        setDashboard(result);
      })
      .catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED") {
          show(errorMessage(requestError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const overdueLoans = dashboard?.overdueLoans ?? [];
  const activity = dashboard?.recentActivity ?? [];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Library overview for today"
        action={<Link to="/admin/issue" className={btnCls()}><Icon name="plus" className="h-4 w-4" /> Issue book</Link>}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total copies" value={loading || !dashboard ? "—" : dashboard.stats.totalBooks.toLocaleString()} icon="book" />
        <StatCard label="Members" value={loading || !dashboard ? "—" : dashboard.stats.members.toLocaleString()} icon="users" />
        <StatCard label="Issued today" value={loading || !dashboard ? "—" : dashboard.stats.issuedToday.toLocaleString()} icon="repeat" />
        <StatCard label="Overdue" value={loading || !dashboard ? "—" : dashboard.stats.overdue.toLocaleString()} icon="overdue" />
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Circulation this week</h2>
            <Link to="/admin/reports" className="text-sm font-medium text-prime hover:underline">Full report</Link>
          </div>
          {loading ? (
            <p className="py-12 text-center text-sm text-slate-500">Loading circulation…</p>
          ) : !dashboard ? (
            <p className="py-12 text-center text-sm text-slate-500">Circulation data is unavailable.</p>
          ) : dashboard?.circulation.length ? (
            <BarChart data={dashboard.circulation} />
          ) : (
            <Empty icon="repeat" title="No circulation data" text="Circulation activity will appear here." />
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Most overdue</h2>
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading overdue loans…</p>
          ) : !dashboard ? (
            <p className="py-8 text-center text-sm text-slate-500">Overdue data is unavailable.</p>
          ) : overdueLoans.length ? (
            <div className="space-y-3">
              {overdueLoans.map((loan) => (
                <div key={loan._id} className="flex items-center justify-between gap-3 rounded-2xl bg-red-50/60 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{loan.snapshot?.title || "Untitled book"}</p>
                    <p className="truncate text-xs text-slate-500">{loan.snapshot?.memberName || "Unknown member"}</p>
                  </div>
                  <Badge tone="red">{loan.daysLate} days</Badge>
                </div>
              ))}
            </div>
          ) : (
            <Empty icon="check" title="Nothing overdue" text="There are no overdue loans." />
          )}
          <Link to="/admin/fines" className="mt-4 block text-center text-sm font-medium text-prime hover:underline">
            Manage fines
          </Link>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">Recent activity</h2>
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading activity…</p>
        ) : !dashboard ? (
          <p className="py-8 text-center text-sm text-slate-500">Activity data is unavailable.</p>
        ) : activity.length ? (
          <Table head={["Member", "Book", "Action", "When"]}>
            {activity.map((item, index) => (
              <tr key={`${item.at}-${index}`}>
                <td className={`${td} font-medium`}>{item.member}</td>
                <td className={td}>{item.book}</td>
                <td className={td}><Badge tone={actionTone[item.action] || "slate"}>{item.action}</Badge></td>
                <td className={`${td} text-slate-500`}>{dateLabel(item.at)}</td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty icon="repeat" title="No recent activity" text="Loan activity will appear here." />
        )}
      </Card>
      {toast}
    </>
  );
}
