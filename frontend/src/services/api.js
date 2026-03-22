import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000/api/";

// Validate base URL is https in production
if (process.env.NODE_ENV === "production" && !API_BASE_URL.startsWith("https://")) {
  console.warn("WARNING: API URL should use HTTPS in production");
}

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
});

// Request interceptor to add security headers
API.interceptors.request.use(
  (config) => {
    // Add CSRF token if available
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
    if (csrfToken) {
      config.headers["X-CSRFToken"] = csrfToken;
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
    return API.get("products/");
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
    return API.post("order/", payload);
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
    return API.post("payment/create/", { amount: amountInPaise });
  } catch (error) {
    console.error("Failed to create payment order:", error);
    throw error;
  }
};
