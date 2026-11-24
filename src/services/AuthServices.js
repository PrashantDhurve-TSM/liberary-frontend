import authApi from "./authApi.js";
import { getApiErrorMessage } from "./apiHelpers.js";

const postAuth = async (request, data) => {
  try {
    const response = await request(data);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "The request failed. Please try again."), {
      cause: error,
    });
  }
};

const registerMember = (data) => postAuth(authApi.registerMember, data);

const registerLibrarian = (data) => postAuth(authApi.registerLibrarian, data);

const registerAdmin = (data) => postAuth(authApi.registerAdmin, data);

const login = async ({ email, password }) => {
  try {
    const response = await authApi.login({ email, password });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error), { cause: error });
  }
};

const staffLogin = async ({ email, password }) => {
  try {
    const response = await authApi.staffLogin({ email, password });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error), { cause: error });
  }
};

const register = registerMember;

export const AuthService = {
  register,
  registerMember,
  registerLibrarian,
  registerAdmin,
  login,
  staffLogin,
};
