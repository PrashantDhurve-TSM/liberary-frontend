import api from "./api.js";

export const authApi = {
  registerMember: (payload) => api.post("/auth/register/member", payload),
  registerLibrarian: (payload) => api.post("/auth/register/librarian", payload),
  registerAdmin: (payload) => api.post("/auth/admin/create", payload),
  login: (payload) => api.post("/auth/login", payload),
  staffLogin: (payload) => api.post("/auth/admin/login", payload),
  logout: () => api.post("/auth/logout"),
};

export default authApi;
