import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Icon from "../../components/Icon";
import { Badge, BookCover, Btn, Card, Empty } from "../../components/Ui";
import { getApiErrorMessage, unwrapApiResponse } from "../../services/apiHelpers.js";
import catalogApi from "../../services/catalogApi.js";

const dateLabel = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

export default function BookDetail() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [related, setRelated] = useState([]);
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const refreshBook = useCallback(async (signal) => {
    const response = await catalogApi.getBook(id, { signal });
    const result = unwrapApiResponse(response.data);
    if (!result?.id || !result.title) {
      throw new Error("The server returned invalid book details.");
    }
    setBook(result);
    return result;
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    refreshBook(controller.signal)
      .catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED") {
          setError(getApiErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [refreshBook]);

  useEffect(() => {
    if (!book?.category) return undefined;
    const controller = new AbortController();
    catalogApi.getBooks({ category: String(book.category), limit: 5 }, { signal: controller.signal })
      .then(({ data }) => {
        const result = unwrapApiResponse(data);
        if (!Array.isArray(result?.data)) {
          throw new Error("The server returned invalid related-book data.");
        }
        setRelated(result.data.filter((item) => item.id !== book.id).slice(0, 4));
      })
      .catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED") {
          setError(getApiErrorMessage(requestError));
        }
      });
    return () => controller.abort();
  }, [book]);

  const performAction = async (action) => {
    if (!book || busy) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await catalogApi.borrowBook(book.id, action);
      const result = unwrapApiResponse(data);
      setState(action === "reserve" ? "reserved" : result?.status === "pending" ? "pending" : "borrowed");
      showActionMessage(action, result);
      try {
        await refreshBook();
      } catch {
        setError("Your request was recorded, but the book details could not be refreshed.");
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const showActionMessage = (action, result) => {
    if (action === "reserve") {
      setActionMessage(
        result?.queuePosition
          ? `Reservation placed at position ${result.queuePosition}.`
          : "Reservation placed.",
      );
    } else if (result?.status === "pending") {
      setActionMessage("Borrow request sent for staff approval.");
    } else {
      setActionMessage(`Book borrowed${result?.dueAt ? `; due ${dateLabel(result.dueAt)}` : ""}.`);
    }
  };

  if (loading) {
    return <Card><p className="py-8 text-center text-sm text-slate-500">Loading book…</p></Card>;
  }
  if (error && !book) {
    return (
      <Card>
        <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>
        <Empty title="Book unavailable" text="The book details could not be loaded." />
      </Card>
    );
  }
  if (!book) {
    return <Card><Empty title="Book not found" text="It may have been removed from the catalog." /></Card>;
  }

  const available = book.availableCopies > 0;
  const rating = book.rating?.avg ?? 0;
  const details = [
    ["ISBN", book.isbn || "—"],
    ["Pages", book.pages || "—"],
    ["Published", book.publishedYear || "—"],
    ["Shelf", book.shelfLocation || "—"],
  ];

  return (
    <>
      <Link to="/catalog" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-prime hover:underline">
        <Icon name="back" className="h-4 w-4" /> Back to catalog
      </Link>

      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {actionMessage && (
        <p role="status" className="mb-4 rounded-xl border border-prime/20 bg-prime/5 p-3 text-sm text-prime">
          {actionMessage}
        </p>
      )}

      <Card className="grid gap-6 md:grid-cols-[240px_1fr]">
        <BookCover book={book} className="h-72 md:h-80" />
        <div>
          <h1 className="text-2xl font-bold">{book.title}</h1>
          <p className="mb-3 text-slate-500">by {(book.authors ?? []).join(", ")}</p>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge tone="prime">{book.categoryName}</Badge>
            {available
              ? <Badge tone="green">{book.availableCopies} copies available</Badge>
              : <Badge tone="red">All copies borrowed</Badge>}
            <span className="inline-flex items-center gap-1 text-sm text-slate-600">
              <Icon name="star" className="h-4 w-4 fill-prime text-prime" />
              {rating} / 5
            </span>
          </div>

          {book.description && (
            <p className="mb-5 max-w-prose text-sm leading-relaxed text-slate-600">
              {book.description}
            </p>
          )}

          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {details.map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/80 bg-white/60 p-3">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="truncate text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {state === "borrowed" ? (
              <Btn disabled><Icon name="check" className="h-4 w-4" /> Borrowed</Btn>
            ) : state === "pending" ? (
              <Btn disabled>Request pending</Btn>
            ) : state === "reserved" ? (
              <Btn disabled><Icon name="clock" className="h-4 w-4" /> Reserved</Btn>
            ) : available ? (
              <Btn disabled={busy} onClick={() => performAction("borrow")}>
                {busy ? "Submitting…" : "Borrow"}
              </Btn>
            ) : (
              <Btn disabled={busy} onClick={() => performAction("reserve")}>
                {busy ? "Submitting…" : "Reserve"}
              </Btn>
            )}
          </div>
        </div>
      </Card>

      {related.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-semibold">More in {book.categoryName}</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((item) => (
              <Link key={item.id} to={`/catalog/${item.id}`}>
                <Card className="!p-3 transition hover:-translate-y-0.5">
                  <BookCover book={item} className="mb-2 h-32" />
                  <p className="truncate text-sm font-medium">{item.title}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
