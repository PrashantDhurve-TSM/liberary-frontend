import api from "./api.js";

export const circulationApi = {
  lookup: (endpoint, params, config) => api.get(endpoint, { ...config, params }),
  getPendingLoans: (params, config) => api.get("/admin/loans", { ...config, params }),
  lookupMember: (params) => api.get("/admin/lookup/member", { params }),
  issueLoan: (payload) => api.post("/admin/loans/issue", payload),
  returnLoan: (payload) => api.post("/admin/loans/return", payload),
};

export default circulationApi;
