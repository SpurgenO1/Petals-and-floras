import axios from "axios";

const getWindowOrigin = () => {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return "http://127.0.0.1:8000";
};

const buildSameOriginApiUrl = () => new URL("/api/", getWindowOrigin()).toString();
const LOCAL_BACKEND_ORIGIN = "http://127.0.0.1:8000";

const isLocalFrontendDevOrigin = (origin) => {
  try {
    const parsed = new URL(origin);
    return ["127.0.0.1", "localhost"].includes(parsed.hostname) && parsed.port === "3000";
  } catch {
    return false;
  }
};

const isLocalApiHost = (value) => {
  try {
    const parsed = new URL(value, getWindowOrigin());
    return ["127.0.0.1", "localhost"].includes(parsed.hostname);
  } catch {
    return false;
  }
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

const getDefaultApiBaseUrl = () => {
  const configuredApiBaseUrl = normalizeApiBaseUrl(process.env.REACT_APP_API_BASE_URL);
  if (configuredApiBaseUrl) {
    if (process.env.NODE_ENV === "production" && isLocalApiHost(configuredApiBaseUrl)) {
      return buildSameOriginApiUrl();
    }
    return configuredApiBaseUrl;
  }

  if (typeof window !== "undefined") {
    return buildSameOriginApiUrl();
  }

  return "http://127.0.0.1:8000/api/";
};

const API_BASE_URL = getDefaultApiBaseUrl();
const SAME_ORIGIN_API_BASE_URL = buildSameOriginApiUrl();

// Validate base URL is https in production
if (process.env.NODE_ENV === "production" && !API_BASE_URL.startsWith("https://")) {
  console.warn("WARNING: API URL should use HTTPS in production");
}

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
});

const requestWithFallback = async (config) => {
  try {
    return await API.request(config);
  } catch (error) {
    const shouldRetryOnSameOrigin =
      error?.code === "ERR_NETWORK" &&
      typeof window !== "undefined" &&
      API_BASE_URL !== SAME_ORIGIN_API_BASE_URL;

    if (!shouldRetryOnSameOrigin) {
      throw error;
    }

    return axios.request({
      ...config,
      baseURL: SAME_ORIGIN_API_BASE_URL,
      withCredentials: true,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        ...(config.headers || {}),
      },
    });
  }
};

const getStoredAuthUser = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem("pf_auth_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const ensureCsrfToken = async () => {
  const response = await API.get("auth/csrf/");
  return response.data?.csrfToken || "";
};

// Request interceptor to add security headers
API.interceptors.request.use(
  async (config) => {
    const method = String(config.method || "get").toUpperCase();
    const storedAuthUser = getStoredAuthUser();

    if (storedAuthUser?.email) {
      config.headers["X-Debug-User-Email"] = storedAuthUser.email;
    }

    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      const csrfToken = await ensureCsrfToken();
      if (csrfToken) {
        config.headers["X-CSRFToken"] = csrfToken;
      }
    }

    // Add security headers
    config.headers["Content-Type"] = "application/json";
    config.headers["X-Requested-With"] = "XMLHttpRequest";

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle specific error cases
    if (error.response?.status === 403) {
      console.error("CSRF validation failed. Please refresh the page.");
    }
    if (error.response?.status === 429) {
      console.error("Too many requests. Please wait before trying again.");
    }
    if (error.response?.status >= 500) {
      console.error("Server error. Please contact support.");
    }
    return Promise.reject(error);
  }
);

export const getProducts = () => {
  try {
    return requestWithFallback({ method: "get", url: "products/" });
  } catch (error) {
    console.error("Failed to fetch products:", error);
    throw error;
  }
};

export const createOrder = (payload) => {
  // Validate payload
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid order payload");
  }
  
  try {
    return requestWithFallback({ method: "post", url: "order/", data: payload });
  } catch (error) {
    console.error("Failed to create order:", error);
    throw error;
  }
};

export const createPaymentOrder = (amountInPaise) => {
  // Validate amount
  if (!Number.isInteger(amountInPaise) || amountInPaise <= 0) {
    throw new Error("Invalid payment amount");
  }
  
  try {
    return requestWithFallback({ method: "post", url: "payment/create/", data: { amount: amountInPaise } });
  } catch (error) {
    console.error("Failed to create payment order:", error);
    throw error;
  }
};

export const getCurrentUser = () => requestWithFallback({ method: "get", url: "auth/me/" });
export const getAdminOverview = () => requestWithFallback({ method: "get", url: "admin/overview/" });
export const getAdminProducts = () => requestWithFallback({ method: "get", url: "admin/products/" });
export const createAdminProduct = (payload) => requestWithFallback({ method: "post", url: "admin/products/", data: payload });
export const updateAdminProduct = (productId, payload) => requestWithFallback({ method: "patch", url: `admin/products/${productId}/`, data: payload });
export const deleteAdminProduct = (productId) => requestWithFallback({ method: "delete", url: `admin/products/${productId}/` });
export const getAdminOrders = () => requestWithFallback({ method: "get", url: "admin/orders/" });
export const updateAdminOrder = (orderId, payload) => requestWithFallback({ method: "patch", url: `admin/orders/${orderId}/`, data: payload });
export const getAdminOrderHistory = () => requestWithFallback({ method: "get", url: "admin/order-history/" });
export const getAdminFeedback = () => requestWithFallback({ method: "get", url: "admin/feedback/" });
export const updateAdminFeedback = (feedbackId, payload) => requestWithFallback({ method: "patch", url: `admin/feedback/${feedbackId}/`, data: payload });
export const getAdminUsers = () => requestWithFallback({ method: "get", url: "admin/users/" });
export const updateAdminUser = (userId, payload) => requestWithFallback({ method: "patch", url: `admin/users/${userId}/`, data: payload });
export const createAdminStaffUser = (payload) => requestWithFallback({ method: "post", url: "admin/users/create-staff/", data: payload });
export const getAdminGroups = () => requestWithFallback({ method: "get", url: "admin/groups/" });

export const getAdminBaseUrl = () => {
  const explicitAdminBaseUrl = normalizeApiBaseUrl(process.env.REACT_APP_DJANGO_ADMIN_BASE_URL);
  if (explicitAdminBaseUrl) {
    return explicitAdminBaseUrl.endsWith("/") ? explicitAdminBaseUrl : `${explicitAdminBaseUrl}/`;
  }

  if (typeof window !== "undefined" && isLocalFrontendDevOrigin(window.location.origin)) {
    return `${LOCAL_BACKEND_ORIGIN}/admin/`;
  }

  const resolved = new URL(API_BASE_URL, getWindowOrigin());
  const normalizedPath = resolved.pathname.endsWith("/") ? resolved.pathname : `${resolved.pathname}/`;
  let adminPath = normalizedPath;

  if (normalizedPath.endsWith("/api/")) {
    adminPath = normalizedPath.slice(0, -5) + "/admin/";
  } else if (normalizedPath.endsWith("/api")) {
    adminPath = normalizedPath.slice(0, -4) + "/admin/";
  } else {
    adminPath = `${normalizedPath}admin/`;
  }

  resolved.pathname = adminPath.replace(/\/{2,}/g, "/");
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

export const getFeedback = () => requestWithFallback({ method: "get", url: "feedback/" });

export const createFeedback = (payload) => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid feedback payload");
  }

  return requestWithFallback({ method: "post", url: "feedback/create/", data: payload });
};

export const getCsrfToken = () => ensureCsrfToken();

export const registerUser = (payload) => requestWithFallback({ method: "post", url: "auth/register/", data: payload });

export const loginUser = (payload) => requestWithFallback({ method: "post", url: "auth/login/", data: payload });

export const logoutUser = () => requestWithFallback({ method: "post", url: "auth/logout/" });
