import api from "./api.js";

export const reportApi = {
  getReport: (name, params, config) => api.get(`/admin/reports/${name}`, { ...config, params }),
  exportReport: (params) => api.get("/admin/reports/export", { params, responseType: "blob" }),
};

export default reportApi;
