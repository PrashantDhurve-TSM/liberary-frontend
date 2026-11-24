import { useEffect, useState } from "react";
import Icon from "../../components/Icon";
import { Badge, Btn, Card, Empty, PageHeader, StatCard, Tabs, Table, td, useToast } from "../../components/Ui";
import BarChart from "../../components/Barchart";
import api from "../../services/libraryApi.js";

const errorMessage = (error) => {
  const message = error.response?.data?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message)) return message.join(", ");
  return error.message || "The report could not be loaded.";
};

const unwrap = (response) =>
  response?.success === true ? response.data : response;

const money = (paise) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format((paise || 0) / 100);

export default function AdminReports() {
  const [range, setRange] = useState("week");
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [toast, show] = useToast();

  useEffect(() => {
    const controller = new AbortController();
    setReports(null);
    const end = new Date();
    const start = new Date(end.getTime() - (range === "week" ? 7 : 30) * 86_400_000);
    Promise.all([
      api.get("/admin/reports/circulation", { params: { range }, signal: controller.signal }),
      api.get("/admin/reports/most-borrowed", { params: { limit: 10 }, signal: controller.signal }),
      api.get("/admin/reports/categories", { signal: controller.signal }),
      api.get("/admin/reports/fines", {
        params: { from: start.toISOString(), to: end.toISOString() },
        signal: controller.signal,
      }),
      api.get("/admin/reports/overdue", { signal: controller.signal }),
      api.get("/admin/reports/members", { signal: controller.signal }),
    ])
      .then(([circulationResponse, booksResponse, categoriesResponse, finesResponse, overdueResponse, membersResponse]) => {
        const circulation = unwrap(circulationResponse.data);
        const mostBorrowed = unwrap(booksResponse.data);
        const categories = unwrap(categoriesResponse.data);
        const fines = unwrap(finesResponse.data);
        const overdue = unwrap(overdueResponse.data);
        const members = unwrap(membersResponse.data);
        if (
          !Array.isArray(circulation?.data) ||
          !Array.isArray(mostBorrowed) ||
          !Array.isArray(categories) ||
          !Array.isArray(members) ||
          !Array.isArray(overdue?.data) ||
          !fines
        ) {
          throw new Error("The server returned incomplete report data.");
        }
        setReports({ circulation: circulation.data, mostBorrowed, categories, fines, overdue, members });
      })
      .catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED") {
          show(errorMessage(requestError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    setLoading(true);
    return () => controller.abort();
  }, [range]);

  const data = reports?.circulation ?? [];
  const issued = data.reduce((sum, item) => sum + item.issued, 0);
  const returned = data.reduce((sum, item) => sum + item.returned, 0);
  const topCount = Math.max(1, ...(reports?.mostBorrowed ?? []).map((book) => book.times));
  const membershipCounts = (reports?.members ?? []).reduce((counts, item) => {
    counts[item.membershipType || "other"] = (counts[item.membershipType || "other"] || 0) + item.count;
    return counts;
  }, {});
  const unavailable = (
    <p className="py-8 text-center text-sm text-slate-500">
      Report data is unavailable.
    </p>
  );

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { data: file } = await api.get("/admin/reports/export", {
        params: { type: "circulation", format: "csv", range },
        responseType: "blob",
      });
      const url = URL.createObjectURL(file);
      const link = Object.assign(document.createElement("a"), {
        href: url,
        download: `circulation-${range}.csv`,
      });
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      show("Report exported");
    } catch (requestError) {
      show(errorMessage(requestError));
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Circulation and collection insights"
        action={
          <Btn variant="soft" disabled={exporting} onClick={exportCsv}>
            <Icon name="down" className="h-4 w-4" /> {exporting ? "Exporting…" : "Export CSV"}
          </Btn>
        }
      />
      <Tabs
        value={range}
        onChange={setRange}
        tabs={[{ key: "week", label: "This week" }, { key: "month", label: "This month" }]}
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Books issued" value={loading || !reports ? "—" : issued} icon="repeat" />
        <StatCard label="Books returned" value={loading || !reports ? "—" : returned} icon="bookreturn" />
        <StatCard label="Cash collected" value={loading || !reports ? "—" : money(reports.fines.collected)} icon="card" />
        <StatCard label="Overdue loans" value={loading || !reports ? "—" : reports.overdue.total} icon="overdue" />
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h2 className="mb-4 font-semibold">Circulation</h2>
          {loading ? (
            <p className="py-12 text-center text-sm text-slate-500">Loading circulation…</p>
          ) : !reports ? (
            unavailable
          ) : data.length ? (
            <BarChart data={data} />
          ) : (
            <Empty icon="repeat" title="No circulation data" text="Circulation will appear here when loans are issued." />
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">By category</h2>
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading categories…</p>
          ) : !reports ? (
            unavailable
          ) : reports?.categories.length ? (
            <div className="space-y-4">
              {reports.categories.map((category) => (
                <div key={category.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{category.name || "Uncategorized"}</span>
                    <span className="text-slate-500">{category.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-prime/10">
                    <div className="h-2 rounded-full bg-gradient-to-r from-prime to-prime/60" style={{ width: `${category.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty icon="book" title="No category data" />
          )}
        </Card>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Most borrowed books</h2>
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading titles…</p>
          ) : !reports ? (
            unavailable
          ) : reports?.mostBorrowed.length ? (
            <div className="space-y-3">
              {reports.mostBorrowed.map((book, index) => (
                <div key={book.bookId} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-prime/10 text-xs font-semibold text-prime">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{book.title}</span>
                      <span className="shrink-0 text-slate-500">{book.times} loans</span>
                    </div>
                    <div className="h-2 rounded-full bg-prime/10">
                      <div className="h-2 rounded-full bg-prime" style={{ width: `${(book.times / topCount) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty icon="book" title="No borrowing data" />
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Fine summary</h2>
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading fine totals…</p>
          ) : reports?.fines ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt>Pending</dt><dd className="font-medium">{money(reports.fines.pending)}</dd></div>
              <div className="flex justify-between"><dt>Cash collected</dt><dd className="font-medium text-emerald-700">{money(reports.fines.collected)}</dd></div>
              <div className="flex justify-between"><dt>Demo payments recorded</dt><dd className="font-medium">{money(reports.fines.demoRecorded)}</dd></div>
              <div className="flex justify-between"><dt>Waived</dt><dd className="font-medium">{money(reports.fines.waived)}</dd></div>
            </dl>
          ) : reports ? (
            <Empty icon="card" title="No fine data" />
          ) : (
            unavailable
          )}
          <p className="mt-4 text-xs text-slate-500">Demo payments are not real money collected.</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Members by membership type</h2>
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading member data…</p>
          ) : !reports ? (
            unavailable
          ) : Object.keys(membershipCounts).length ? (
            <div className="flex flex-wrap gap-2">
              {Object.entries(membershipCounts).map(([type, count]) => (
                <Badge key={type} tone="prime">{type}: {count}</Badge>
              ))}
            </div>
          ) : (
            <Empty icon="users" title="No member activity" text="Member registration data from the past year will appear here." />
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Overdue loans</h2>
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading overdue loans…</p>
          ) : !reports ? (
            unavailable
          ) : reports?.overdue.data.length ? (
            <Table head={["Member", "Book", "Days late"]}>
              {reports.overdue.data.slice(0, 8).map((loan) => (
                <tr key={loan._id}>
                  <td className={td}>{loan.snapshot?.memberName || "Unknown member"}</td>
                  <td className={td}>{loan.snapshot?.title || "Untitled book"}</td>
                  <td className={td}><Badge tone="red">{loan.daysLate}</Badge></td>
                </tr>
              ))}
            </Table>
          ) : (
            <Empty icon="check" title="No overdue loans" />
          )}
        </Card>
      </div>
      {toast}
    </>
  );
}
