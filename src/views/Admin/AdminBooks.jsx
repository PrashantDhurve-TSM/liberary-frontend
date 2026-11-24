import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import Icon from "../../components/Icon";
import {
  Badge,
  Btn,
  BookCover,
  Card,
  Empty,
  Field,
  inputCls,
  Modal,
  PageHeader,
  Table,
  td,
  useToast,
} from "../../components/Ui";
import { getApiErrorMessage, unwrapApiResponse } from "../../services/apiHelpers.js";
import catalogApi from "../../services/catalogApi.js";
import { downloadBlob } from "../../services/downloadFile.js";
import { selectAuthUser } from "../../store/Slice/userSlice..js";

const blankBook = {
  title: "",
  authors: "",
  isbn: "",
  category: "",
  shelfLocation: "",
  totalCopies: 1,
};

export default function AdminBooks() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const [categoryFilter, setCategoryFilter] = useState("");
  const [form, setForm] = useState(null);
  const [categoryForm, setCategoryForm] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [categoryImportOpen, setCategoryImportOpen] = useState(false);
  const [categoryImportFile, setCategoryImportFile] = useState(null);
  const [categoryImportResult, setCategoryImportResult] = useState(null);
  const [addingCopies, setAddingCopies] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, show] = useToast();
  const user = useSelector(selectAuthUser);
  const isAdmin = user?.role === "admin";

  const refreshBooks = useCallback(async (nextPage = 1, signal) => {
    const { data } = await catalogApi.getAdminBooks({
      ...(query.trim() ? { q: query.trim() } : {}),
      ...(categoryFilter ? { category: categoryFilter } : {}),
      page: nextPage,
      limit: 20,
    }, { signal });
    const result = unwrapApiResponse(data);
    if (!Array.isArray(result?.data) || !result?.meta) {
      throw new Error("The server returned invalid catalog data.");
    }
    setBooks(result.data);
    setMeta(result.meta);
    setPage(result.meta.page);
  }, [categoryFilter, query]);

  const refreshCategories = useCallback(async (signal) => {
    const { data } = await catalogApi.getCategories({ signal });
    const result = unwrapApiResponse(data);
    if (!Array.isArray(result)) {
      throw new Error("The server returned invalid category data.");
    }
    setCategories(result);
    return result;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refreshCategories(controller.signal)
      .catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED") {
          show(getApiErrorMessage(requestError));
        }
      });
    return () => controller.abort();
  }, [refreshCategories, show]);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setLoading(true);
      refreshBooks(1, controller.signal)
        .catch((requestError) => {
          if (requestError.code !== "ERR_CANCELED") {
            show(getApiErrorMessage(requestError));
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [refreshBooks, show]);

  const list = books;

  const openNewBook = () => {
    setForm({ ...blankBook, category: categories[0]?.id ?? "" });
  };

  const openNewCategory = () => {
    setCategoryForm({ name: "", description: "" });
  };

  const openEditBook = (book) => {
    setForm({
      id: book.id,
      title: book.title,
      authors: (book.authors ?? []).join(", "),
      isbn: book.isbn ?? "",
      category: categories.find((item) => item.name === book.categoryName)?.id ?? "",
      shelfLocation: book.shelfLocation ?? "",
    });
  };

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const updateQuery = (value) => {
    const next = new URLSearchParams(params);
    if (value) next.set("q", value);
    else next.delete("q");
    next.delete("page");
    setParams(next, { replace: true });
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.authors.trim() || !form.category) {
      show("Enter a title, at least one author, and a category.");
      return;
    }
    const authors = form.authors
      .split(",")
      .map((author) => author.trim())
      .filter(Boolean);
    if (!authors.length) {
      show("Enter at least one author.");
      return;
    }
    const isbn = form.isbn.trim().replace(/[-\s]/g, "");
    if (isbn && !/^(?:\d{10}|\d{13})$/.test(isbn)) {
      show("ISBN must contain 10 or 13 digits.");
      return;
    }
    const payload = {
      title: form.title.trim(),
      authors,
      category: form.category,
      ...(isbn ? { isbn } : {}),
      ...(form.shelfLocation.trim()
        ? { shelfLocation: form.shelfLocation.trim() }
        : {}),
    };

    if (
      !form.id &&
      (!Number.isInteger(Number(form.totalCopies)) ||
        Number(form.totalCopies) < 1 ||
        Number(form.totalCopies) > 500)
    ) {
      show("Enter a copy count between 1 and 500.");
      return;
    }

    setSaving(true);
    try {
      if (form.id) {
        await catalogApi.updateBook(form.id, payload);
        show("Book updated.");
      } else {
        await catalogApi.createBook({
          ...payload,
          totalCopies: Number(form.totalCopies),
        });
        show("Book added.");
      }
      setForm(null);
      await refreshBooks(form.id ? page : 1);
    } catch (requestError) {
      show(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const saveCategory = async (event) => {
    event.preventDefault();
    const name = categoryForm.name.trim();
    const description = categoryForm.description.trim();
    if (!name || name.length > 80 || description.length > 500) {
      show("Enter a category name (up to 80 characters) and description (up to 500 characters).");
      return;
    }

    setSaving(true);
    try {
      const { data } = await catalogApi.createCategory({
        name,
        ...(description ? { description } : {}),
      });
      const created = unwrapApiResponse(data);
      const id =
        typeof created?.id === "string"
          ? created.id
          : typeof created?._id === "string"
            ? created._id
            : "";
      if (!id) {
        throw new Error("The server did not return the new category ID.");
      }
      setCategories((current) =>
        [...current, { id, name, ...(description ? { description } : {}) }].sort(
          (left, right) => left.name.localeCompare(right.name),
        ),
      );
      setCategoryForm(null);
      show("Category added. You can now add a book to it.");
    } catch (requestError) {
      show(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const closeImport = () => {
    setImportOpen(false);
    setImportFile(null);
    setImportResult(null);
  };

  const closeCategoryImport = () => {
    setCategoryImportOpen(false);
    setCategoryImportFile(null);
    setCategoryImportResult(null);
  };

  const downloadImportTemplate = async () => {
    try {
      const { data } = await catalogApi.getImportTemplate();
      downloadBlob(data, "catalog-import-template.xlsx");
    } catch (requestError) {
      show(getApiErrorMessage(requestError));
    }
  };

  const importCatalog = async (event) => {
    event.preventDefault();
    if (!importFile) {
      show("Choose an .xlsx workbook first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", importFile);
    setSaving(true);
    try {
      const { data } = await catalogApi.importBooks(formData);
      const result = unwrapApiResponse(data);
      setImportResult(result);
      setImportFile(null);
      await Promise.all([refreshCategories(), refreshBooks(1)]);
      show(`Imported ${result.booksCreated} books.`);
    } catch (requestError) {
      show(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const downloadCategoryImportTemplate = async () => {
    try {
      const { data } = await catalogApi.getCategoryImportTemplate();
      downloadBlob(data, "category-import-template.xlsx");
    } catch (requestError) {
      show(getApiErrorMessage(requestError));
    }
  };

  const importCategories = async (event) => {
    event.preventDefault();
    if (!categoryImportFile) {
      show("Choose an .xlsx workbook first.");
      return;
    }
    const formData = new FormData();
    formData.append("file", categoryImportFile);
    setSaving(true);
    try {
      const { data } = await catalogApi.importCategories(formData);
      const result = unwrapApiResponse(data);
      setCategoryImportResult(result);
      setCategoryImportFile(null);
      await refreshCategories();
      show(`Imported ${result.categoriesCreated} categories.`);
    } catch (requestError) {
      show(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const addCopies = async (event) => {
    event.preventDefault();
    const count = Number(addingCopies.count);
    if (!Number.isInteger(count) || count < 1 || count > 500) {
      show("Enter a copy count between 1 and 500.");
      return;
    }
    setSaving(true);
    try {
      await catalogApi.addCopies(addingCopies.book.id, count);
      setAddingCopies(null);
      show(`${count} ${count === 1 ? "copy" : "copies"} added.`);
      await refreshBooks(page);
    } catch (requestError) {
      show(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const archiveBook = async () => {
    if (!archiveTarget) return;
    setSaving(true);
    try {
      await catalogApi.archiveBook(archiveTarget.id);
      setArchiveTarget(null);
      show("Book archived.");
      await refreshBooks(page);
    } catch (requestError) {
      show(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const goToPage = async (nextPage) => {
    setLoading(true);
    try {
      await refreshBooks(nextPage);
    } catch (requestError) {
      show(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Books"
        subtitle={`${meta.total} titles in the catalog`}
        action={
          <div className="flex gap-2">
            <Btn variant="soft" onClick={() => setImportOpen(true)}>
              <Icon name="upload" className="h-4 w-4" /> Bulk import books
            </Btn>
            <Btn variant="soft" onClick={openNewCategory}>
              <Icon name="plus" className="h-4 w-4" /> Add category
            </Btn>
            <Btn variant="soft" onClick={() => setCategoryImportOpen(true)}>
              <Icon name="upload" className="h-4 w-4" /> Bulk import categories
            </Btn>
            <Btn onClick={openNewBook} disabled={!categories.length}>
              <Icon name="plus" className="h-4 w-4" /> Add book
            </Btn>
          </div>
        }
      />

      <Card className="mb-4 grid gap-3 !p-4 md:grid-cols-[1fr_220px]">
        <div className="relative">
          <Icon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            maxLength={120}
            placeholder="Search title, author or ISBN"
            className={`${inputCls} pl-9`}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className={inputCls}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug || category.id}>{category.name}</option>
          ))}
        </select>
      </Card>



      <Card>
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading catalog…</p>
        ) : list.length === 0 ? (
          <Empty icon="search" title="No books match your search" />
        ) : (
          <Table head={["Book", "ISBN", "Category", "Copies", "Status", "Actions"]}>
            {list.map((book) => (
              <tr key={book.id}>
                <td className={td}>
                  <div className="flex items-center gap-3">
                    <BookCover book={book} className="h-12 w-9 !p-1 [&>p]:hidden" />
                    <div>
                      <p className="font-medium">{book.title}</p>
                      <p className="text-xs text-slate-500">{(book.authors ?? []).join(", ")}</p>
                    </div>
                  </div>
                </td>
                <td className={td}>{book.isbn || "—"}</td>
                <td className={td}>{book.categoryName}</td>
                <td className={td}>{book.availableCopies} available of {book.totalCopies}</td>
                <td className={td}>
                  {book.status === "active"
                    ? <Badge tone={book.availableCopies > 0 ? "green" : "red"}>{book.availableCopies > 0 ? "Available" : "Out of stock"}</Badge>
                    : <Badge tone="slate">Archived</Badge>}
                </td>
                <td className={`${td} space-x-2`}>
                  <Btn variant="soft" className="!py-1.5" onClick={() => openEditBook(book)}>Edit</Btn>
                  <Btn
                    variant="soft"
                    className="!py-1.5"
                    onClick={() => setAddingCopies({ book, count: "1" })}
                  >
                    Add copies
                  </Btn>
                  {isAdmin && book.status === "active" && (
                    <Btn
                      variant="danger"
                      className="!py-1.5"
                      onClick={() => setArchiveTarget(book)}
                    >
                      Archive
                    </Btn>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal
        open={importOpen}
        onClose={closeImport}
        title={importResult ? "Book import results" : "Bulk import books"}
      >
        {importResult ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-center text-sm">
              <div className="rounded-xl bg-white/70 p-3">
                <p className="text-lg font-semibold">{importResult.booksCreated}</p>
                <p className="text-xs text-slate-500">Books</p>
              </div>
              <div className="rounded-xl bg-white/70 p-3">
                <p className="text-lg font-semibold">{importResult.errors.length}</p>
                <p className="text-xs text-slate-500">Rows with errors</p>
              </div>
            </div>
            {importResult.errors.length > 0 && (
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-red-200 bg-red-50/70 p-3 text-sm">
                {importResult.errors.map((error, index) => (
                  <p key={`${error.sheet}-${error.row}-${index}`}>
                    <span className="font-medium">{error.sheet}, row {error.row}:</span> {error.message}
                  </p>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <Btn onClick={closeImport}>Done</Btn>
            </div>
          </div>
        ) : (
          <form onSubmit={importCatalog} className="space-y-4">
            <p className="text-sm text-slate-600">
              Use the <span className="font-medium">Books</span>-only template. Every book must reference an existing category by name; authors and tags may be comma-separated.
            </p>
            <Btn type="button" variant="soft" onClick={downloadImportTemplate}>
              <Icon name="bookreturn" className="h-4 w-4" /> Download template
            </Btn>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Excel workbook (.xlsx, up to 5 MB)</span>
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                className={inputCls}
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Btn type="button" variant="soft" onClick={closeImport}>Cancel</Btn>
              <Btn type="submit" disabled={saving || !importFile}>{saving ? "Importing…" : "Import workbook"}</Btn>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={categoryImportOpen}
        onClose={closeCategoryImport}
        title={categoryImportResult ? "Category import results" : "Bulk import categories"}
      >
        {categoryImportResult ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-center text-sm">
              <div className="rounded-xl bg-white/70 p-3">
                <p className="text-lg font-semibold">{categoryImportResult.categoriesCreated}</p>
                <p className="text-xs text-slate-500">Categories</p>
              </div>
              <div className="rounded-xl bg-white/70 p-3">
                <p className="text-lg font-semibold">{categoryImportResult.errors.length}</p>
                <p className="text-xs text-slate-500">Rows with errors</p>
              </div>
            </div>
            {categoryImportResult.errors.length > 0 && (
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-red-200 bg-red-50/70 p-3 text-sm">
                {categoryImportResult.errors.map((error, index) => (
                  <p key={`${error.sheet}-${error.row}-${index}`}>
                    <span className="font-medium">{error.sheet}, row {error.row}:</span> {error.message}
                  </p>
                ))}
              </div>
            )}
            <div className="flex justify-end"><Btn onClick={closeCategoryImport}>Done</Btn></div>
          </div>
        ) : (
          <form onSubmit={importCategories} className="space-y-4">
            <p className="text-sm text-slate-600">Use the <span className="font-medium">Categories</span>-only template with category name and description columns.</p>
            <Btn type="button" variant="soft" onClick={downloadCategoryImportTemplate}>
              <Icon name="bookreturn" className="h-4 w-4" /> Download category template
            </Btn>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => setCategoryImportFile(event.target.files?.[0] ?? null)}
              className={inputCls}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Btn type="button" variant="soft" onClick={closeCategoryImport}>Cancel</Btn>
              <Btn type="submit" disabled={saving || !categoryImportFile}>{saving ? "Importing…" : "Import categories"}</Btn>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit book" : "Add new book"}>
        {form && (
          <form onSubmit={save} className="space-y-3">
            <Field label="Title" name="title" value={form.title} onChange={onChange} required maxLength={200} />
            <Field
              label="Authors (comma-separated)"
              name="authors"
              value={form.authors}
              onChange={onChange}
              required
            />
            <Field label="ISBN" name="isbn" value={form.isbn} onChange={onChange} />
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Category</span>
              <select name="category" value={form.category} onChange={onChange} className={inputCls} required>
                <option value="">Choose category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            {!form.id && (
              <Field
                label="Copies"
                name="totalCopies"
                type="number"
                min="1"
                max="500"
                value={form.totalCopies}
                onChange={onChange}
                required
              />
            )}
            <Field
              label="Shelf location"
              name="shelfLocation"
              placeholder="T-12"
              value={form.shelfLocation}
              onChange={onChange}
              maxLength={80}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Btn type="button" variant="soft" onClick={() => setForm(null)}>Cancel</Btn>
              <Btn type="submit" disabled={saving}>{saving ? "Saving…" : "Save book"}</Btn>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={!!categoryForm}
        onClose={() => setCategoryForm(null)}
        title="Add category"
      >
        {categoryForm && (
          <form onSubmit={saveCategory} className="space-y-3">
            <Field
              label="Category name"
              value={categoryForm.name}
              onChange={(event) =>
                setCategoryForm({ ...categoryForm, name: event.target.value })
              }
              maxLength={80}
              required
            />
            <Field
              label="Description (optional)"
              value={categoryForm.description}
              onChange={(event) =>
                setCategoryForm({
                  ...categoryForm,
                  description: event.target.value,
                })
              }
              maxLength={500}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Btn
                type="button"
                variant="soft"
                onClick={() => setCategoryForm(null)}
              >
                Cancel
              </Btn>
              <Btn type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save category"}
              </Btn>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={!!addingCopies}
        onClose={() => setAddingCopies(null)}
        title="Add book copies"
      >
        {addingCopies && (
          <form onSubmit={addCopies} className="space-y-4">
            <p className="text-sm text-slate-600">{addingCopies.book.title}</p>
            <Field
              label="Number of copies"
              type="number"
              min="1"
              max="500"
              value={addingCopies.count}
              onChange={(event) => setAddingCopies({ ...addingCopies, count: event.target.value })}
              required
            />
            <div className="flex justify-end gap-2">
              <Btn type="button" variant="soft" onClick={() => setAddingCopies(null)}>Cancel</Btn>
              <Btn type="submit" disabled={saving}>{saving ? "Adding…" : "Add copies"}</Btn>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!archiveTarget} onClose={() => setArchiveTarget(null)} title="Archive this book?">
        <p className="mb-5 text-sm text-slate-600">
          <span className="font-medium text-slate-900">{archiveTarget?.title}</span> will be hidden from the catalog. Loan history is kept.
        </p>
        <div className="flex justify-end gap-2">
          <Btn variant="soft" onClick={() => setArchiveTarget(null)}>Cancel</Btn>
          <Btn onClick={archiveBook} disabled={saving}>{saving ? "Archiving…" : "Archive"}</Btn>
        </div>
      </Modal>
            {meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Btn variant="soft" disabled={loading || page <= 1} onClick={() => goToPage(page - 1)}>Previous</Btn>
          <span className="text-sm text-slate-500">Page {page} of {meta.totalPages}</span>
          <Btn variant="soft" disabled={loading || page >= meta.totalPages} onClick={() => goToPage(page + 1)}>Next</Btn>
        </div>
      )}
    </>
  );
}
