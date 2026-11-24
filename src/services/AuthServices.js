import authApi from "./authApi.js";

const getErrorMessage = (error) => {
  const responseData = error?.response?.data;
  const message =
    typeof responseData === "string"
      ? responseData
      : responseData?.message ?? responseData?.error?.message;
  const readableMessage = Array.isArray(message) ? message.join(", ") : message;

  if (typeof readableMessage === "string" && readableMessage.trim()) {
    return readableMessage;
  }
  if (!error?.response) {
    return "Could not connect to the library server. Check that it is running and try again.";
  }
  return error?.message || "The request failed. Please try again.";
};

const postAuth = async (request, data) => {
  try {
    const response = await request(data);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error), { cause: error });
  }
};

const registerMember = (data) =>
  postAuth(authApi.registerMember, data);

const registerLibrarian = (data) =>
  postAuth(authApi.registerLibrarian, data);

const registerAdmin = (data) =>
  postAuth(authApi.registerAdmin, data);

const login = async ({ email, password }) => {
  try {
    const response = await authApi.login({ email, password });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error), { cause: error });
  }
};

const staffLogin = async ({ email, password }) => {
  try {
    const response = await authApi.staffLogin({ email, password });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error), { cause: error });
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
