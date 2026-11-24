import api from "./api.js";

export const catalogApi = {
  getCategories: (config) => api.get("/categories", config),
  getBooks: (params, config) => api.get("/books", { ...config, params }),
  getBook: (id, config) => api.get(`/books/${id}`, config),
  borrowBook: (id, action) => api.post(`/books/${id}/${action}`),
  getAdminBooks: (params, config) => api.get("/admin/books", { ...config, params }),
  createBook: (payload) => api.post("/admin/books", payload),
  updateBook: (id, payload) => api.patch(`/admin/books/${id}`, payload),
  createCategory: (payload) => api.post("/admin/categories", payload),
  getImportTemplate: () => api.get("/admin/books/import-template", { responseType: "blob" }),
  importBooks: (formData) => api.post("/admin/books/import", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  getCategoryImportTemplate: () => api.get("/admin/categories/import-template", { responseType: "blob" }),
  importCategories: (formData) => api.post("/admin/categories/import", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  addCopies: (id, count) => api.post(`/admin/books/${id}/copies`, { count }),
  archiveBook: (id) => api.delete(`/admin/books/${id}`),
};

export default catalogApi;
