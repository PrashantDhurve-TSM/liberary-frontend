export const unwrapApiResponse = (response) =>
  response?.success === true ? response.data : response;

export const getApiErrorMessage = (
  error,
  fallback = "The request could not be completed.",
) => {
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
  return error?.message || fallback;
};
