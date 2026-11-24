import api from "./api.js";

export const paymentApi = {
  getFines: (config) => api.get("/me/fines", config),
  getPayments: (config) => api.get("/me/payments", config),
  payFines: (fineIds, config) => api.post("/payments/demo", { fineIds }, config),
  downloadReceipt: (id) => api.get(`/payments/${id}/receipt`, { responseType: "blob" }),
  getAdminFines: (params, config) => api.get("/admin/fines", { ...config, params }),
  payAdminFine: (id, payload) => api.post(`/admin/fines/${id}/pay`, payload),
  waiveFine: (id, payload) => api.post(`/admin/fines/${id}/waive`, payload),
  createFine: (payload) => api.post("/admin/fines", payload),
};

export default paymentApi;
