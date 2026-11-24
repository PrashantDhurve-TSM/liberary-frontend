import api from "./api.js";

export const adminApi = {
  getDashboard: (config) => api.get("/admin/dashboard", config),
  getMembers: () => api.get("/user"),
  getSettings: (config) => api.get("/admin/settings", config),
  updateMember: (id, payload) => api.patch(`/user/${id}`, payload),
  createMember: (payload) => api.post("/user/create/member", payload),
  getMemberImportTemplate: () =>
    api.get("/user/members/import-template", { responseType: "blob" }),
  importMembers: (formData) =>
    api.post("/user/members/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getReservations: (config) => api.get("/admin/reservations", config),
  notifyReservation: (id) => api.post(`/admin/reservations/${id}/notify`),
  cancelReservation: (id) => api.delete(`/admin/reservations/${id}`),
  getAuditLogs: (params, config) => api.get("/admin/audit-logs", { ...config, params }),
  createUser: (payload) => api.post("/user", payload),
  updateSettings: (payload) => api.patch("/admin/settings", payload),
};

export default adminApi;
