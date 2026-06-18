import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  createAdminProduct,
  createAdminStaffUser,
  deleteAdminProduct,
  getAdminFeedback,
  getAdminGroups,
  getAdminOrderHistory,
  getAdminOrders,
  getAdminOverview,
  getAdminProducts,
  getAdminUsers,
  getCurrentUser,
  loginUser,
  setRuntimeAuthUser,
  updateAdminFeedback,
  updateAdminOrder,
  updateAdminProduct,
  updateAdminUser,
} from "../services/api";
import { catalogProducts, PRODUCT_SPECIFIC_IMAGES } from "../data/catalogProducts";

const ADMIN_REFRESH_INTERVAL_MS = 45000;

const tabs = [
  ["overview", "Overview"],
  ["products", "Products"],
  ["create-product", "Create Product"],
  ["orders", "Orders"],
  ["history", "Order History"],
  ["feedback", "Feedback"],
  ["users", "Users"],
];

const orderStatuses = ["Pending", "Paid", "Failed", "Cancelled"];
const deliveryStatuses = [
  ["order_placed", "Order Placed"],
  ["preparing_bouquet", "Preparing Bouquet"],
  ["out_for_delivery", "Out for Delivery"],
  ["delivered", "Delivered"],
];
const feedbackStatuses = ["pending", "reviewed", "hidden"];

const emptyProduct = { name: "", flower_price: "", bouquet_price: "", category: "", description: "" };
const emptyStaff = { first_name: "", last_name: "", username: "", email: "", password: "" };
const emptyAdminLogin = { email: "", password: "" };
const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
const hasThreeTickAdminAccess = (user) => Boolean(user?.is_active && user?.is_staff && user?.is_superuser);

const fmtMoney = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(amount || 0));
const fmtDate = (value) => (value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-");
const pct = (value, total) => (total ? Math.round((value / total) * 100) : 0);
const clampWidth = (value, total) => `${Math.max(8, pct(value, total))}%`;
const normalizeImageKey = (value) => String(value || "").trim().toLowerCase();
const catalogImageByName = catalogProducts.reduce((acc, product) => {
  const category = product.category || "";
  const name = product.name || "";
  const image =
    PRODUCT_SPECIFIC_IMAGES[`${category}:${name}`] ||
    PRODUCT_SPECIFIC_IMAGES[name] ||
    product.professional_image ||
    product.image ||
    "";

  if (image) {
    acc[`${normalizeImageKey(category)}:${normalizeImageKey(name)}`] = image;
    acc[normalizeImageKey(name)] = image;
  }

  return acc;
}, {});
const productImageUrl = (product) => {
  const uploadedImage = product?.photo_url || product?.image || "";
  if (uploadedImage) {
    return uploadedImage;
  }

  const category = normalizeImageKey(product?.category);
  const name = normalizeImageKey(product?.name);
  return catalogImageByName[`${category}:${name}`] || catalogImageByName[name] || "";
};
const autoResizeTextarea = (event) => {
  const element = event.target;
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
};

const buildProductFormData = (product, { photoFile = null, removePhoto = false } = {}) => {
  const flowerPrice = Number(product.flower_price ?? product.flowerPrice ?? product.price ?? 0);
  const bouquetPrice = Number(product.bouquet_price ?? product.bouquetPrice ?? flowerPrice);
  const formData = new FormData();

  formData.append("name", product.name || "");
  formData.append("price", String(flowerPrice));
  formData.append("flower_price", String(flowerPrice));
  formData.append("bouquet_price", String(bouquetPrice));
  formData.append("category", product.category || "");
  formData.append("description", product.description || "");

  if (photoFile) {
    formData.append("photo", photoFile);
  }

  if (removePhoto) {
    formData.append("remove_photo", "true");
  }

  return formData;
};

// ─── 3D Falling Petal ─────────────────────────────────────────────────────────
function FallingPetal({ style }) {
  return (
    <motion.div
      style={style}
      className="petal"
      animate={{ y: ["0vh", "110vh"], rotate: [0, 360], opacity: [0, 0.7, 0] }}
      transition={{ duration: style.duration, repeat: Infinity, ease: "linear", delay: style.delay }}
    />
  );
}

async function resolveAdminSession() {
  const retryDelays = [0, 150, 400];

  for (const delay of retryDelays) {
    if (delay > 0) {
      await wait(delay);
    }

    try {
      const response = await getCurrentUser();
      if (response?.data) {
        return response.data;
      }
    } catch {
      // Cookies can take a short moment to become visible after the login response.
    }
  }

  return null;
}

export default function AdminPortal({ authUser, onAuthSuccess }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [productSort, setProductSort] = useState("newest");
  const [overview, setOverview] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderDeliveryFilter, setOrderDeliveryFilter] = useState("all");
  const [orderSort, setOrderSort] = useState("newest");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");
  const [historyDeliveryFilter, setHistoryDeliveryFilter] = useState("all");
  const [historySameDayFilter, setHistorySameDayFilter] = useState("all");
  const [historySort, setHistorySort] = useState("newest");

  const [feedbackEntries, setFeedbackEntries] = useState([]);
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState("all");
  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState("all");
  const [feedbackSearch, setFeedbackSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [productFormPhoto, setProductFormPhoto] = useState(null);
  const [productFormPhotoPreview, setProductFormPhotoPreview] = useState("");
  const [productPhotoDrafts, setProductPhotoDrafts] = useState({});
  const [staffForm, setStaffForm] = useState(emptyStaff);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sessionUser, setSessionUser] = useState(authUser || null);
  const [authChecking, setAuthChecking] = useState(true);
  const [adminLoginForm, setAdminLoginForm] = useState(emptyAdminLogin);
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const effectiveUser = sessionUser || authUser;
  const hasAdminAccess = hasThreeTickAdminAccess(effectiveUser);
  const productDetailMatch = location.pathname.match(/^\/admin\/products\/([^/]+)\/?$/);
  const selectedProductId = productDetailMatch ? productDetailMatch[1] : null;
  const [isCompactView, setIsCompactView] = useState(false);
  const totalProductsCount = Number(overview?.stats?.products_count ?? products.length ?? 0);

  const petalsRef = useRef(
    Array.from({ length: 14 }, () => ({
      left: `${Math.random() * 100}%`,
      width: `${12 + Math.random() * 18}px`,
      height: `${16 + Math.random() * 22}px`,
      duration: 7 + Math.random() * 9,
      delay: Math.random() * 10,
      filter: `hue-rotate(${Math.random() * 30 - 15}deg)`,
    }))
  );

  const dashboard = useMemo(() => {
    const totalOrders = orders.length;
    const paidOrders = orders.filter((order) => order.status === "Paid");
    const pendingOrders = orders.filter((order) => order.status === "Pending");
    const failedOrders = orders.filter((order) => order.status === "Failed");
    const cancelledOrders = orders.filter((order) => order.status === "Cancelled");
    const totalRevenue = Number(overview?.stats?.total_revenue || 0);
    const avgOrderValue = totalOrders ? Math.round(totalRevenue / totalOrders) : 0;
    const totalUsers = users.length;
    const staffUsers = users.filter((user) => user.is_staff).length;
    const activeUsers = users.filter((user) => user.is_active).length;
    const totalFeedback = feedbackEntries.length;
    const pendingFeedback = feedbackEntries.filter((entry) => entry.status === "pending").length;
    const reviewedFeedback = feedbackEntries.filter((entry) => entry.status === "reviewed").length;
    const hiddenFeedback = feedbackEntries.filter((entry) => entry.status === "hidden").length;
    const avgRating = totalFeedback
      ? (feedbackEntries.reduce((sum, entry) => sum + Number(entry.rating || 0), 0) / totalFeedback).toFixed(1)
      : "0.0";
    const categoryCounts = products.reduce((acc, product) => {
      const key = product.category || "Uncategorized";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const topCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const recentRevenue = orders
      .slice(0, 7)
      .reverse()
      .map((order) => ({
        label: `#${order.id}`,
        value: Number(order.total_amount || 0),
      }));
    const maxRecentRevenue = Math.max(...recentRevenue.map((item) => item.value), 1);
    const attentionItems = [
      pendingOrders.length ? `${pendingOrders.length} orders still need processing` : null,
      pendingFeedback ? `${pendingFeedback} feedback entries are waiting for moderation` : null,
      totalUsers && activeUsers < totalUsers ? `${totalUsers - activeUsers} user accounts are inactive` : null,
      totalProductsCount === 0 ? "No products are available in the catalog yet" : null,
    ].filter(Boolean);

    return {
      totalOrders,
      paidOrders: paidOrders.length,
      pendingOrders: pendingOrders.length,
      failedOrders: failedOrders.length,
      cancelledOrders: cancelledOrders.length,
      totalRevenue,
      avgOrderValue,
      totalUsers,
      staffUsers,
      activeUsers,
      totalFeedback,
      pendingFeedback,
      reviewedFeedback,
      hiddenFeedback,
      avgRating,
      topCategories,
      recentRevenue,
      maxRecentRevenue,
      attentionItems,
    };
  }, [orders, overview, users, feedbackEntries, products, totalProductsCount]);

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.id) === String(selectedProductId)) || null,
    [products, selectedProductId]
  );
  const productCategories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category || "Uncategorized"))).sort((a, b) => a.localeCompare(b)),
    [products]
  );
  const filteredProducts = useMemo(() => {
    const normalizedSearch = productSearch.trim().toLowerCase();

    return [...products]
      .filter((product) => {
        const category = product.category || "Uncategorized";
        const matchesCategory = productCategoryFilter === "all" || category === productCategoryFilter;
        const searchableText = [
          product.name,
          product.category,
          product.description,
          String(product.id || ""),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
        return matchesCategory && matchesSearch;
      })
      .sort((left, right) => {
        switch (productSort) {
          case "name-asc":
            return String(left.name || "").localeCompare(String(right.name || ""));
          case "name-desc":
            return String(right.name || "").localeCompare(String(left.name || ""));
          case "price-low":
            return Number(left.price || 0) - Number(right.price || 0);
          case "price-high":
            return Number(right.price || 0) - Number(left.price || 0);
          case "oldest":
            return String(left.id || "").localeCompare(String(right.id || ""), undefined, { numeric: true });
          case "newest":
          default:
            return String(right.id || "").localeCompare(String(left.id || ""), undefined, { numeric: true });
        }
      });
  }, [productCategoryFilter, productSearch, productSort, products]);

  const filteredOrders = useMemo(() => {
    let result = Array.isArray(orders) ? [...orders] : [];

    // 1. Search Filter
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      result = result.filter(
        (o) =>
          String(o.id).includes(q) ||
          String(o.customer_name || "").toLowerCase().includes(q) ||
          String(o.user_email || "").toLowerCase().includes(q) ||
          String(o.phone || "").toLowerCase().includes(q) ||
          String(o.address || "").toLowerCase().includes(q) ||
          String(o.city || "").toLowerCase().includes(q) ||
          String(o.pincode || "").toLowerCase().includes(q)
      );
    }

    // 2. Status Filter
    if (orderStatusFilter !== "all") {
      result = result.filter((o) => o.status === orderStatusFilter);
    }

    // 3. Delivery Status Filter
    if (orderDeliveryFilter !== "all") {
      result = result.filter((o) => o.delivery_status === orderDeliveryFilter);
    }

    // 4. Sort
    if (orderSort === "newest") {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (orderSort === "oldest") {
      result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (orderSort === "amount_desc") {
      result.sort((a, b) => b.total_amount - a.total_amount);
    } else if (orderSort === "amount_asc") {
      result.sort((a, b) => a.total_amount - b.total_amount);
    }

    return result;
  }, [orders, orderSearch, orderStatusFilter, orderDeliveryFilter, orderSort]);

  const exportOrdersToCSV = () => {
    if (!filteredOrders.length) return;
    const headers = [
      "Order ID", "Customer Name", "Email", "Phone", "Address", "City", "Pincode",
      "Total Amount (INR)", "Status", "Delivery Status", "Delivery Date", "Delivery Slot",
      "Same Day Delivery", "Occasion", "Gift Message", "Payment ID", "Payment Order ID", "Created At"
    ];

    const rows = filteredOrders.map(o => [
      `#${o.id}`,
      o.customer_name || "",
      o.user_email || "Guest",
      o.phone || "",
      o.address ? o.address.replace(/"/g, '""').replace(/\n/g, ' ') : "",
      o.city || "",
      o.pincode || "",
      o.total_amount,
      o.status,
      o.delivery_status_label || o.delivery_status,
      o.delivery_date || "",
      o.delivery_slot_label || o.delivery_slot || "",
      o.same_day_delivery ? "Yes" : "No",
      o.occasion || "",
      o.gift_message ? o.gift_message.replace(/"/g, '""').replace(/\n/g, ' ') : "",
      o.payment_id || "",
      o.payment_order_id || "",
      o.created_at
    ]);

    const csvContent = "\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    
    const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `orders_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printOrderReceipt = (order) => {
    const printWindow = window.open("", "_blank");
    const itemsHtml = (order.items || []).map(item => {
      const price = Number(item.price || item.flower_price || item.bouquet_price || 0);
      const qty = Number(item.qty || item.quantity || 1);
      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">
            <div style="font-weight: bold; color: #1a0510;">${item.name}</div>
            <div style="font-size: 0.85em; color: #666; margin-top: 2px;">Category: ${item.category || 'Flower'} | Type: ${item.purchaseType || 'flower'}</div>
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; color: #1a0510;">${qty}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: #1a0510;">Rs. ${price.toLocaleString()}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; color: #1a0510;">Rs. ${(price * qty).toLocaleString()}</td>
        </tr>
      `;
    }).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Order Receipt #${order.id}</title>
          <style>
            body { font-family: 'Jost', sans-serif, system-ui; color: #333; padding: 30px; line-height: 1.5; background-color: #fff; }
            .receipt-container { max-width: 800px; margin: 0 auto; border: 1px solid #eaeaea; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .header { border-bottom: 2px solid #c0354e; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
            .header h2 { margin: 0; color: #c0354e; font-size: 1.8em; }
            .header p { margin: 5px 0 0 0; color: #666; font-size: 0.9em; }
            .section-title { font-size: 1.1em; color: #7b1a2e; margin-bottom: 10px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 4px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 25px; }
            .info-block p { margin: 6px 0; font-size: 0.95em; color: #444; }
            .info-block strong { color: #1a0510; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background: #fbfbfb; padding: 10px; text-align: left; color: #7b1a2e; font-size: 0.9em; text-transform: uppercase; border-bottom: 1px solid #eee; }
            .total-section { text-align: right; margin-top: 25px; border-top: 2px solid #eee; padding-top: 15px; }
            .total-section h3 { margin: 0; color: #c0354e; font-size: 1.5em; }
            .gift-section { background: #fff5f6; border: 1px solid #ffd3d9; padding: 20px; border-radius: 8px; margin-bottom: 25px; position: relative; }
            .gift-section::before { content: "❀"; position: absolute; right: 20px; bottom: 5px; font-size: 4em; color: rgba(192, 53, 78, 0.05); }
            .gift-section p { margin: 0 0 8px 0; color: #7b1a2e; font-weight: bold; }
            .gift-text { font-style: italic; font-size: 1.1em; color: #c0354e; line-height: 1.6; margin: 0 !important; }
            @media print {
              body { padding: 0; background: none; }
              .receipt-container { border: none; box-shadow: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="header">
              <div>
                <h2>Petals & Flora</h2>
                <p>Premium Floral Fulfillments & Bouquets</p>
              </div>
              <div style="text-align: right;">
                <p style="font-size: 1.1em; font-weight: bold; color: #1a0510; margin: 0;">RECEIPT #${order.id}</p>
                <p style="margin: 2px 0 0 0;">Date: ${new Date(order.created_at).toLocaleDateString('en-IN')}</p>
              </div>
            </div>
            
            <div class="grid">
              <div class="info-block">
                <div class="section-title">Customer Contact</div>
                <p><strong>Name:</strong> ${order.customer_name}</p>
                <p><strong>Phone:</strong> ${order.phone}</p>
                <p><strong>Email:</strong> ${order.user_email || 'Guest checkout'}</p>
              </div>
              <div class="info-block">
                <div class="section-title">Delivery Details</div>
                <p><strong>Scheduled Date:</strong> ${order.delivery_date || 'Date pending'}</p>
                <p><strong>Time Slot:</strong> ${order.delivery_slot_label || order.delivery_slot || 'Slot pending'}</p>
                <p><strong>Address:</strong> ${order.address}, ${order.city} - ${order.pincode}</p>
              </div>
            </div>

            ${order.gift_message ? `
            <div class="gift-section">
              <p>Occasion Card: ${order.occasion ? order.occasion.replace(/_/g, " ").toUpperCase() : 'Gifting Moment'}</p>
              <div class="gift-text">"${order.gift_message}"</div>
            </div>
            ` : ""}

            <div class="section-title">Purchased Items</div>
            <table>
              <thead>
                <tr>
                  <th>Item Details</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Unit Price</th>
                  <th style="text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div class="total-section">
              <p style="margin: 0 0 5px 0; color: #666; font-size: 0.9em;">Payment Status: <strong>${order.status}</strong></p>
              <h3>Total Paid: Rs. ${Number(order.total_amount).toLocaleString()}</h3>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredHistory = useMemo(() => {
    let result = Array.isArray(historyEntries) ? [...historyEntries] : [];

    // 1. Search Filter
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      result = result.filter(
        (e) =>
          String(e.id).includes(q) ||
          String(e.customer_name || "").toLowerCase().includes(q) ||
          String(e.user_email || "").toLowerCase().includes(q) ||
          String(e.phone || "").toLowerCase().includes(q) ||
          String(e.city || "").toLowerCase().includes(q) ||
          String(e.pincode || "").toLowerCase().includes(q)
      );
    }

    // 2. Status Filter
    if (historyStatusFilter !== "all") {
      result = result.filter((e) => e.status === historyStatusFilter);
    }

    // 3. Delivery Status Filter
    if (historyDeliveryFilter !== "all") {
      result = result.filter((e) => e.delivery_status === historyDeliveryFilter);
    }

    // 4. Same-Day Delivery Filter
    if (historySameDayFilter !== "all") {
      const isSameDay = historySameDayFilter === "yes";
      result = result.filter((e) => e.same_day_delivery === isSameDay);
    }

    // 5. Sort (ordered_at / date)
    if (historySort === "newest") {
      result.sort((a, b) => new Date(b.ordered_at) - new Date(a.ordered_at));
    } else if (historySort === "oldest") {
      result.sort((a, b) => new Date(a.ordered_at) - new Date(b.ordered_at));
    } else if (historySort === "amount_desc") {
      result.sort((a, b) => b.total_amount - a.total_amount);
    } else if (historySort === "amount_asc") {
      result.sort((a, b) => a.total_amount - b.total_amount);
    }

    return result;
  }, [historyEntries, historySearch, historyStatusFilter, historyDeliveryFilter, historySameDayFilter, historySort]);

  const filteredFeedback = useMemo(() => {
    let result = [...feedbackEntries];

    // 1. Status Filter
    if (feedbackStatusFilter !== "all") {
      result = result.filter((entry) => entry.status === feedbackStatusFilter);
    }

    // 2. Rating Filter
    if (feedbackRatingFilter !== "all") {
      result = result.filter((entry) => String(entry.rating) === feedbackRatingFilter);
    }

    // 3. Search Filter
    if (feedbackSearch.trim()) {
      const q = feedbackSearch.toLowerCase();
      result = result.filter(
        (entry) =>
          (entry.title && entry.title.toLowerCase().includes(q)) ||
          (entry.message && entry.message.toLowerCase().includes(q)) ||
          (entry.user_name && entry.user_name.toLowerCase().includes(q)) ||
          (entry.user_email && entry.user_email.toLowerCase().includes(q)) ||
          (entry.product_name && entry.product_name.toLowerCase().includes(q)) ||
          (entry.target_type && entry.target_type.toLowerCase().includes(q))
      );
    }

    // Sort by created_at newest first
    result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return result;
  }, [feedbackEntries, feedbackStatusFilter, feedbackRatingFilter, feedbackSearch]);





  const loadAll = async ({ background = false } = {}) => {
    if (!background) {
      setLoading(true);
    }

    setError("");

    const requests = await Promise.allSettled([
      getAdminOverview(),
      getAdminProducts(),
      getAdminOrders(),
      getAdminOrderHistory(),
      getAdminFeedback(),
      getAdminUsers(),
      getAdminGroups(),
    ]);

    const [overviewResult, productsResult, ordersResult, historyResult, feedbackResult, usersResult, groupsResult] = requests;

    if (overviewResult.status === "fulfilled") {
      setOverview(overviewResult.value.data);
    }

    if (productsResult.status === "fulfilled") {
      setProducts(productsResult.value.data?.results || []);
    }

    if (ordersResult.status === "fulfilled") {
      setOrders(ordersResult.value.data?.results || []);
    }

    if (historyResult.status === "fulfilled") {
      setHistoryEntries(historyResult.value.data?.results || []);
    }

    if (feedbackResult.status === "fulfilled") {
      setFeedbackEntries(feedbackResult.value.data?.results || []);
    }

    if (usersResult.status === "fulfilled") {
      setUsers(usersResult.value.data?.results || []);
    }

    if (groupsResult.status === "fulfilled") {
      setGroups(groupsResult.value.data?.results || []);
    }

    const rejected = requests
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason);

    if (rejected.length) {
      const primaryError = rejected[0];
      const statusCode = primaryError?.response?.status;
      const message =
        primaryError?.response?.data?.error ||
        primaryError?.response?.data?.detail ||
        primaryError?.message ||
        "Some admin data could not be refreshed.";

      if (
        statusCode === 401 ||
        message === "Not authenticated" ||
        message === "Please login to continue." ||
        message === "Authentication required"
      ) {
        setSessionUser(null);
        setError("Please sign in here with your Active, Staff, Superuser account to load admin data.");
        setLoading(false);
        return;
      }

      setError(
        requests.some((result) => result.status === "fulfilled")
          ? `${message} The rest of the admin workspace is still available and will retry automatically.`
          : message
      );
    } else {
      setError("");
    }

    if (!background) {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSessionUser(authUser || null);
  }, [authUser]);

  useEffect(() => {
    let active = true;

    async function refreshAdminSession() {
      setAuthChecking(true);
      try {
        const response = await getCurrentUser();
        if (active) {
          setSessionUser(response.data || null);
        }
      } catch {
        if (active && !authUser) {
          setSessionUser(null);
        }
      } finally {
        if (active) {
          setAuthChecking(false);
        }
      }
    }

    refreshAdminSession();

    return () => {
      active = false;
    };
  }, [authUser]);

  useEffect(() => {
    if (authChecking) {
      return;
    }

    if (hasAdminAccess) {
      loadAll();
    } else {
      setLoading(false);
    }
  }, [authChecking, hasAdminAccess]);

  useEffect(() => {
    if (!hasAdminAccess) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      loadAll({ background: true });
    }, ADMIN_REFRESH_INTERVAL_MS);

    const handleFocus = () => {
      loadAll({ background: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadAll({ background: true });
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hasAdminAccess]);

  useEffect(() => {
    if (location.pathname.startsWith("/admin/products/")) {
      setTab("products");
    } else if (location.pathname === "/admin/create-product") {
      setTab("create-product");
    }
  }, [location.pathname]);

  const saveProduct = async (product) => {
    setSaving(`product-${product.id}`);
    setError("");
    try {
        const photoDraft = productPhotoDrafts[product.id] || {};
        const response = await updateAdminProduct(
          product.id,
          buildProductFormData(product, {
            photoFile: photoDraft.file || null,
            removePhoto: Boolean(photoDraft.remove),
          })
        );
        setProducts((current) => current.map((item) => (item.id === product.id ? response.data.product : item)));
        if (photoDraft.previewUrl) {
          URL.revokeObjectURL(photoDraft.previewUrl);
        }
        setProductPhotoDrafts((current) => {
          const next = { ...current };
          delete next[product.id];
          return next;
        });
        setNotice("Product updated.");
    } catch (requestError) {
      setError(requestError?.response?.data?.error || "Could not update product.");
    } finally {
      setSaving("");
    }
  };

  const createProduct = async (event) => {
    event.preventDefault();
    setSaving("new-product");
    setError("");
    try {
        const response = await createAdminProduct(
          buildProductFormData(productForm, { photoFile: productFormPhoto })
        );
        setProducts((current) => [response.data.product, ...current]);
        setProductForm(emptyProduct);
        setProductFormPhoto(null);
        if (productFormPhotoPreview) {
          URL.revokeObjectURL(productFormPhotoPreview);
        }
        setProductFormPhotoPreview("");
        navigate(`/admin/products/${response.data.product.id}`);
        setNotice("Product created.");
    } catch (requestError) {
      setError(requestError?.response?.data?.error || "Could not create product.");
    } finally {
      setSaving("");
    }
  };

  const removeProduct = async (productId) => {
    setSaving(`delete-${productId}`);
    setError("");
    try {
        await deleteAdminProduct(productId);
        const remainingProducts = products.filter((item) => item.id !== productId);
        setProducts(remainingProducts);
        if (selectedProductId === productId) {
          navigate("/admin");
          setTab("products");
        }
        setNotice("Product deleted.");
    } catch (requestError) {
      setError(requestError?.response?.data?.error || "Could not delete product.");
    } finally {
      setSaving("");
    }
  };

  const changeProductPhotoDraft = (productId, file) => {
    setProductPhotoDrafts((current) => {
      const existing = current[productId] || {};
      if (existing.previewUrl) {
        URL.revokeObjectURL(existing.previewUrl);
      }

      return {
        ...current,
        [productId]: {
          file,
          previewUrl: file ? URL.createObjectURL(file) : "",
          remove: false,
        },
      };
    });
  };

  const removeProductPhotoDraft = (productId) => {
    setProductPhotoDrafts((current) => {
      const existing = current[productId] || {};
      if (existing.previewUrl) {
        URL.revokeObjectURL(existing.previewUrl);
      }

      return {
        ...current,
        [productId]: {
          file: null,
          previewUrl: "",
          remove: true,
        },
      };
    });
  };

  const changeProductFormPhoto = (file) => {
    if (productFormPhotoPreview) {
      URL.revokeObjectURL(productFormPhotoPreview);
    }
    setProductFormPhoto(file || null);
    setProductFormPhotoPreview(file ? URL.createObjectURL(file) : "");
  };

  const changeOrderStatus = async (orderId, payload) => {
    setSaving(`order-${orderId}`);
    try {
      const response = await updateAdminOrder(orderId, payload);
      setOrders((current) => current.map((item) => (item.id === orderId ? response.data.order : item)));
      setNotice(`Order #${orderId} updated.`);
    } catch (requestError) {
      setError(requestError?.response?.data?.error || "Could not update order.");
    } finally {
      setSaving("");
    }
  };

  const changeFeedbackStatus = async (feedbackId, status) => {
    setSaving(`feedback-${feedbackId}`);
    try {
      const response = await updateAdminFeedback(feedbackId, { status });
      setFeedbackEntries((current) => current.map((item) => (item.id === feedbackId ? response.data.feedback : item)));
      setNotice(`Feedback #${feedbackId} updated.`);
    } catch (requestError) {
      setError(requestError?.response?.data?.error || "Could not update feedback.");
    } finally {
      setSaving("");
    }
  };

  const saveUser = async (user) => {
    setSaving(`user-${user.id}`);
    try {
      const response = await updateAdminUser(user.id, {
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        is_active: user.is_active,
        is_staff: user.is_staff,
        group_ids: (user.groups || []).map((group) => group.id),
      });
      setUsers((current) => current.map((item) => (item.id === user.id ? response.data.user : item)));
      setNotice(`User ${response.data.user.username} updated.`);
    } catch (requestError) {
      setError(requestError?.response?.data?.error || "Could not update user.");
    } finally {
      setSaving("");
    }
  };

  const createStaff = async (event) => {
    event.preventDefault();
    setSaving("staff-create");
    try {
      const response = await createAdminStaffUser(staffForm);
      setUsers((current) => [response.data.user, ...current]);
      setStaffForm(emptyStaff);
      setNotice("Staff account created.");
      setTab("users");
    } catch (requestError) {
      setError(requestError?.response?.data?.error || "Could not create staff account.");
    } finally {
      setSaving("");
    }
  };

  const handleAdminLogin = async (event) => {
    event.preventDefault();
    setAdminLoginLoading(true);
    setError("");
    setNotice("");

    try {
      await loginUser(adminLoginForm);
      const user = await resolveAdminSession();
      if (!user) {
        setError("Login succeeded, but the browser did not keep the admin session cookie. Refresh and sign in again.");
        return;
      }

      if (!hasThreeTickAdminAccess(user)) {
        setError("This account needs Active, Staff status, and Superuser status enabled in Django admin.");
        return;
      }

      setSessionUser(user);
      setRuntimeAuthUser(user);
      onAuthSuccess?.(user);
      setAdminLoginForm(emptyAdminLogin);
      setError("");
      setNotice("Admin session authenticated.");
      await loadAll();
    } catch (requestError) {
      setError(requestError?.message || requestError?.response?.data?.error || "Could not sign in to admin data.");
    } finally {
      setAdminLoginLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const compactQuery = window.matchMedia("(max-width: 640px), (prefers-reduced-motion: reduce)");
    const syncCompactView = () => setIsCompactView(compactQuery.matches);
    syncCompactView();
    compactQuery.addEventListener("change", syncCompactView);
    return () => compactQuery.removeEventListener("change", syncCompactView);
  }, []);

  const petals = isCompactView ? petalsRef.current.slice(0, 5) : petalsRef.current;

  if (authChecking) {
    return (
      <section className="ap">
        <div className="aw">
          <div className="msg">Checking staff session...</div>
        </div>
      </section>
    );
  }

  return (
    <>
      <style>{`
        .ap{
          min-height:100vh;
          padding:calc(var(--nav-height) + 1.5rem) 1rem 3rem;
          background:
            radial-gradient(ellipse 80% 60% at 20% 10%, rgba(192,53,78,0.35) 0%, transparent 55%),
            radial-gradient(ellipse 60% 50% at 80% 85%, rgba(123,26,46,0.45) 0%, transparent 55%),
            radial-gradient(ellipse 100% 100% at 50% 50%, #1a0510 0%, #0d0007 100%);
          color:#f7ece6;
          font-family:'Jost',sans-serif;
          position:relative;
          overflow:hidden
        }
        .ap::before{
          content:"";
          position:fixed;
          inset:0;
          z-index:0;
          pointer-events:none;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E");
          opacity:.5
        }
        .petals-layer { position: fixed; inset: 0; pointer-events: none; z-index: 1; }
        .petal {
          position: absolute;
          top: -60px;
          background: radial-gradient(ellipse at 40% 30%, #f8b4c0, #c0354e 60%, #7b1a2e);
          border-radius: 0 80% 0 80%;
          opacity: 0.55;
          will-change: transform;
          box-shadow: 0 4px 12px rgba(123,26,46,0.3);
        }
        .aw{width:min(1320px,100%);margin:0 auto;display:grid;gap:1rem;position:relative;z-index:2}.card,.tableWrap,.msg{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);border-radius:20px;box-shadow:0 14px 42px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.1);backdrop-filter:blur(12px) saturate(1.8);-webkit-backdrop-filter:blur(12px) saturate(1.8);transform-style:preserve-3d;perspective:1000px;transition:all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);}
        .card:hover,.tableWrap:hover{transform:translateY(-8px) scale(1.01);background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.18);box-shadow:0 24px 60px rgba(0,0,0,.5),0 0 30px rgba(192,53,78,.2),inset 0 1px 1px rgba(255,255,255,.2)}
        .card{padding:1.5rem}
        .topActions{display:flex;justify-content:flex-end;gap:1rem}
        .row,.tabs,.actions{display:flex;flex-wrap:wrap;gap:.7rem}.chip,.tab,.btn,.btn2,.btnDanger,input,textarea,select{font:inherit;border-radius:14px;border:1px solid rgba(255,255,255,.16);background:rgba(60,5,20,.5);color:#fff}
        .tabs{margin-bottom:1.5rem}
        .chip,.tab,.btn,.btn2,.btnDanger{padding:.7rem 1rem}.tab{cursor:pointer}.tab.active,.btn{background:linear-gradient(135deg,#e8536d,#7b1a2e);color:#fff;font-weight:700;border:1px solid rgba(255,255,255,.08);box-shadow:0 10px 24px rgba(192,53,78,.28)}
        .btn2,.btnDanger{text-decoration:none;display:inline-flex;align-items:center;justify-content:center}.btn2{background:rgba(60,5,20,.55);color:rgba(255,255,255,.86)}.btnDanger{background:linear-gradient(135deg,#ef4444,#991b1b);border:none;color:#fff;font-weight:700}.msg{padding:.9rem 1rem}.err{color:#fecaca;background:rgba(120,15,30,.36);border-color:rgba(239,68,68,.28)}
        .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:1rem}.metric{padding:1rem}.metric strong{font-size:1.6rem;display:block;color:#fff}.metric span,.metric small,.muted{color:rgba(255,255,255,.68)}
        .section{margin-bottom:1.25rem}.section h2{margin:0 0 .35rem 0;color:#fff}.section p{margin:0;color:rgba(255,255,255,.68)}
        .formGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.8rem}.full{grid-column:1/-1}
        input,textarea,select{width:100%;padding:.7rem .8rem;outline:none}input::placeholder,textarea::placeholder{color:rgba(255,255,255,.48)}textarea{min-height:140px;resize:none;overflow:hidden}.tableWrap{overflow:auto;margin-top:1.25rem}.table{width:100%;min-width:920px;border-collapse:collapse}.table th,.table td{padding:.8rem;border-bottom:1px solid rgba(255,255,255,.08);vertical-align:top;text-align:left;overflow-wrap:break-word;word-wrap:break-word;word-break:break-word}.table th{font-size:.76rem;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.5)}
        .stack{display:grid;gap:.35rem;overflow-wrap:break-word;word-wrap:break-word;word-break:break-word}.multi{min-height:96px}.pill{display:inline-flex;padding:.28rem .65rem;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);color:rgba(255,255,255,.84)}
        .heroGrid{display:grid;grid-template-columns:1.5fr 1fr;gap:1rem}.subGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;margin-top:1rem}
        .chartCard{padding:1rem}.chartTitle{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;margin-bottom:.8rem}.chartTitle strong{font-size:1.05rem;color:#fff}
        .bars{display:grid;gap:.7rem}.barRow{display:grid;gap:.35rem}.barMeta{display:flex;justify-content:space-between;gap:.75rem;font-size:.9rem;color:rgba(255,255,255,.72)}.barTrack{height:10px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}.barFill{height:100%;border-radius:999px;background:linear-gradient(135deg,#d7b56d,#e8536d)}
        .spark{display:flex;align-items:flex-end;gap:.55rem;height:180px;padding-top:1rem}.sparkCol{flex:1;display:grid;gap:.45rem;justify-items:center}.sparkBar{width:100%;max-width:42px;border-radius:14px 14px 8px 8px;background:linear-gradient(180deg,#d7b56d,#b37a1f);min-height:12px}.sparkLabel,.sparkValue{font-size:.78rem;color:rgba(255,255,255,.64);text-align:center}
        .attentionList{display:grid;gap:.7rem;margin-top:1rem}.attentionItem{padding:.85rem 1rem;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.84)}
        .split{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem;margin-top:1rem}
        .productToolbar{display:grid;grid-template-columns:minmax(220px,1.2fr) minmax(190px,.8fr) minmax(190px,.8fr);gap:.8rem;margin-top:1rem}
        .productToolbarMeta{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-top:.9rem;color:rgba(255,255,255,.68);font-size:.9rem}
        .productList{display:grid;gap:.7rem;max-height:720px;overflow:auto;padding-right:.2rem;margin-top:1rem}
        .productItem{width:100%;text-align:left;padding:1rem 1.1rem;border-radius:18px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#fff;cursor:pointer}
        .productItem.active{background:linear-gradient(135deg,rgba(215,181,109,.18),rgba(232,83,109,.14));border-color:rgba(215,181,109,.42)}
        .productNameBtn{all:unset;cursor:pointer;font-size:1.06rem;font-weight:700;line-height:1.4;color:#fff}
        .productMeta{display:flex;justify-content:space-between;gap:.75rem;margin-top:.45rem;color:rgba(255,255,255,.64);font-size:.88rem}
        .detailCard{display:grid;gap:1rem}
        .detailHeader{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}
        .detailHeader h3{margin:0;font-size:1.3rem}
        .usersPanel{display:grid;gap:1rem}
        .userList{display:grid;gap:.85rem}
        .userCard{display:grid;grid-template-columns:minmax(210px,.9fr) minmax(280px,1.35fr) minmax(210px,.85fr) minmax(150px,.55fr);gap:1rem;align-items:start;padding:1rem;border-radius:18px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.055)}
        .userCard:hover{background:rgba(255,255,255,.075);border-color:rgba(255,255,255,.18)}
        .userIdentity{display:grid;gap:.45rem;min-width:0}
        .userAvatar{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(215,181,109,.34),rgba(232,83,109,.38));border:1px solid rgba(255,255,255,.16);font-weight:800;color:#fff}
        .userTitle{display:grid;gap:.25rem;min-width:0}
        .userTitle strong,.userEmailValue{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .userEditGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem}
        .field{display:grid;gap:.32rem;min-width:0}
        .field.full{grid-column:1/-1}
        .field span,.fieldLabel{font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.48);font-weight:700}
        .userCard input,.userCard select{border-radius:12px;background:rgba(35,5,17,.58);border-color:rgba(255,255,255,.13)}
        .flagGroup{display:grid;gap:.65rem}
        .checkRow{display:flex;align-items:center;gap:.55rem;padding:.62rem .7rem;border-radius:12px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.88)}
        .checkRow input{width:1rem;height:1rem;accent-color:#e8536d;flex:0 0 auto}
        .accountBadge{width:max-content;max-width:100%;padding:.34rem .65rem;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);font-size:.85rem;color:rgba(255,255,255,.72)}
        .userActions{display:flex;justify-content:center;align-items:center;align-self:stretch}
        .userActions .btn{width:100%;min-height:44px}
        .adminLoginCard{max-width:520px;margin:4rem auto;display:grid;gap:1rem}
        .adminLoginCard h2{margin:0;color:#fff}
        .adminLoginCard p{margin:0;color:rgba(255,255,255,.68)}
        input:focus,textarea:focus,select:focus{border-color:rgba(232,83,109,.8);box-shadow:0 0 0 3px rgba(232,83,109,.14);background:rgba(255,255,255,.08)}
        select option{background:#2d0616;color:#fff}

        /* Enhanced Admin Order View Styles */
        .orderToolbar {
          display: grid;
          grid-template-columns: minmax(240px, 1.5fr) repeat(3, minmax(180px, 1fr)) auto;
          gap: 0.8rem;
          margin-top: 1rem;
          margin-bottom: 1.25rem;
        }
        .modalOverlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 2, 10, 0.8);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          z-index: 999;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 1.5rem;
        }
        .modalContent {
          width: min(850px, 100%);
          max-height: 90vh;
          background: linear-gradient(135deg, #230517, #0d0007);
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 24px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(192, 53, 78, 0.2);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }
        .modalHeader {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modalHeader h3 {
          margin: 0;
          font-size: 1.35rem;
          color: #fff;
        }
        .modalBody {
          padding: 1.5rem;
          overflow-y: auto;
          display: grid;
          gap: 1.5rem;
        }
        .modalFooter {
          padding: 1rem 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          justify-content: flex-end;
          gap: 0.8rem;
          background: rgba(0, 0, 0, 0.25);
        }
        .detailGrid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 1.5rem;
        }
        .detailSection {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 1.1rem;
        }
        .detailSection h4 {
          margin: 0 0 0.8rem 0;
          font-size: 0.95rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.5);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 0.4rem;
        }
        .itemRow {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .itemRow:last-child {
          border-bottom: none;
        }
        .itemImage {
          width: 50px;
          height: 50px;
          border-radius: 10px;
          object-fit: cover;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .itemInfo {
          flex: 1;
          min-width: 0;
        }
        .itemInfo strong {
          display: block;
          font-size: 0.95rem;
          color: #fff;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .itemInfo span {
          font-size: 0.82rem;
          color: rgba(255, 255, 255, 0.5);
        }
        .itemTotal {
          text-align: right;
          font-size: 0.95rem;
          color: #fff;
          font-weight: 600;
        }
        .infoList {
          display: grid;
          gap: 0.6rem;
        }
        .infoRow {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          font-size: 0.92rem;
        }
        .infoLabel {
          color: rgba(255, 255, 255, 0.54);
        }
        .infoValue {
          color: #fff;
          text-align: right;
          font-weight: 500;
        }
        .giftMessageCard {
          background: radial-gradient(circle at 10% 10%, rgba(232, 83, 109, 0.15), transparent), rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(232, 83, 109, 0.3);
          border-radius: 16px;
          padding: 1.1rem;
          position: relative;
          overflow: hidden;
        }
        .giftMessageCard::before {
          content: "❀";
          position: absolute;
          right: 10px;
          bottom: -15px;
          font-size: 5rem;
          color: rgba(232, 83, 109, 0.08);
          pointer-events: none;
        }
        .giftMessageText {
          font-style: italic;
          color: #fca5a5;
          line-height: 1.6;
          margin-top: 0.4rem;
        }
        .badge {
          display: inline-flex;
          padding: 0.25rem 0.55rem;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .badge.pending { background: rgba(251, 191, 36, 0.15); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.3); }
        .badge.paid { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); }
        .badge.failed { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); }
        .badge.cancelled { background: rgba(156, 163, 175, 0.15); color: #9ca3af; border: 1px solid rgba(156, 163, 175, 0.3); }

        @media (max-width:980px){
          .heroGrid{grid-template-columns:1fr}
          .orderToolbar{grid-template-columns:1fr 1fr}
        }
        @media (max-width:768px){
          .detailGrid{grid-template-columns:1fr}
        }
        @media (max-width:640px){
          .orderToolbar{grid-template-columns:1fr}
        }
      `}</style>
      <section className="ap">
        <div className="petals-layer">
          {petals.map((style, i) => (
            <FallingPetal key={i} style={style} />
          ))}
        </div>
        <div className="aw">
          <div className="topActions">
            <Link className="btn2" to="/">Back To Store</Link>
          </div>

          {!hasAdminAccess ? <div className="msg err">Your account needs Active, Staff status, and Superuser status enabled in Django admin.</div> : null}
          {notice ? <div className="msg">{notice}</div> : null}
          {error ? <div className="msg err">{error}</div> : null}

          {!effectiveUser || !hasAdminAccess ? (
            <form className="card adminLoginCard" onSubmit={handleAdminLogin}>
              <div className="section">
                <h2>Admin Data Sign In</h2>
                <p>Use an account with Active, Staff status, and Superuser status enabled to access store administration data.</p>
              </div>
              <input
                type="text"
                placeholder="Admin username or email"
                value={adminLoginForm.email}
                onChange={(event) => setAdminLoginForm((current) => ({ ...current, email: event.target.value }))}
                required
              />
              <input
                type="password"
                placeholder="Admin password"
                value={adminLoginForm.password}
                onChange={(event) => setAdminLoginForm((current) => ({ ...current, password: event.target.value }))}
                required
              />
              <button className="btn" type="submit" disabled={adminLoginLoading}>
                {adminLoginLoading ? "Signing In..." : "Sign In To Admin Data"}
              </button>
            </form>
          ) : hasAdminAccess ? (
            <>
              <div className="tabs">
                {tabs.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`tab ${tab === id ? "active" : ""}`}
                    onClick={() => {
                      setTab(id);
                      if (id === "create-product") {
                        navigate("/admin/create-product");
                      } else {
                        navigate("/admin");
                      }
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {loading ? <div className="msg">Loading admin workspace...</div> : null}

              {!loading && tab === "overview" ? (
                <div className="card">
                  <div className="section"><h2>Overview Dashboard</h2><p>A visual control room for sales, operations, catalog health, customers, and moderation.</p></div>
                  <div className="subGrid">
                    <div className="card metric"><span>Revenue</span><strong>{fmtMoney(dashboard.totalRevenue)}</strong><small>Total realized order value</small></div>
                    <div className="card metric"><span>Average Order</span><strong>{fmtMoney(dashboard.avgOrderValue)}</strong><small>Average order value across current orders</small></div>
                    <div className="card metric"><span>Conversion Flow</span><strong>{dashboard.paidOrders}/{dashboard.totalOrders || 0}</strong><small>{dashboard.pendingOrders} pending, {dashboard.failedOrders} failed, {dashboard.cancelledOrders} cancelled</small></div>
                    <div className="card metric"><span>User Health</span><strong>{dashboard.activeUsers}/{dashboard.totalUsers || 0}</strong><small>{dashboard.staffUsers} staff accounts active in admin</small></div>
                    <div className="card metric"><span>Feedback Score</span><strong>{dashboard.avgRating}/5</strong><small>{dashboard.pendingFeedback} pending moderation items</small></div>
                    <div className="card metric"><span>Catalog Shape</span><strong>{totalProductsCount}</strong><small>{dashboard.topCategories[0]?.[0] || "No top category yet"} leads the catalog</small></div>
                  </div>

                  <div className="heroGrid" style={{ marginTop: "1rem" }}>
                    <div className="card chartCard">
                      <div className="chartTitle">
                        <strong>Revenue Pulse</strong>
                        <span className="muted">Latest order values</span>
                      </div>
                      <div className="spark">
                        {dashboard.recentRevenue.length ? dashboard.recentRevenue.map((item) => (
                          <div className="sparkCol" key={item.label}>
                            <div className="sparkValue">{fmtMoney(item.value)}</div>
                            <div className="sparkBar" style={{ height: `${Math.max(12, Math.round((item.value / dashboard.maxRecentRevenue) * 120))}px` }} />
                            <div className="sparkLabel">{item.label}</div>
                          </div>
                        )) : <div className="muted">No order revenue data yet.</div>}
                      </div>
                    </div>

                    <div className="card chartCard">
                      <div className="chartTitle">
                        <strong>Needs Attention</strong>
                        <span className="muted">Priority checks</span>
                      </div>
                      <div className="attentionList">
                        {dashboard.attentionItems.length ? dashboard.attentionItems.map((item) => (
                          <div className="attentionItem" key={item}>{item}</div>
                        )) : <div className="attentionItem">Everything looks healthy right now.</div>}
                      </div>
                    </div>
                  </div>

                  <div className="split">
                    <div className="card chartCard">
                      <div className="chartTitle">
                        <strong>Order Status Breakdown</strong>
                        <span className="muted">Operations flow</span>
                      </div>
                      <div className="bars">
                        <div className="barRow">
                          <div className="barMeta"><span>Paid</span><span>{dashboard.paidOrders} orders</span></div>
                          <div className="barTrack"><div className="barFill" style={{ width: clampWidth(dashboard.paidOrders, dashboard.totalOrders), background: "linear-gradient(135deg,#86efac,#22c55e)" }} /></div>
                        </div>
                        <div className="barRow">
                          <div className="barMeta"><span>Pending</span><span>{dashboard.pendingOrders} orders</span></div>
                          <div className="barTrack"><div className="barFill" style={{ width: clampWidth(dashboard.pendingOrders, dashboard.totalOrders), background: "linear-gradient(135deg,#fde68a,#f59e0b)" }} /></div>
                        </div>
                        <div className="barRow">
                          <div className="barMeta"><span>Failed</span><span>{dashboard.failedOrders} orders</span></div>
                          <div className="barTrack"><div className="barFill" style={{ width: clampWidth(dashboard.failedOrders, dashboard.totalOrders), background: "linear-gradient(135deg,#fdba74,#f97316)" }} /></div>
                        </div>
                        <div className="barRow">
                          <div className="barMeta"><span>Cancelled</span><span>{dashboard.cancelledOrders} orders</span></div>
                          <div className="barTrack"><div className="barFill" style={{ width: clampWidth(dashboard.cancelledOrders, dashboard.totalOrders), background: "linear-gradient(135deg,#fca5a5,#ef4444)" }} /></div>
                        </div>
                      </div>
                    </div>

                    <div className="card chartCard">
                      <div className="chartTitle">
                        <strong>Feedback Moderation</strong>
                        <span className="muted">Community sentiment</span>
                      </div>
                      <div className="bars">
                        <div className="barRow">
                          <div className="barMeta"><span>Pending</span><span>{dashboard.pendingFeedback}</span></div>
                          <div className="barTrack"><div className="barFill" style={{ width: clampWidth(dashboard.pendingFeedback, dashboard.totalFeedback), background: "linear-gradient(135deg,#f9a8d4,#ec4899)" }} /></div>
                        </div>
                        <div className="barRow">
                          <div className="barMeta"><span>Reviewed</span><span>{dashboard.reviewedFeedback}</span></div>
                          <div className="barTrack"><div className="barFill" style={{ width: clampWidth(dashboard.reviewedFeedback, dashboard.totalFeedback), background: "linear-gradient(135deg,#93c5fd,#3b82f6)" }} /></div>
                        </div>
                        <div className="barRow">
                          <div className="barMeta"><span>Hidden</span><span>{dashboard.hiddenFeedback}</span></div>
                          <div className="barTrack"><div className="barFill" style={{ width: clampWidth(dashboard.hiddenFeedback, dashboard.totalFeedback), background: "linear-gradient(135deg,#c4b5fd,#8b5cf6)" }} /></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="split">
                    <div className="card chartCard">
                      <div className="chartTitle">
                        <strong>User Composition</strong>
                        <span className="muted">Access and activation</span>
                      </div>
                      <div className="bars">
                        <div className="barRow">
                          <div className="barMeta"><span>Active Users</span><span>{dashboard.activeUsers}</span></div>
                          <div className="barTrack"><div className="barFill" style={{ width: clampWidth(dashboard.activeUsers, dashboard.totalUsers), background: "linear-gradient(135deg,#67e8f9,#06b6d4)" }} /></div>
                        </div>
                        <div className="barRow">
                          <div className="barMeta"><span>Staff Users</span><span>{dashboard.staffUsers}</span></div>
                          <div className="barTrack"><div className="barFill" style={{ width: clampWidth(dashboard.staffUsers, dashboard.totalUsers), background: "linear-gradient(135deg,#d8b4fe,#a855f7)" }} /></div>
                        </div>
                      </div>
                    </div>

                    <div className="card chartCard">
                      <div className="chartTitle">
                        <strong>Top Product Categories</strong>
                        <span className="muted">Catalog mix</span>
                      </div>
                      <div className="bars">
                        {dashboard.topCategories.length ? dashboard.topCategories.map(([name, count]) => (
                          <div className="barRow" key={name}>
                            <div className="barMeta"><span>{name}</span><span>{count} items</span></div>
                            <div className="barTrack"><div className="barFill" style={{ width: clampWidth(count, products.length) }} /></div>
                          </div>
                        )) : <div className="muted">No category data available yet.</div>}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {!loading && tab === "products" ? (
                <div className="card">
                  {selectedProduct ? (
                    <div className="card detailCard">
                      {(() => {
                        const photoDraft = productPhotoDrafts[selectedProduct.id] || {};
                        const previewUrl = photoDraft.previewUrl || (!photoDraft.remove ? productImageUrl(selectedProduct) : "");
                        return (
                          <div className="photoField">
                            <div className="photoPreview">
                              {previewUrl ? <img src={previewUrl} alt={selectedProduct.name || "Product"} /> : <span>No Image</span>}
                            </div>
                            <div className="photoControls">
                              <input
                                className="fileInput"
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                onChange={(event) => changeProductPhotoDraft(selectedProduct.id, event.target.files?.[0] || null)}
                              />
                              <div className="actions">
                                <button
                                  className="btn2"
                                  type="button"
                                  onClick={() => removeProductPhotoDraft(selectedProduct.id)}
                                >
                                  Remove Image
                                </button>
                              </div>
                              <span className="photoHint">
                                Upload JPG, PNG, WebP, or GIF images up to 5MB. Click Save Product to apply the image change.
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                      <div className="detailHeader">
                        <div className="section">
                          <h2>Product Details</h2>
                          <p>Editing <strong>{selectedProduct.name}</strong> in full-screen mode. Save or delete from here.</p>
                        </div>
                        <div className="actions">
                          <button className="btn2" type="button" onClick={() => navigate("/admin")}>Back To Product List</button>
                          <span className="chip">ID {selectedProduct.id}</span>
                        </div>
                      </div>

                      <div className="formGrid">
                        <input value={selectedProduct.name} placeholder="Name" onChange={(e) => setProducts((c) => c.map((p) => p.id === selectedProduct.id ? { ...p, name: e.target.value } : p))} />
                        <input type="number" min="0" value={selectedProduct.flower_price ?? selectedProduct.flowerPrice ?? selectedProduct.price ?? ""} placeholder="Flower price" onChange={(e) => setProducts((c) => c.map((p) => p.id === selectedProduct.id ? { ...p, price: e.target.value, flower_price: e.target.value, flowerPrice: e.target.value } : p))} />
                        <input type="number" min="0" value={selectedProduct.bouquet_price ?? selectedProduct.bouquetPrice ?? ""} placeholder="Bouquet price" onChange={(e) => setProducts((c) => c.map((p) => p.id === selectedProduct.id ? { ...p, bouquet_price: e.target.value, bouquetPrice: e.target.value } : p))} />
                        <input value={selectedProduct.category || ""} placeholder="Category" onChange={(e) => setProducts((c) => c.map((p) => p.id === selectedProduct.id ? { ...p, category: e.target.value } : p))} />
                        <textarea className="full" value={selectedProduct.description} placeholder="Description" onInput={autoResizeTextarea} onChange={(e) => { autoResizeTextarea(e); setProducts((c) => c.map((p) => p.id === selectedProduct.id ? { ...p, description: e.target.value } : p)); }} />
                      </div>

                      <div className="actions">
                        <button className="btn" type="button" disabled={saving === `product-${selectedProduct.id}`} onClick={() => saveProduct(selectedProduct)}>
                          {saving === `product-${selectedProduct.id}` ? "Saving..." : "Save Product"}
                        </button>
                        <button className="btnDanger" type="button" disabled={saving === `delete-${selectedProduct.id}`} onClick={() => removeProduct(selectedProduct.id)}>
                          {saving === `delete-${selectedProduct.id}` ? "Deleting..." : "Delete Product"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="section"><h2>Product List</h2><p>Click a product name to open its full-screen detail editor.</p></div>
                      <div className="productToolbar">
                        <input
                          type="text"
                          placeholder="Search by name, ID, category, or description"
                          value={productSearch}
                          onChange={(event) => setProductSearch(event.target.value)}
                        />
                        <select
                          value={productCategoryFilter}
                          onChange={(event) => setProductCategoryFilter(event.target.value)}
                        >
                          <option value="all">All Categories</option>
                          {productCategories.map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                        <select
                          value={productSort}
                          onChange={(event) => setProductSort(event.target.value)}
                        >
                          <option value="newest">Newest First</option>
                          <option value="oldest">Oldest First</option>
                          <option value="name-asc">Name A-Z</option>
                          <option value="name-desc">Name Z-A</option>
                          <option value="price-low">Price Low To High</option>
                          <option value="price-high">Price High To Low</option>
                        </select>
                      </div>
                      <div className="productToolbarMeta">
                        <span>{filteredProducts.length} product{filteredProducts.length === 1 ? "" : "s"} shown</span>
                        {(productSearch || productCategoryFilter !== "all" || productSort !== "newest") ? (
                          <button
                            type="button"
                            className="btn2"
                            onClick={() => {
                              setProductSearch("");
                              setProductCategoryFilter("all");
                              setProductSort("newest");
                            }}
                          >
                            Reset Filters
                          </button>
                        ) : <span className="muted">All products</span>}
                      </div>
                      <div className="productList">
                        {filteredProducts.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            className="productItem"
                            onClick={() => {
                              navigate(`/admin/products/${product.id}`);
                            }}
                          >
                            <div className="productNameBtn">{product.name}</div>
                            <div className="productMeta">
                              <span>#{product.id}</span>
                              <span>Flower {fmtMoney(product.flower_price ?? product.flowerPrice ?? product.price)}</span>
                              <span>Bouquet {fmtMoney(product.bouquet_price ?? product.bouquetPrice ?? product.price)}</span>
                            </div>
                            <div className="productMeta">
                              <span>{product.category || "Uncategorized"}</span>
                              <span>{product.source || "django"}</span>
                              <span>{String(product.description || "").length} chars</span>
                            </div>
                          </button>
                        ))}
                        {!filteredProducts.length ? (
                          <div className="msg">No products matched the current search, category, or sort view.</div>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {!loading && tab === "orders" ? (
                <div>
                  {/* Order Metrics Summary Cards */}
                  <div className="subGrid" style={{ marginBottom: '1.25rem' }}>
                    <div className="card metric">
                      <span>Filtered Orders</span>
                      <strong>{filteredOrders.length}</strong>
                      <small>Out of {orders.length} total orders</small>
                    </div>
                    <div className="card metric">
                      <span>Paid Revenue</span>
                      <strong>{fmtMoney(filteredOrders.filter(o => o.status === 'Paid').reduce((acc, o) => acc + o.total_amount, 0))}</strong>
                      <small>From filtered paid orders</small>
                    </div>
                    <div className="card metric">
                      <span>Pending Shipments</span>
                      <strong>{filteredOrders.filter(o => o.status === 'Paid' && o.delivery_status !== 'delivered').length}</strong>
                      <small>Paid & not yet delivered</small>
                    </div>
                    <div className="card metric">
                      <span>Same-Day Deliveries</span>
                      <strong>{filteredOrders.filter(o => o.same_day_delivery).length}</strong>
                      <small>Express express shipments</small>
                    </div>
                  </div>

                  <div className="card">
                    <div className="section">
                      <h2>Manage Orders</h2>
                      <p>Review payment state, scheduled delivery windows, and bouquet tracking progress.</p>
                    </div>

                    {/* Order Toolbar Filters & Actions */}
                    <div className="orderToolbar">
                      <input 
                        type="text" 
                        placeholder="Search ID, name, email, phone, city..." 
                        value={orderSearch} 
                        onChange={(e) => setOrderSearch(e.target.value)} 
                      />
                      <select value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)}>
                        <option value="all">All Payment Statuses</option>
                        {orderStatuses.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                      <select value={orderDeliveryFilter} onChange={(e) => setOrderDeliveryFilter(e.target.value)}>
                        <option value="all">All Delivery Statuses</option>
                        {deliveryStatuses.map(([statusValue, label]) => (
                          <option key={statusValue} value={statusValue}>{label}</option>
                        ))}
                      </select>
                      <select value={orderSort} onChange={(e) => setOrderSort(e.target.value)}>
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="amount_desc">Amount: High to Low</option>
                        <option value="amount_asc">Amount: Low to High</option>
                      </select>
                      <button className="btn" style={{ height: "100%", display: "inline-flex", alignItems: "center" }} onClick={exportOrdersToCSV}>Export CSV</button>
                    </div>

                    <div className="tableWrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Order</th>
                            <th>Customer</th>
                            <th>Delivery Details</th>
                            <th>Total</th>
                            <th>Items</th>
                            <th>Payment</th>
                            <th>Tracking</th>
                            <th>Created</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOrders.map((order) => (
                            <tr key={order.id}>
                              <td>
                                <div className="stack">
                                  <button 
                                    className="productNameBtn" 
                                    style={{ textAlign: "left", display: "inline", padding: 0, background: "none", border: "none" }} 
                                    onClick={() => setSelectedOrder(order)}
                                  >
                                    #{order.id}
                                  </button>
                                  <span className="muted">{order.user_email || "Guest checkout"}</span>
                                </div>
                              </td>
                              <td>
                                <div className="stack">
                                  <strong>{order.customer_name}</strong>
                                  <span className="muted" style={{ fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px" }}>{order.address}</span>
                                </div>
                              </td>
                              <td>
                                <div className="stack">
                                  <span>{order.delivery_date || "Date pending"}</span>
                                  <span className="muted">{order.delivery_slot_label || order.delivery_slot || "Slot pending"}</span>
                                  <span className="muted">{order.phone} | {order.city}</span>
                                </div>
                              </td>
                              <td>{fmtMoney(order.total_amount)}</td>
                              <td>
                                <button 
                                  className="btn2" 
                                  style={{ padding: "0.25rem 0.5rem", borderRadius: "8px", fontSize: "0.82rem" }} 
                                  onClick={() => setSelectedOrder(order)}
                                >
                                  {Array.isArray(order.items) ? order.items.length : 0} Items
                                </button>
                              </td>
                              <td>
                                <select 
                                  value={order.status} 
                                  onChange={(e) => changeOrderStatus(order.id, { status: e.target.value })} 
                                  disabled={saving === `order-${order.id}`}
                                >
                                  {orderStatuses.map((statusValue) => (
                                    <option key={statusValue} value={statusValue}>{statusValue}</option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <select 
                                  value={order.delivery_status} 
                                  onChange={(e) => changeOrderStatus(order.id, { delivery_status: e.target.value })} 
                                  disabled={saving === `order-${order.id}`}
                                >
                                  {deliveryStatuses.map(([statusValue, label]) => (
                                    <option key={statusValue} value={statusValue}>{label}</option>
                                  ))}
                                </select>
                              </td>
                              <td>{fmtDate(order.created_at)}</td>
                              <td>
                                <button 
                                  className="btn" 
                                  style={{ padding: "0.35rem 0.75rem", borderRadius: "8px", fontSize: "0.85rem" }} 
                                  onClick={() => setSelectedOrder(order)}
                                >
                                  Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {filteredOrders.length === 0 ? (
                        <div className="msg" style={{ margin: "1rem", textAlign: "center" }}>No orders matched your current filters.</div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {!loading && tab === "history" ? (
                <div className="card">
                  <div className="section">
                    <h2>Order History</h2>
                    <p>Manage recorded order history and audit trails.</p>
                  </div>

                  {/* Filters & Search Toolbar */}
                  <div className="orderToolbar" style={{ gridTemplateColumns: "repeat(4, minmax(130px, 1fr)) minmax(200px, 1.5fr)" }}>
                    <select
                      value={historyStatusFilter}
                      onChange={(e) => setHistoryStatusFilter(e.target.value)}
                      className="select"
                    >
                      <option value="all">status</option>
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                      <option value="Failed">Failed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>

                    <select
                      value={historyDeliveryFilter}
                      onChange={(e) => setHistoryDeliveryFilter(e.target.value)}
                      className="select"
                    >
                      <option value="all">delivery status</option>
                      <option value="placed">Order Placed</option>
                      <option value="preparing">Preparing</option>
                      <option value="out_for_delivery">Out for Delivery</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>

                    <select
                      value={historySameDayFilter}
                      onChange={(e) => setHistorySameDayFilter(e.target.value)}
                      className="select"
                    >
                      <option value="all">same day delivery</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>

                    <select
                      value={historySort}
                      onChange={(e) => setHistorySort(e.target.value)}
                      className="select"
                    >
                      <option value="newest">ordered at</option>
                      <option value="oldest">Oldest First</option>
                      <option value="amount_desc">Amount: High to Low</option>
                      <option value="amount_asc">Amount: Low to High</option>
                    </select>

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input
                        type="text"
                        placeholder="Search ID, name, email, city..."
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        className="input"
                        style={{ flexGrow: 1 }}
                      />
                      <button className="btn" style={{ padding: "0 1rem" }}>Search</button>
                    </div>
                  </div>

                  {/* History Data Table */}
                  <div className="tableWrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>History ID</th>
                          <th>Order</th>
                          <th>Customer</th>
                          <th>Payment</th>
                          <th>Delivery</th>
                          <th>Total</th>
                          <th>Ordered</th>
                          <th>Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHistory.map((entry) => (
                          <tr key={entry.id}>
                            <td>#{entry.id}</td>
                            <td>{entry.source_order_id ? `#${entry.source_order_id}` : "-"}</td>
                            <td>
                              <div className="stack">
                                <strong>{entry.customer_name}</strong>
                                <span className="muted">{entry.user_email || "No linked account"}</span>
                              </div>
                            </td>
                            <td>
                              <span className={`pill ${String(entry.status).toLowerCase() === "paid" ? "pillPaid" : ""}`}>{entry.status}</span>
                            </td>
                            <td>
                              <div className="stack">
                                <span className="pill">{entry.delivery_status_label || entry.delivery_status}</span>
                                <span className="muted">
                                  {entry.delivery_date || "-"} | {entry.delivery_slot_label || entry.delivery_slot || "-"}
                                </span>
                              </div>
                            </td>
                            <td>{fmtMoney(entry.total_amount)}</td>
                            <td>{fmtDate(entry.ordered_at)}</td>
                            <td>{fmtDate(entry.updated_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredHistory.length === 0 ? (
                      <div className="msg" style={{ margin: "2rem", textAlign: "center" }}>No order history matched your filters.</div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {!loading && tab === "feedback" ? (
                <div className="card">
                  <div className="section"><h2>Moderate Feedback</h2><p>Review customer feedback and update moderation status.</p></div>
                  
                  {/* Feedback Filtering & Search Bar */}
                  <div className="orderToolbar" style={{ gridTemplateColumns: "repeat(2, minmax(130px, 1fr)) minmax(200px, 1.5fr)", marginBottom: "1.5rem" }}>
                    <select
                      value={feedbackStatusFilter}
                      onChange={(e) => setFeedbackStatusFilter(e.target.value)}
                      className="select"
                    >
                      <option value="all">moderation status</option>
                      <option value="pending">Pending</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="hidden">Hidden</option>
                    </select>

                    <select
                      value={feedbackRatingFilter}
                      onChange={(e) => setFeedbackRatingFilter(e.target.value)}
                      className="select"
                    >
                      <option value="all">rating</option>
                      <option value="5">5 stars</option>
                      <option value="4">4 stars</option>
                      <option value="3">3 stars</option>
                      <option value="2">2 stars</option>
                      <option value="1">1 star</option>
                    </select>

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input
                        type="text"
                        placeholder="Search user, email, product, message..."
                        value={feedbackSearch}
                        onChange={(e) => setFeedbackSearch(e.target.value)}
                        className="input"
                        style={{ flexGrow: 1 }}
                      />
                      <button className="btn" style={{ padding: "0 1rem" }}>Search</button>
                    </div>
                  </div>

                  <div className="tableWrap">
                    <table className="table"><thead><tr><th>Feedback</th><th>User</th><th>Target</th><th>Rating</th><th>Status</th><th>Created</th></tr></thead><tbody>
                      {filteredFeedback.map((entry) => (
                        <tr key={entry.id}>
                          <td><div className="stack"><strong>{entry.title}</strong><span className="muted">{entry.message}</span></div></td>
                          <td><div className="stack"><span>{entry.user_name}</span><span className="muted">{entry.user_email || "Guest"}</span></div></td>
                          <td>{entry.product_name || entry.target_type}</td><td>{entry.rating}/5</td>
                          <td><select value={entry.status} onChange={(e) => changeFeedbackStatus(entry.id, e.target.value)} disabled={saving === `feedback-${entry.id}`}>{feedbackStatuses.map((statusValue) => <option key={statusValue} value={statusValue}>{statusValue}</option>)}</select></td>
                          <td>{fmtDate(entry.created_at)}</td>
                        </tr>
                      ))}
                    </tbody></table>
                    {filteredFeedback.length === 0 ? (
                      <div className="msg" style={{ margin: "2rem", textAlign: "center" }}>No feedback matched your filters.</div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {!loading && tab === "users" ? (
                <div className="card">
                  <div className="section"><h2>User Manager And Staff Access</h2><p>Manage user details, active status, staff access, and group assignments.</p></div>
                  <div className="usersPanel">
                    <div className="userList">
                      {users.map((user) => (
                        <article className="userCard" key={user.id}>
                          <div className="userIdentity">
                            <div className="userAvatar">{(user.username || user.email || "U").slice(0, 1).toUpperCase()}</div>
                            <div className="userTitle">
                              <strong>{user.username}</strong>
                              <span className="muted">Joined {fmtDate(user.date_joined)}</span>
                              <span className="muted userEmailValue">{user.email || "No email added"}</span>
                            </div>
                          </div>

                          <div className="userEditGrid">
                            <label className="field">
                              <span>First name</span>
                              <input value={user.first_name || ""} placeholder="First name" onChange={(e) => setUsers((c) => c.map((item) => item.id === user.id ? { ...item, first_name: e.target.value } : item))} />
                            </label>
                            <label className="field">
                              <span>Last name</span>
                              <input value={user.last_name || ""} placeholder="Last name" onChange={(e) => setUsers((c) => c.map((item) => item.id === user.id ? { ...item, last_name: e.target.value } : item))} />
                            </label>
                            <label className="field full">
                              <span>Email</span>
                              <input value={user.email || ""} placeholder="Email address" onChange={(e) => setUsers((c) => c.map((item) => item.id === user.id ? { ...item, email: e.target.value } : item))} />
                            </label>
                          </div>

                          <div className="flagGroup">
                            <span className="fieldLabel">Access flags</span>
                            <label className="checkRow"><input type="checkbox" checked={Boolean(user.is_active)} onChange={(e) => setUsers((c) => c.map((item) => item.id === user.id ? { ...item, is_active: e.target.checked } : item))} /> Active</label>
                            <label className="checkRow"><input type="checkbox" checked={Boolean(user.is_staff)} onChange={(e) => setUsers((c) => c.map((item) => item.id === user.id ? { ...item, is_staff: e.target.checked } : item))} /> Staff</label>
                            <span className="accountBadge">{user.is_superuser ? "Superuser" : "Regular account"}</span>
                          </div>

                          <div className="userActions"><button className="btn" type="button" disabled={saving === `user-${user.id}`} onClick={() => saveUser(user)}>{saving === `user-${user.id}` ? "Saving..." : "Save User"}</button></div>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {!loading && tab === "permissions" ? (
                <div className="card">
                  <div className="section"><h2>Manage Permissions</h2><p>View Django groups and their permissions. Assign these groups from the Users tab.</p></div>
                  <div className="grid">
                    {groups.map((group) => (
                      <div className="card" key={group.id}>
                        <strong>{group.name}</strong>
                        <div className="muted" style={{ marginTop: ".35rem" }}>{group.user_count} assigned user(s)</div>
                        <div className="stack" style={{ marginTop: ".7rem" }}>
                          {group.permissions.length ? group.permissions.map((permission) => <span className="pill" key={permission.id}>{permission.app_label}.{permission.codename}</span>) : <span className="muted">No permissions in this group.</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {!loading && tab === "staff" ? (
                <div className="card">
                  <div className="section"><h2>Create Staff Account</h2><p>Create a new active staff user directly from the frontend website page.</p></div>
                  <form className="card" onSubmit={createStaff}>
                    <div className="formGrid">
                      <input placeholder="First name" value={staffForm.first_name} onChange={(e) => setStaffForm((c) => ({ ...c, first_name: e.target.value }))} />
                      <input placeholder="Last name" value={staffForm.last_name} onChange={(e) => setStaffForm((c) => ({ ...c, last_name: e.target.value }))} />
                      <input placeholder="Username" value={staffForm.username} onChange={(e) => setStaffForm((c) => ({ ...c, username: e.target.value }))} />
                      <input placeholder="Email" type="email" value={staffForm.email} onChange={(e) => setStaffForm((c) => ({ ...c, email: e.target.value }))} />
                      <input placeholder="Password" type="password" value={staffForm.password} onChange={(e) => setStaffForm((c) => ({ ...c, password: e.target.value }))} />
                    </div>
                    <div className="actions"><button className="btn" type="submit" disabled={saving === "staff-create"}>{saving === "staff-create" ? "Creating..." : "Create Staff Account"}</button></div>
                  </form>
                </div>
              ) : null}

              {!loading && tab === "create-product" ? (
                <div className="card">
                  <div className="section"><h2>Create Product</h2><p>Add a new product from this dedicated top-level admin page.</p></div>
                  <form className="card" onSubmit={createProduct}>
                    <div className="formGrid">
                      <input placeholder="Name" value={productForm.name} onChange={(e) => setProductForm((c) => ({ ...c, name: e.target.value }))} />
                      <input type="number" min="0" placeholder="Flower price" value={productForm.flower_price} onChange={(e) => setProductForm((c) => ({ ...c, flower_price: e.target.value }))} />
                      <input type="number" min="0" placeholder="Bouquet price" value={productForm.bouquet_price} onChange={(e) => setProductForm((c) => ({ ...c, bouquet_price: e.target.value }))} />
                      <input placeholder="Category" value={productForm.category} onChange={(e) => setProductForm((c) => ({ ...c, category: e.target.value }))} />
                      <textarea className="full" placeholder="Description" value={productForm.description} onInput={autoResizeTextarea} onChange={(e) => { autoResizeTextarea(e); setProductForm((c) => ({ ...c, description: e.target.value })); }} />
                      <div className="photoField full">
                        <div className="photoPreview">
                          {productFormPhotoPreview ? <img src={productFormPhotoPreview} alt={productForm.name || "New product"} /> : <span>No Image</span>}
                        </div>
                        <div className="photoControls">
                          <input
                            className="fileInput"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={(event) => changeProductFormPhoto(event.target.files?.[0] || null)}
                          />
                          <span className="photoHint">Upload an optional product image. JPG, PNG, WebP, and GIF files up to 5MB are supported.</span>
                        </div>
                      </div>
                    </div>
                    <div className="actions">
                      <button className="btn" type="submit" disabled={saving === "new-product"}>{saving === "new-product" ? "Creating..." : "Create Product"}</button>
                    </div>
                  </form>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        {/* Dynamic Detailed Order Modal Overlay */}
        {selectedOrder ? (
          <div className="modalOverlay" onClick={() => setSelectedOrder(null)}>
            <div className="modalContent" onClick={(e) => e.stopPropagation()}>
              <div className="modalHeader">
                <h3>Order Details #{selectedOrder.id}</h3>
                <button className="btn2" style={{ padding: "0.25rem 0.6rem", borderRadius: "8px", border: "none", cursor: "pointer" }} onClick={() => setSelectedOrder(null)}>✕</button>
              </div>
              <div className="modalBody">
                <div className="detailGrid">
                  <div className="stack" style={{ gap: "1.2rem" }}>
                    {/* Customer and Shipping Section */}
                    <div className="detailSection">
                      <h4>Customer & Shipping Details</h4>
                      <div className="infoList">
                        <div className="infoRow">
                          <span className="infoLabel">Customer Name:</span>
                          <span className="infoValue">{selectedOrder.customer_name}</span>
                        </div>
                        <div className="infoRow">
                          <span className="infoLabel">Email:</span>
                          <span className="infoValue">{selectedOrder.user_email || "Guest checkout"}</span>
                        </div>
                        <div className="infoRow">
                          <span className="infoLabel">Phone:</span>
                          <span className="infoValue">{selectedOrder.phone}</span>
                        </div>
                        <div className="infoRow">
                          <span className="infoLabel">Address:</span>
                          <span className="infoValue">{selectedOrder.address}</span>
                        </div>
                        <div className="infoRow">
                          <span className="infoLabel">City & Pincode:</span>
                          <span className="infoValue">{selectedOrder.city} - {selectedOrder.pincode}</span>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Slot Section */}
                    <div className="detailSection">
                      <h4>Delivery Schedule</h4>
                      <div className="infoList">
                        <div className="infoRow">
                          <span className="infoLabel">Scheduled Date:</span>
                          <span className="infoValue">{selectedOrder.delivery_date || "Date pending"}</span>
                        </div>
                        <div className="infoRow">
                          <span className="infoLabel">Time Slot:</span>
                          <span className="infoValue">{selectedOrder.delivery_slot_label || selectedOrder.delivery_slot || "Slot pending"}</span>
                        </div>
                        <div className="infoRow">
                          <span className="infoLabel">Same-Day Delivery:</span>
                          <span className="infoValue">{selectedOrder.same_day_delivery ? "Yes (Express)" : "No (Standard)"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="stack" style={{ gap: "1.2rem" }}>
                    {/* Payment and Status Section */}
                    <div className="detailSection">
                      <h4>Payment & Tracking</h4>
                      <div className="infoList" style={{ marginBottom: "0.8rem" }}>
                        <div className="infoRow">
                          <span className="infoLabel">Order Total:</span>
                          <span className="infoValue" style={{ fontSize: "1.1rem", fontWeight: "700" }}>{fmtMoney(selectedOrder.total_amount)}</span>
                        </div>
                        <div className="infoRow">
                          <span className="infoLabel">Payment Status:</span>
                          <span className="infoValue">
                            <span className={`badge ${selectedOrder.status ? selectedOrder.status.toLowerCase() : "pending"}`}>
                              {selectedOrder.status}
                            </span>
                          </span>
                        </div>
                        <div className="infoRow">
                          <span className="infoLabel">Delivery Status:</span>
                          <span className="infoValue" style={{ textTransform: "capitalize" }}>
                            {selectedOrder.delivery_status_label || selectedOrder.delivery_status || "Placed"}
                          </span>
                        </div>
                        {selectedOrder.payment_id && (
                          <div className="infoRow">
                            <span className="infoLabel">Payment ID:</span>
                            <span className="infoValue" style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{selectedOrder.payment_id}</span>
                          </div>
                        )}
                        {selectedOrder.payment_order_id && (
                          <div className="infoRow">
                            <span className="infoLabel">Razorpay Order ID:</span>
                            <span className="infoValue" style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{selectedOrder.payment_order_id}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Dropdowns to modify status directly from detail modal */}
                      <div className="stack" style={{ gap: "0.5rem", marginTop: "1rem" }}>
                        <div className="field">
                          <span className="fieldLabel">Update Payment Status</span>
                          <select 
                            value={selectedOrder.status} 
                            onChange={(e) => {
                              changeOrderStatus(selectedOrder.id, { status: e.target.value });
                              setSelectedOrder(prev => ({ ...prev, status: e.target.value }));
                            }} 
                            disabled={saving === `order-${selectedOrder.id}`}
                          >
                            {orderStatuses.map((statusValue) => (
                              <option key={statusValue} value={statusValue}>{statusValue}</option>
                            ))}
                          </select>
                        </div>
                        <div className="field">
                          <span className="fieldLabel">Update Delivery Status</span>
                          <select 
                            value={selectedOrder.delivery_status} 
                            onChange={(e) => {
                              changeOrderStatus(selectedOrder.id, { delivery_status: e.target.value });
                              setSelectedOrder(prev => ({ 
                                ...prev, 
                                delivery_status: e.target.value,
                                delivery_status_label: deliveryStatuses.find(d => d[0] === e.target.value)?.[1] || e.target.value
                              }));
                            }} 
                            disabled={saving === `order-${selectedOrder.id}`}
                          >
                            {deliveryStatuses.map(([statusValue, label]) => (
                              <option key={statusValue} value={statusValue}>{label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Gift Message and Occasion Section */}
                    {selectedOrder.gift_message || selectedOrder.occasion ? (
                      <div className="giftMessageCard">
                        <span className="fieldLabel">Gift Card Details</span>
                        <div style={{ marginTop: "0.4rem", fontWeight: "700" }}>
                          Occasion: {selectedOrder.occasion ? selectedOrder.occasion.replace(/_/g, " ").toUpperCase() : "GIFTING"}
                        </div>
                        {selectedOrder.gift_message ? (
                          <div className="giftMessageText">
                            "{selectedOrder.gift_message}"
                          </div>
                        ) : (
                          <div className="muted" style={{ fontSize: "0.85rem", fontStyle: "italic" }}>No custom message written.</div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Ordered Items Section */}
                <div className="detailSection">
                  <h4>Items Ordered ({Array.isArray(selectedOrder.items) ? selectedOrder.items.length : 0})</h4>
                  <div style={{ maxHeight: "250px", overflowY: "auto", paddingRight: "0.2rem" }}>
                    {Array.isArray(selectedOrder.items) && selectedOrder.items.map((item, idx) => {
                      const image = productImageUrl(item);
                      const price = Number(item.price || item.flower_price || item.bouquet_price || 0);
                      const quantity = Number(item.qty || item.quantity || 1);
                      const subtotal = price * quantity;
                      return (
                        <div className="itemRow" key={`${item.id}-${idx}`}>
                          {image ? (
                            <img className="itemImage" src={image} alt={item.name} />
                          ) : (
                            <div className="itemImage" style={{ display: "grid", placeItems: "center", background: "rgba(255,255,255,0.05)" }}>❀</div>
                          )}
                          <div className="itemInfo">
                            <strong>{item.name}</strong>
                            <span>{item.purchaseType ? `${item.purchaseType[0].toUpperCase()}${item.purchaseType.slice(1)}` : "Flower"} ({item.category || "Flower"})</span>
                          </div>
                          <div className="muted" style={{ fontSize: "0.9rem", margin: "0 1.5rem" }}>
                            {fmtMoney(price)} x {quantity}
                          </div>
                          <div className="itemTotal">
                            {fmtMoney(subtotal)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="modalFooter">
                <button className="btn2" onClick={() => printOrderReceipt(selectedOrder)}>Print Receipt</button>
                <button className="btn" onClick={() => setSelectedOrder(null)}>Close</button>
              </div>
            </div>
          </div>
        ) : null}

      </section>
    </>
  );
}
