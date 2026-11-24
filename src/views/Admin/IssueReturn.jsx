import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "../../components/Icon";
import {
  Badge,
  Btn,
  Card,
  Empty,
  Field,
  inputCls,
  PageHeader,
  Table,
  td,
  useToast,
} from "../../components/Ui";
import { getApiErrorMessage, unwrapApiResponse } from "../../services/apiHelpers.js";
import circulationApi from "../../services/circulationApi.js";

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

const getRequestError = (error) =>
  error instanceof Error && !error.response
    ? error.message
    : getApiErrorMessage(error);

function useDebouncedLookup(query, endpoint, copyStatus, enabled, show) {
  const [result, setResult] = useState({
    query: "",
    items: [],
    loading: false,
  });

  useEffect(() => {
    const search = query.trim();
    if (!enabled || search.length < 2) return undefined;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setResult({ query: search, items: [], loading: true });
      try {
        const { data } = await circulationApi.lookup(
          endpoint,
          { q: search, ...(copyStatus ? { copyStatus } : {}) },
          { signal: controller.signal },
        );
        const searchResults = unwrapApiResponse(data);
        if (!Array.isArray(searchResults)) {
          throw new Error("The server returned invalid search results.");
        }
        if (!controller.signal.aborted) {
          setResult({ query: search, items: searchResults, loading: false });
        }
      } catch (error) {
        if (error?.code !== "ERR_CANCELED" && !controller.signal.aborted) {
          setResult({ query: search, items: [], loading: false });
          show(getRequestError(error));
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [copyStatus, enabled, endpoint, query, show]);

  const search = query.trim();
  const currentResult = result.query === search ? result : null;
  return {
    items: enabled ? currentResult?.items ?? [] : [],
    loading:
      enabled &&
      search.length >= 2 &&
      (!currentResult || currentResult.loading),
  };
}

export default function IssueReturn() {
  const [toast, show] = useToast();
  const [recent, setRecent] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [bookSearch, setBookSearch] = useState("");
  const [returnSearch, setReturnSearch] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [member, setMember] = useState(null);
  const [copy, setCopy] = useState(null);
  const [returnCopy, setReturnCopy] = useState(null);
  const [condition, setCondition] = useState("good");
  const [lookingUp, setLookingUp] = useState("");
  const [saving, setSaving] = useState("");
  const [pendingLoans, setPendingLoans] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const memberLookupVersion = useRef(0);
  const memberSuggestions = useDebouncedLookup(
    memberSearch,
    "/admin/lookup/members",
    "",
    !member,
    show,
  );
  const issueBookSuggestions = useDebouncedLookup(
    bookSearch,
    "/admin/lookup/books",
    "available",
    !copy,
    show,
  );
  const returnBookSuggestions = useDebouncedLookup(
    returnSearch,
    "/admin/lookup/books",
    "issued",
    !returnCopy,
    show,
  );

  const refreshPendingLoans = useCallback(async (signal) => {
    const { data } = await circulationApi.getPendingLoans(
      { status: "pending", page: 1, limit: 100 },
      { signal },
    );
    const result = unwrapApiResponse(data);
    if (!Array.isArray(result?.data)) {
      throw new Error("The server returned invalid pending-loan data.");
    }
    setPendingLoans(result.data);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refreshPendingLoans(controller.signal)
      .catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED") {
          show(getRequestError(requestError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setPendingLoading(false);
      });
    return () => controller.abort();
  }, [refreshPendingLoans, show]);

  const selectMember = async (suggestion) => {
    const requestVersion = ++memberLookupVersion.current;
    setMember({
      ...suggestion,
      canBorrow: false,
      activeLoans: 0,
      unpaidFines: 0,
      checkingEligibility: true,
    });
    setMemberSearch(`${suggestion.name} · ${suggestion.memberId}`);
    setLookingUp("member");
    try {
      const { data } = await circulationApi.lookupMember({ q: suggestion.memberId });
      if (requestVersion === memberLookupVersion.current) {
        setMember(unwrapApiResponse(data));
      }
    } catch (requestError) {
      if (requestVersion === memberLookupVersion.current) {
        setMember(null);
        setMemberSearch("");
        show(getRequestError(requestError));
      }
    } finally {
      if (requestVersion === memberLookupVersion.current) setLookingUp("");
    }
  };

  const selectIssueBook = (book) => {
    const selectedCopy = book.copies[0];
    if (!selectedCopy) {
      show("No available copies were found for this title.");
      return;
    }
    setCopy({ ...selectedCopy, book });
    setBookSearch(`${book.title}${book.isbn ? ` · ISBN ${book.isbn}` : ""}`);
  };

  const selectReturnCopy = (book, selectedCopy) => {
    setReturnCopy({ ...selectedCopy, book });
    setReturnSearch(
      `${book.title}${book.isbn ? ` · ISBN ${book.isbn}` : ""}`,
    );
  };

  const issue = async (event) => {
    event.preventDefault();
    if (!member || !copy) {
      show("Select an eligible member and an available book first.");
      return;
    }
    if (!member.canBorrow) {
      show("This member is not currently eligible to borrow.");
      return;
    }
    if (copy.status !== "available") {
      show("This book is not available to issue.");
      return;
    }

    setSaving("issue");
    try {
      const { data } = await circulationApi.issueLoan({
        memberId: member.memberId,
        barcode: copy.barcode,
        ...(dueAt ? { dueAt: new Date(`${dueAt}T23:59:59`).toISOString() } : {}),
      });
      const result = unwrapApiResponse(data);
      setRecent((items) => [{
        id: result?.loanId ?? `${Date.now()}-issue`,
        type: "Issued",
        member: member.name,
        book: copy.book.title,
        note: result?.dueAt ? `Due ${dateLabel(result.dueAt)}` : "Issued using current policy",
      }, ...items]);
      setMemberSearch("");
      setBookSearch("");
      setDueAt("");
      setMember(null);
      setCopy(null);
      show(`Issued to ${member.name}.`);
      try {
        await refreshPendingLoans();
      } catch (requestError) {
        show(`Book issued, but pending requests could not be refreshed: ${getRequestError(requestError)}`);
      }
    } catch (requestError) {
      show(getRequestError(requestError));
    } finally {
      setSaving("");
    }
  };

  const approvePendingLoan = async (loan) => {
    setSaving(loan._id);
    try {
      await circulationApi.issueLoan({
        memberId: loan.snapshot.memberId,
        barcode: loan.snapshot.barcode,
      });
      setRecent((items) => [{
        id: loan._id,
        type: "Issued",
        member: loan.snapshot.memberName,
        book: loan.snapshot.title,
        note: "Borrow request approved",
      }, ...items]);
      show(`Issued to ${loan.snapshot.memberName}.`);
      try {
        await refreshPendingLoans();
      } catch (requestError) {
        show(`Request approved, but pending requests could not be refreshed: ${getRequestError(requestError)}`);
      }
    } catch (requestError) {
      show(getRequestError(requestError));
    } finally {
      setSaving("");
    }
  };

  const returnBook = async (event) => {
    event.preventDefault();
    if (!returnCopy || returnCopy.status !== "issued") {
      show("Select a book with an issued copy before processing a return.");
      return;
    }

    setSaving("return");
    try {
      const { data } = await circulationApi.returnLoan({
        barcode: returnCopy.barcode,
        condition,
      });
      const result = unwrapApiResponse(data);
      const fineAmount = result?.fine?.amount ?? result?.fineAmount ?? 0;
      setRecent((items) => [{
        id: result?.loanId ?? `${Date.now()}-return`,
        type: "Returned",
        member: returnCopy.currentLoan?.memberName ?? "—",
        book: returnCopy.book.title,
        note: fineAmount ? `Fine ${formatMoney(fineAmount)}` : "No fine",
      }, ...items]);
      setReturnSearch("");
      setReturnCopy(null);
      setCondition("good");
      show(fineAmount ? `Book returned. Fine: ${formatMoney(fineAmount)}.` : "Book returned.");
    } catch (requestError) {
      show(getRequestError(requestError));
    } finally {
      setSaving("");
    }
  };

  return (
    <>
      <PageHeader title="Issue and return" subtitle="Process circulation transactions at the desk." />

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <Icon name="plus" className="h-[18px] w-[18px] text-prime" /> Issue a book
          </h2>
          <form onSubmit={issue} className="space-y-3">
            <div className="relative">
              <Field
                label="Member name, email or member ID"
                placeholder="Search members (for example, Aarav or M-1001)"
                value={memberSearch}
                autoComplete="off"
                maxLength={100}
                onChange={(event) => {
                  memberLookupVersion.current += 1;
                  setMemberSearch(event.target.value);
                  setMember(null);
                  setLookingUp("");
                }}
              />
              {!member && memberSearch.trim().length >= 2 && (
                <div
                  role="listbox"
                  aria-label="Member suggestions"
                  className="absolute inset-x-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
                >
                  {memberSuggestions.loading ? (
                    <p className="px-3 py-2 text-sm text-slate-500">Searching members…</p>
                  ) : memberSuggestions.items.length ? (
                    memberSuggestions.items.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        role="option"
                        aria-selected="false"
                        onClick={() => selectMember(suggestion)}
                        className="block w-full rounded-lg px-3 py-2 text-left hover:bg-prime/5"
                      >
                        <span className="block text-sm font-medium">{suggestion.name}</span>
                        <span className="block text-xs text-slate-500">
                          {suggestion.memberId} · {suggestion.email}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-sm text-slate-500">No matching members found.</p>
                  )}
                </div>
              )}
            </div>
            {member && (
              <p className={`rounded-xl px-3 py-2 text-sm ${member?.canBorrow ? "bg-prime/5 text-prime" : member ? "bg-amber-50 text-amber-700" : "text-slate-500"}`}>
                {lookingUp === "member"
                  ? `Checking eligibility for ${member.name}…`
                  : `${member.name} · ${member.memberId} · ${member.membershipType} · ${member.activeLoans} active loans · ${formatMoney(member.unpaidFines)} due${member.canBorrow ? "" : " · not eligible"}`}
              </p>
            )}

            <div className="relative">
              <Field
                label="Book title or ISBN"
                placeholder="Search by title or ISBN"
                value={bookSearch}
                autoComplete="off"
                maxLength={100}
                onChange={(event) => {
                  setBookSearch(event.target.value);
                  setCopy(null);
                }}
              />
              {!copy && bookSearch.trim().length >= 2 && (
                <div
                  role="listbox"
                  aria-label="Available book suggestions"
                  className="absolute inset-x-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
                >
                  {issueBookSuggestions.loading ? (
                    <p className="px-3 py-2 text-sm text-slate-500">Searching books…</p>
                  ) : issueBookSuggestions.items.length ? (
                    issueBookSuggestions.items.map((book) => (
                      <button
                        key={book.id}
                        type="button"
                        role="option"
                        aria-selected="false"
                        onClick={() => selectIssueBook(book)}
                        className="block w-full rounded-lg px-3 py-2 text-left hover:bg-prime/5"
                      >
                        <span className="block text-sm font-medium">{book.title}</span>
                        <span className="block text-xs text-slate-500">
                          {book.isbn ? `ISBN ${book.isbn}` : book.bookId} · {book.availableCopies} available
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-sm text-slate-500">No available books match this search.</p>
                  )}
                </div>
              )}
            </div>
            {copy && (
              <p className={`rounded-xl px-3 py-2 text-sm ${copy?.status === "available" ? "bg-prime/5 text-prime" : copy ? "bg-amber-50 text-amber-700" : "text-slate-500"}`}>
                {`${copy.book.title} · ${copy.book.availableCopies} copies available. One copy will be selected automatically.`}
              </p>
            )}
            <Field
              label="Due date (optional)"
              type="date"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
            />
            <p className="text-xs text-slate-500">Leave blank to use the current library policy.</p>
            <Btn type="submit" className="w-full" disabled={saving === "issue"}>
              {saving === "issue" ? "Issuing…" : "Issue book"}
            </Btn>
          </form>
        </Card>

        <Card>
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <Icon name="repeat" className="h-[18px] w-[18px] text-prime" /> Return a book
          </h2>
          <form onSubmit={returnBook} className="space-y-3">
            <div className="relative">
              <Field
                label="Book title or ISBN"
                placeholder="Search for a book to return"
                value={returnSearch}
                autoComplete="off"
                maxLength={100}
                onChange={(event) => {
                  setReturnSearch(event.target.value);
                  setReturnCopy(null);
                }}
              />
              {!returnCopy && returnSearch.trim().length >= 2 && (
                <div
                  role="listbox"
                  aria-label="Issued book copy suggestions"
                  className="absolute inset-x-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
                >
                  {returnBookSuggestions.loading ? (
                    <p className="px-3 py-2 text-sm text-slate-500">Searching issued books…</p>
                  ) : returnBookSuggestions.items.some((book) => book.copies.length) ? (
                    returnBookSuggestions.items.flatMap((book) =>
                      book.copies.map((copyOption) => (
                        <button
                          key={`${book.id}-${copyOption.barcode}`}
                          type="button"
                          role="option"
                          aria-selected="false"
                          onClick={() => selectReturnCopy(book, copyOption)}
                          className="block w-full rounded-lg px-3 py-2 text-left hover:bg-prime/5"
                        >
                          <span className="block text-sm font-medium">{book.title}</span>
                          <span className="block text-xs text-slate-500">
                            {book.isbn ? `ISBN ${book.isbn}` : book.bookId}
                            {copyOption.currentLoan?.memberName
                              ? ` · Borrowed by ${copyOption.currentLoan.memberName}`
                              : ""}
                            {copyOption.currentLoan?.dueAt
                              ? ` · Due ${dateLabel(copyOption.currentLoan.dueAt)}`
                              : ""}
                          </span>
                        </button>
                      )),
                    )
                  ) : (
                    <p className="px-3 py-2 text-sm text-slate-500">No issued copies match this search.</p>
                  )}
                </div>
              )}
            </div>
            {returnCopy && (
              <p className={`rounded-xl px-3 py-2 text-sm ${returnCopy?.status === "issued" ? "bg-prime/5 text-prime" : returnCopy ? "bg-amber-50 text-amber-700" : "text-slate-500"}`}>
                {`${returnCopy.book.title} · borrowed by ${returnCopy.currentLoan?.memberName ?? "member"}${returnCopy.currentLoan?.dueAt ? ` · due ${dateLabel(returnCopy.currentLoan.dueAt)}` : ""}`}
              </p>
            )}
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Condition</span>
              <select value={condition} onChange={(event) => setCondition(event.target.value)} className={inputCls}>
                <option value="good">Good</option>
                <option value="damaged">Damaged</option>
                <option value="lost">Lost</option>
              </select>
            </label>
            <p className="text-xs text-slate-500">Applicable fees are calculated by the server’s current policy.</p>
            <Btn type="submit" className="w-full" disabled={saving === "return"}>
              {saving === "return" ? "Returning…" : "Mark returned"}
            </Btn>
          </form>
        </Card>
      </div>

      <Card className="mb-4">
        <h2 className="mb-3 font-semibold">Pending borrow requests</h2>
        {pendingLoading ? (
          <p className="py-6 text-center text-sm text-slate-500">Loading requests…</p>
        ) : pendingLoans.length === 0 ? (
          <Empty icon="check" title="No pending requests" />
        ) : (
          <Table head={["Member", "Book", "Requested", ""]}>
            {pendingLoans.map((loan) => (
              <tr key={loan._id}>
                <td className={`${td} font-medium`}>{loan.snapshot.memberName}</td>
                <td className={td}>{loan.snapshot.title}</td>
                <td className={td}>{dateLabel(loan.createdAt)}</td>
                <td className={td}>
                  <Btn
                    variant="soft"
                    className="!py-1.5"
                    disabled={saving === loan._id}
                    onClick={() => approvePendingLoan(loan)}
                  >
                    {saving === loan._id ? "Approving…" : "Approve and issue"}
                  </Btn>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">This session</h2>
        {recent.length === 0 ? (
          <Empty title="No transactions yet" text="Transactions processed here will appear in this list." />
        ) : (
          <Table head={["Action", "Member", "Book", "Note"]}>
            {recent.map((item) => (
              <tr key={item.id}>
                <td className={td}><Badge tone={item.type === "Issued" ? "prime" : "green"}>{item.type}</Badge></td>
                <td className={td}>{item.member}</td>
                <td className={td}>{item.book}</td>
                <td className={`${td} text-slate-500`}>{item.note}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {toast}
    </>
  );
}
