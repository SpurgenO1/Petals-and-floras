import axios from "axios";

class ApiRequestError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = "ApiRequestError";
    this.response = originalError?.response;
    this.code = originalError?.code;
    this.originalError = originalError;
  }
}

const getWindowOrigin = () => {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "http://127.0.0.1:8000";
};

const normalizeApiBaseUrl = (value) => {
  if (!value) {
    return "";
  }

  try {
    const normalized = new URL(value, getWindowOrigin()).toString();
    return normalized.endsWith("/") ? normalized : `${normalized}/`;
  } catch {
    return "";
  }
};

const isLoopbackHost = (hostname) => ["localhost", "127.0.0.1", "::1"].includes(String(hostname || "").toLowerCase());

const alignLocalApiHost = (value) => {
  if (typeof window === "undefined" || !value) {
    return value;
  }

  try {
    const apiUrl = new URL(value, getWindowOrigin());
    const pageUrl = new URL(getWindowOrigin());
    if (apiUrl.protocol === pageUrl.protocol && isLoopbackHost(apiUrl.hostname) && isLoopbackHost(pageUrl.hostname)) {
      apiUrl.hostname = pageUrl.hostname;
      return apiUrl.toString();
    }
  } catch {
    return value;
  }

  return value;
};

const buildSameOriginApiUrl = () => new URL("/api/", getWindowOrigin()).toString();

const getDefaultApiBaseUrl = () => {
  const configuredApiBaseUrl = normalizeApiBaseUrl(process.env.REACT_APP_API_BASE_URL);
  if (configuredApiBaseUrl) {
    return alignLocalApiHost(configuredApiBaseUrl);
  }

  if (typeof window !== "undefined") {
    return buildSameOriginApiUrl();
  }

  return "http://127.0.0.1:8000/api/";
};

const API_BASE_URL = getDefaultApiBaseUrl();
const SAME_ORIGIN_API_BASE_URL = buildSameOriginApiUrl();
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

let csrfPromise = null;
let refreshPromise = null;
let runtimeAuthUser = null;

const isNetworkError = (error) => error?.code === "ERR_NETWORK" || !error?.response;

const extractResponseErrorMessage = (data) => {
  if (!data) {
    return "";
  }

  if (typeof data === "string") {
    return data;
  }

  if (typeof data.error === "string" && data.error.trim()) {
    return data.error;
  }

  if (typeof data.detail === "string" && data.detail.trim()) {
    return data.detail;
  }

  const firstValue = Object.values(data).find((value) => {
    if (typeof value === "string") return value.trim();
    if (Array.isArray(value)) return value.length > 0;
    return false;
  });

  if (typeof firstValue === "string") {
    return firstValue;
  }

  if (Array.isArray(firstValue) && firstValue[0]) {
    return String(firstValue[0]);
  }

  return "";
};

const normalizeError = (error) => {
  const apiError = extractResponseErrorMessage(error?.response?.data);
  if (apiError) {
    return new ApiRequestError(apiError, error);
  }

  const status = error?.response?.status;
  if (status === 401) {
    return new ApiRequestError("Please login to continue.", error);
  }
  if (status === 403) {
    return new ApiRequestError("Your request could not be completed.", error);
  }
  if (status === 429) {
    return new ApiRequestError("Too many requests. Please wait and try again.", error);
  }
  if (status >= 500) {
    return new ApiRequestError("Something went wrong. Please try again.", error);
  }

  return new ApiRequestError("Something went wrong. Please try again.", error);
};

const fetchCsrfToken = async (baseUrl) => {
  const response = await axios.get(new URL("auth/csrf/", baseUrl).toString(), {
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  return response.data?.csrfToken || "";
};

const ensureCsrfToken = async (baseUrl = API_BASE_URL) => {
  if (!csrfPromise) {
    csrfPromise = fetchCsrfToken(baseUrl)
      .catch(async (error) => {
        if (baseUrl !== SAME_ORIGIN_API_BASE_URL && isNetworkError(error)) {
          return fetchCsrfToken(SAME_ORIGIN_API_BASE_URL);
        }
        throw error;
      })
      .finally(() => {
        csrfPromise = null;
      });
  }

  return csrfPromise;
};

const refreshSession = async () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(new URL("auth/refresh/", API_BASE_URL).toString(), {}, {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      })
      .catch(async (error) => {
        if (SAME_ORIGIN_API_BASE_URL !== API_BASE_URL && isNetworkError(error)) {
          return axios.post(new URL("auth/refresh/", SAME_ORIGIN_API_BASE_URL).toString(), {}, {
            withCredentials: true,
            headers: {
              "Content-Type": "application/json",
              "X-Requested-With": "XMLHttpRequest",
            },
          });
        }
        throw error;
      })
      .then((response) => {
        runtimeAuthUser = response.data?.user || runtimeAuthUser;
        return response;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

api.interceptors.request.use(
  async (config) => {
    const method = String(config.method || "get").toUpperCase();
    config.withCredentials = true;

    if (config.data instanceof FormData && config.headers) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }

    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      const requestBaseUrl = config.baseURL || API_BASE_URL;
      const csrfToken = await ensureCsrfToken(requestBaseUrl);
      if (csrfToken) {
        config.headers["X-CSRFToken"] = csrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(normalizeError(error))
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error?.response?.status;
    const requestUrl = String(originalRequest.url || "");
    const isAuthRefreshCall = requestUrl.includes("auth/refresh/");
    const isAuthLoginCall = requestUrl.includes("auth/login/");
    const isAuthRegisterCall = requestUrl.includes("auth/register/");

    if (isNetworkError(error) && (originalRequest.baseURL || API_BASE_URL) !== SAME_ORIGIN_API_BASE_URL) {
      originalRequest.baseURL = SAME_ORIGIN_API_BASE_URL;
      return api(originalRequest);
    }

    if (status === 401 && !originalRequest._retry && !isAuthRefreshCall && !isAuthLoginCall && !isAuthRegisterCall) {
      originalRequest._retry = true;
      try {
        await refreshSession();
        return api(originalRequest);
      } catch {
        runtimeAuthUser = null;
      }
    }

    return Promise.reject(normalizeError(error));
  }
);

const request = (config) => api.request(config);

export const getUserFacingError = (error, fallback = "Something went wrong. Please try again.") =>
  error instanceof Error && error.message ? error.message : fallback;

export const setRuntimeAuthUser = (user) => {
  runtimeAuthUser = user && typeof user === "object" ? user : null;
};

export const getStoredAuthUser = () => runtimeAuthUser;

export const getProducts = () => request({ method: "get", url: "products/" });
export const getSystemStatus = () => request({ method: "get", url: "status/" });
export const createOrder = (payload) => request({ method: "post", url: "order/", data: payload });
export const createPaymentOrder = (amountInPaise) =>
  request({ method: "post", url: "payment/create/", data: { amount: amountInPaise } });
export const verifyPaymentOrder = (payload) =>
  request({ method: "post", url: "payment/verify/", data: payload });
export const getDeliveryOptions = (date) => {
  const search = date ? `?date=${encodeURIComponent(date)}` : "";
  return request({ method: "get", url: `delivery/options/${search}` });
};
export const getCurrentUser = () => request({ method: "get", url: "auth/me/" });
export const getOrderHistory = () => request({ method: "get", url: "orders/history/" });
export const getAdminOverview = () => request({ method: "get", url: "admin/overview/" });
export const getAdminProducts = () => request({ method: "get", url: "admin/products/" });
export const createAdminProduct = (payload) => request({ method: "post", url: "admin/products/", data: payload });
export const updateAdminProduct = (productId, payload) =>
  request({ method: "patch", url: `admin/products/${productId}/`, data: payload });
export const deleteAdminProduct = (productId) => request({ method: "delete", url: `admin/products/${productId}/` });
export const getAdminOrders = () => request({ method: "get", url: "admin/orders/" });
export const updateAdminOrder = (orderId, payload) =>
  request({ method: "patch", url: `admin/orders/${orderId}/`, data: payload });
export const getAdminOrderHistory = () => request({ method: "get", url: "admin/order-history/" });
export const getAdminFeedback = () => request({ method: "get", url: "admin/feedback/" });
export const updateAdminFeedback = (feedbackId, payload) =>
  request({ method: "patch", url: `admin/feedback/${feedbackId}/`, data: payload });
export const getAdminUsers = () => request({ method: "get", url: "admin/users/" });
export const updateAdminUser = (userId, payload) =>
  request({ method: "patch", url: `admin/users/${userId}/`, data: payload });
export const createAdminStaffUser = (payload) =>
  request({ method: "post", url: "admin/users/create-staff/", data: payload });
export const getAdminGroups = () => request({ method: "get", url: "admin/groups/" });
export const getFeedback = () => request({ method: "get", url: "feedback/" });
export const createFeedback = (payload) => request({ method: "post", url: "feedback/create/", data: payload });
export const getCsrfToken = () => ensureCsrfToken();
export const registerUser = (payload) => request({ method: "post", url: "auth/register/", data: payload });
export const loginUser = (payload) => request({ method: "post", url: "auth/login/", data: payload });
export const logoutUser = () => request({ method: "post", url: "auth/logout/" });

export const getAdminBaseUrl = () => {
  const explicitAdminBaseUrl = normalizeApiBaseUrl(process.env.REACT_APP_DJANGO_ADMIN_BASE_URL);
  if (explicitAdminBaseUrl) {
    const localAdminBaseUrl = alignLocalApiHost(explicitAdminBaseUrl);
    return localAdminBaseUrl.endsWith("/") ? localAdminBaseUrl : `${localAdminBaseUrl}/`;
  }

  const resolved = new URL(API_BASE_URL, getWindowOrigin());
  const normalizedPath = resolved.pathname.endsWith("/") ? resolved.pathname : `${resolved.pathname}/`;
  resolved.pathname = normalizedPath.endsWith("/api/")
    ? normalizedPath.slice(0, -5) + "/admin/"
    : `${normalizedPath}admin/`;
  resolved.search = "";
  resolved.hash = "";
  return resolved.toString();
};

export const getAdminUrlForPath = (pathname = "", search = "", hash = "") => {
  const adminBaseUrl = getAdminBaseUrl();
  const base = new URL(adminBaseUrl, getWindowOrigin());
  const normalizedPathname = String(pathname || "").replace(/^\/+/, "");
  const adminPrefix = "admin/";
  const relativePath = normalizedPathname.startsWith(adminPrefix)
    ? normalizedPathname.slice(adminPrefix.length)
    : normalizedPathname;

  base.pathname = `${base.pathname.replace(/\/+$/, "")}/${relativePath}`.replace(/\/{2,}/g, "/");
  base.search = search || "";
  base.hash = hash || "";
  return base.toString();
};
