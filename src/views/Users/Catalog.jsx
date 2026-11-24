import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Icon from "../../components/Icon";
import {
  Badge,
  BookCover,
  Card,
  Empty,
  PageHeader,
  inputCls,
} from "../../components/Ui";
import { getApiErrorMessage, unwrapApiResponse } from "../../services/apiHelpers.js";
import catalogApi from "../../services/catalogApi.js";

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const query = params.get("q") || "";
  const category = params.get("category") || "";
  const onlyAvailable = params.get("available") === "1";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    // Category selection is a standalone catalog filter. Do not leave an
    // older search term active and make a valid category look empty when the
    // two filters happen to have no matching book in common.
    if (key === "category") next.delete("q");
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  useEffect(() => {
    const controller = new AbortController();
    catalogApi.getCategories({ signal: controller.signal })
      .then(({ data }) => {
        const result = unwrapApiResponse(data);
        if (!Array.isArray(result)) {
          throw new Error("The server returned invalid category data.");
        }
        setCategories(result);
      })
      .catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED") {
          setError(getApiErrorMessage(requestError));
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    catalogApi.getBooks({
        ...(query ? { q: query } : {}),
        ...(category ? { category } : {}),
        ...(onlyAvailable ? { availability: "available" } : {}),
        page,
        limit: 20,
      
    }, { signal: controller.signal })
      .then(({ data }) => {
        const result = unwrapApiResponse(data);
        if (!Array.isArray(result?.data) || !result?.meta) {
          throw new Error("The server returned invalid catalog data.");
        }
        setBooks(result.data);
        setMeta(result.meta);
      })
      .catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED") {
          setError(getApiErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [category, onlyAvailable, page, query]);

  const resultCount = `${meta.total} ${meta.total === 1 ? "title" : "titles"}`;

  return (
    <>
      <PageHeader title="Book catalog" subtitle={`${resultCount} in the library`} />
      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <Card className="mb-5 grid gap-3 !p-4 md:grid-cols-[1fr_220px_auto]">
        <div className="relative">
          <Icon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => update("q", event.target.value)}
            placeholder="Search by title, author or ISBN"
            className={`${inputCls} pl-9`}
          />
        </div>
        <select
          value={category}
          onChange={(event) => update("category", event.target.value)}
          className={inputCls}
        >
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item.id} value={item.slug}>{item.name}</option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/80 bg-white/70 px-3.5 py-2.5 text-sm">
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(event) => update("available", event.target.checked ? "1" : "")}
            className="h-4 w-4 rounded border-slate-300 text-prime focus:ring-prime"
          />
          Available only
        </label>
      </Card>

      {loading ? (
        <Card><p className="py-8 text-center text-sm text-slate-500">Loading catalog…</p></Card>
      ) : books.length === 0 ? (
        <Card>
          <Empty icon="search" title="No books found" text="Try a different title, author or category." />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            {books.map((book) => (
              <Link key={book.id} to={`/catalog/${book.id}`} className="group">
                <Card className="h-full !p-3 transition group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_36px_rgba(0,16,34,0.18)]">
                  <BookCover book={book} className="mb-3 h-44" />
                  <p className="truncate text-sm font-semibold">{book.title}</p>
                  <p className="mb-2 truncate text-xs text-slate-500">
                    {(book.authors ?? []).join(", ")}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    {book.availableCopies > 0
                      ? <Badge tone="green">{book.availableCopies} available</Badge>
                      : <Badge tone="red">Borrowed</Badge>}
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Icon name="star" className="h-3.5 w-3.5 fill-prime text-prime" />
                      {book.rating?.avg ?? 0}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
          {meta.totalPages > 1 && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => update("page", String(page - 1))}
                className="rounded-xl border border-white/80 bg-white/70 px-4 py-2 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-slate-500">Page {page} of {meta.totalPages}</span>
              <button
                type="button"
                disabled={page >= meta.totalPages}
                onClick={() => update("page", String(page + 1))}
                className="rounded-xl border border-white/80 bg-white/70 px-4 py-2 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
