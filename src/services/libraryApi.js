import api from "./api.js";
import authApi from "./authApi.js";
import catalogApi from "./catalogApi.js";
import memberApi from "./memberApi.js";
import paymentApi from "./paymentApi.js";
import adminApi from "./adminApi.js";
import circulationApi from "./circulationApi.js";
import reportApi from "./reportApi.js";

// Compatibility barrel. New pages should import the smallest feature service.
export const libraryApi = {
  get: (...args) => api.get(...args),
  post: (...args) => api.post(...args),
  patch: (...args) => api.patch(...args),
  delete: (...args) => api.delete(...args),
  ...authApi,
  ...catalogApi,
  ...memberApi,
  ...paymentApi,
  ...adminApi,
  getAdminDashboard: adminApi.getDashboard,
  getReservationsAdmin: adminApi.getReservations,
  cancelAdminReservation: adminApi.cancelReservation,
  ...circulationApi,
  ...reportApi,
};

export { authApi, catalogApi, memberApi, paymentApi, adminApi, circulationApi, reportApi };
export default libraryApi;
