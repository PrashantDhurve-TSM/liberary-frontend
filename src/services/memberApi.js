import api from "./api.js";

export const memberApi = {
  getDashboard: (config) => api.get("/me/dashboard", config),
  getProfile: (config) => api.get("/me", config),
  updateProfile: (payload) => api.patch("/me", payload),
  changePassword: (payload) => api.post("/me/change-password", payload),
  getLoans: (params, config) => api.get("/me/loans", { ...config, params }),
  getReservations: (config) => api.get("/me/reservations", config),
  renewLoan: (id) => api.post(`/loans/${id}/renew`),
  requestReturn: (id) => api.post(`/loans/${id}/return-request`),
  cancelReservation: (id) => api.delete(`/reservations/${id}`),
};

export default memberApi;
