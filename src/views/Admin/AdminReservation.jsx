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
import adminApi from "../../services/adminApi.js";

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

const activeStatuses = ["waiting", "ready"];

export default function AdminReservations() {
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [toast, show] = useToast();

  const refreshReservations = useCallback(async (signal) => {
    const { data } = await adminApi.getReservations({ signal });
    const result = unwrapApiResponse(data);
    if (!Array.isArray(result)) {
      throw new Error("The server returned invalid reservation data.");
    }
    setItems(result);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refreshReservations(controller.signal)
      .catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED") {
          show(getApiErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [refreshReservations]);

  const list = items.filter((item) => tab === "all" || item.status === tab);

  const notify = async (reservation) => {
    setBusyId(reservation._id);
    try {
      await adminApi.notifyReservation(reservation._id);
      await refreshReservations();
      show(`${reservation.snapshot?.memberName ?? "Member"} notified.`);
    } catch (requestError) {
      show(getApiErrorMessage(requestError));
    } finally {
      setBusyId("");
    }
  };

  const cancel = async (reservation) => {
    setBusyId(reservation._id);
    try {
      await adminApi.cancelReservation(reservation._id);
      await refreshReservations();
      show("Reservation cancelled.");
    } catch (requestError) {
      show(getApiErrorMessage(requestError));
    } finally {
      setBusyId("");
    }
  };

  return (
    <>
      <PageHeader title="Reservations" subtitle="Manage waiting queues and book holds" />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "all", label: "All", count: items.length },
          { key: "waiting", label: "Waiting", count: items.filter((item) => item.status === "waiting").length },
          { key: "ready", label: "Ready to collect", count: items.filter((item) => item.status === "ready").length },
        ]}
      />

      <Card>
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading reservations…</p>
        ) : list.length === 0 ? (
          <Empty icon="clock" title="No reservations here" />
        ) : (
          <Table head={["Member", "Book", "Requested", "Queue", "Hold until", "Status", "Actions"]}>
            {list.map((reservation) => {
              const isActive = activeStatuses.includes(reservation.status);
              const isReady = reservation.status === "ready";
              return (
                <tr key={reservation._id}>
                  <td className={`${td} font-medium`}>
                    {reservation.snapshot?.memberName ?? "Member"}
                  </td>
                  <td className={td}>{reservation.snapshot?.title ?? "Book"}</td>
                  <td className={td}>{dateLabel(reservation.createdAt)}</td>
                  <td className={td}>#{reservation.queuePosition}</td>
                  <td className={td}>{dateLabel(reservation.holdUntil)}</td>
                  <td className={td}>
                    <Badge tone={isReady ? "green" : reservation.status === "waiting" ? "amber" : "slate"}>
                      {reservation.status}
                    </Badge>
                  </td>
                  <td className={`${td} space-x-2`}>
                    {reservation.status === "waiting" && (
                      <Btn
                        variant="soft"
                        className="!py-1.5"
                        disabled={busyId === reservation._id}
                        onClick={() => notify(reservation)}
                      >
                        Notify
                      </Btn>
                    )}
                    {isActive && (
                      <Btn
                        variant="danger"
                        className="!py-1.5"
                        disabled={busyId === reservation._id}
                        onClick={() => cancel(reservation)}
                      >
                        Cancel
                      </Btn>
                    )}
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
      {toast}
    </>
  );
}
