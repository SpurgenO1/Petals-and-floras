import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000/api/",
  timeout: 10000,
});

export const getProducts = () => API.get("products/");
export const createOrder = (payload) => API.post("order/", payload);
export const createPaymentOrder = (amountInPaise) =>
  API.post("payment/create/", { amount: amountInPaise });
