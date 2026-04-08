import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
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
  updateAdminFeedback,
  updateAdminOrder,
  updateAdminProduct,
  updateAdminUser,
} from "../services/api";

const tabs = [
  ["overview", "Overview"],
  ["products", "Products"],
  ["orders", "Orders"],
  ["history", "Order History"],
  ["feedback", "Feedback"],
  ["users", "Users"],
  ["permissions", "Permissions"],
  ["staff", "Create Staff"],
  ["create-product", "Create Product"],
];

const orderStatuses = ["Pending", "Paid", "Cancelled"];
const feedbackStatuses = ["pending", "reviewed", "hidden"];

const emptyProduct = { name: "", price: "", category: "", description: "" };
const emptyStaff = { first_name: "", last_name: "", username: "", email: "", password: "" };

const fmtMoney = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(amount || 0));
const fmtDate = (value) => (value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-");
const pct = (value, total) => (total ? Math.round((value / total) * 100) : 0);
const clampWidth = (value, total) => `${Math.max(8, pct(value, total))}%`;
const autoResizeTextarea = (event) => {
  const element = event.target;
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
};

export default function AdminPortal({ authUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [feedbackEntries, setFeedbackEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [staffForm, setStaffForm] = useState(emptyStaff);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const hasAdminAccess = Boolean(authUser?.is_staff || authUser?.is_superuser);
  const productDetailMatch = location.pathname.match(/^\/admin\/products\/(\d+)\/?$/);
  const selectedProductId = productDetailMatch ? Number(productDetailMatch[1]) : null;

  const dashboard = useMemo(() => {
    const totalOrders = orders.length;
    const paidOrders = orders.filter((order) => order.status === "Paid");
    const pendingOrders = orders.filter((order) => order.status === "Pending");
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
      products.length === 0 ? "No products are available in the catalog yet" : null,
    ].filter(Boolean);

    return {
      totalOrders,
      paidOrders: paidOrders.length,
      pendingOrders: pendingOrders.length,
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
  }, [orders, overview, users, feedbackEntries, products]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [a, b, c, d, e, f, g] = await Promise.all([
        getAdminOverview(),
        getAdminProducts(),
        getAdminOrders(),
        getAdminOrderHistory(),
        getAdminFeedback(),
        getAdminUsers(),
        getAdminGroups(),
      ]);
      setOverview(a.data);
      const loadedProducts = b.data?.results || [];
      setProducts(loadedProducts);
      setOrders(c.data?.results || []);
      setHistoryEntries(d.data?.results || []);
      setFeedbackEntries(e.data?.results || []);
      setUsers(f.data?.results || []);
      setGroups(g.data?.results || []);
    } catch (requestError) {
      setError(requestError?.response?.data?.error || requestError?.message || "Unable to load admin workspace.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAdminAccess) {
      loadAll();
    } else {
      setLoading(false);
    }
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
        const response = await updateAdminProduct(product.id, { ...product, price: Number(product.price) });
        setProducts((current) => current.map((item) => (item.id === product.id ? response.data.product : item)));
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
        const response = await createAdminProduct({ ...productForm, price: Number(productForm.price) });
        setProducts((current) => [response.data.product, ...current]);
        setProductForm(emptyProduct);
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

  const changeOrderStatus = async (orderId, status) => {
    setSaving(`order-${orderId}`);
    try {
      const response = await updateAdminOrder(orderId, { status });
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

  if (!authUser) return <Navigate to="/login" replace />;

  return (
    <>
      <style>{`
        .ap{min-height:100vh;padding:calc(var(--nav-height) + 1.5rem) 1rem 3rem;background:linear-gradient(180deg,#f8f4ee 0%,#f3ede3 48%,#efe7db 100%);color:#241c17;font-family:'Jost',sans-serif}
        .aw{width:min(1320px,100%);margin:0 auto;display:grid;gap:1rem}.card,.tableWrap,.msg{border:1px solid rgba(88,66,43,.12);background:rgba(255,255,255,.86);border-radius:22px;box-shadow:0 18px 40px rgba(89,61,36,.10)}
        .card{padding:1rem}
        .topActions{display:flex;justify-content:flex-end;gap:1rem}
        .row,.tabs,.actions{display:flex;flex-wrap:wrap;gap:.7rem}.chip,.tab,.btn,.btn2,.btnDanger,input,textarea,select{font:inherit;border-radius:14px;border:1px solid rgba(88,66,43,.14);background:#fff;color:#241c17}
        .chip,.tab,.btn,.btn2,.btnDanger{padding:.7rem 1rem}.tab{cursor:pointer}.tab.active,.btn{background:linear-gradient(135deg,#d7b56d,#b37a1f);color:#201608;font-weight:700;border:none}
        .btn2,.btnDanger{text-decoration:none;display:inline-flex;align-items:center;justify-content:center}.btn2{background:#fff7ec;color:#5a442b}.btnDanger{background:linear-gradient(135deg,#ef4444,#991b1b);border:none;color:#fff;font-weight:700}.msg{padding:.9rem 1rem}.err{color:#8a1f1f;background:#fde2e2}
        .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:1rem}.metric{padding:1rem}.metric strong{font-size:1.6rem;display:block;color:#241c17}.metric span,.metric small,.muted{color:#6a5a4c}
        .section h2{margin:0;color:#221912}.section p{color:#6a5a4c}
        .formGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.8rem}.full{grid-column:1/-1}
        input,textarea,select{width:100%;padding:.7rem .8rem;outline:none}textarea{min-height:140px;resize:none;overflow:hidden}.tableWrap{overflow:auto}.table{width:100%;min-width:920px;border-collapse:collapse}.table th,.table td{padding:.8rem;border-bottom:1px solid rgba(88,66,43,.10);vertical-align:top;text-align:left}.table th{font-size:.76rem;letter-spacing:.08em;text-transform:uppercase;color:#7a6a5c}
        .stack{display:grid;gap:.35rem}.multi{min-height:96px}.pill{display:inline-flex;padding:.28rem .65rem;border-radius:999px;background:#f7efe3;border:1px solid rgba(88,66,43,.12);color:#5f4c3b}
        .heroGrid{display:grid;grid-template-columns:1.5fr 1fr;gap:1rem}.subGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;margin-top:1rem}
        .chartCard{padding:1rem}.chartTitle{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;margin-bottom:.8rem}.chartTitle strong{font-size:1.05rem;color:#241c17}
        .bars{display:grid;gap:.7rem}.barRow{display:grid;gap:.35rem}.barMeta{display:flex;justify-content:space-between;gap:.75rem;font-size:.9rem;color:#5d4f41}.barTrack{height:10px;border-radius:999px;background:#efe4d6;overflow:hidden}.barFill{height:100%;border-radius:999px;background:linear-gradient(135deg,#d7b56d,#e8536d)}
        .spark{display:flex;align-items:flex-end;gap:.55rem;height:180px;padding-top:1rem}.sparkCol{flex:1;display:grid;gap:.45rem;justify-items:center}.sparkBar{width:100%;max-width:42px;border-radius:14px 14px 8px 8px;background:linear-gradient(180deg,#d7b56d,#b37a1f);min-height:12px}.sparkLabel,.sparkValue{font-size:.78rem;color:#6d5c4d;text-align:center}
        .attentionList{display:grid;gap:.7rem;margin-top:1rem}.attentionItem{padding:.85rem 1rem;border-radius:16px;background:#fff9f0;border:1px solid rgba(88,66,43,.08);color:#4d3d30}
        .split{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem;margin-top:1rem}
        .productList{display:grid;gap:.7rem;max-height:720px;overflow:auto;padding-right:.2rem;margin-top:1rem}
        .productItem{width:100%;text-align:left;padding:1rem 1.1rem;border-radius:18px;border:1px solid rgba(88,66,43,.10);background:#fffaf4;color:#241c17;cursor:pointer}
        .productItem.active{background:linear-gradient(135deg,rgba(215,181,109,.18),rgba(232,83,109,.14));border-color:rgba(215,181,109,.42)}
        .productNameBtn{all:unset;cursor:pointer;font-size:1.06rem;font-weight:700;line-height:1.4;color:#241c17}
        .productMeta{display:flex;justify-content:space-between;gap:.75rem;margin-top:.45rem;color:#6d5c4d;font-size:.88rem}
        .detailCard{display:grid;gap:1rem}
        .detailHeader{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}
        .detailHeader h3{margin:0;font-size:1.3rem}
        @media (max-width:980px){.heroGrid{grid-template-columns:1fr}}
      `}</style>
      <section className="ap">
        <div className="aw">
          <div className="topActions">
            <Link className="btn2" to="/">Back To Store</Link>
          </div>

          {!hasAdminAccess ? <div className="msg err">Your account does not have staff access yet.</div> : null}
          {notice ? <div className="msg">{notice}</div> : null}
          {error ? <div className="msg err">{error}</div> : null}

          {hasAdminAccess ? (
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
                    <div className="card metric"><span>Conversion Flow</span><strong>{dashboard.paidOrders}/{dashboard.totalOrders || 0}</strong><small>{dashboard.pendingOrders} pending, {dashboard.cancelledOrders} cancelled</small></div>
                    <div className="card metric"><span>User Health</span><strong>{dashboard.activeUsers}/{dashboard.totalUsers || 0}</strong><small>{dashboard.staffUsers} staff accounts active in admin</small></div>
                    <div className="card metric"><span>Feedback Score</span><strong>{dashboard.avgRating}/5</strong><small>{dashboard.pendingFeedback} pending moderation items</small></div>
                    <div className="card metric"><span>Catalog Shape</span><strong>{products.length}</strong><small>{dashboard.topCategories[0]?.[0] || "No top category yet"} leads the catalog</small></div>
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
                        <input type="number" value={selectedProduct.price} placeholder="Price" onChange={(e) => setProducts((c) => c.map((p) => p.id === selectedProduct.id ? { ...p, price: e.target.value } : p))} />
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
                      <div className="productList">
                        {products.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            className="productItem"
                            onClick={() => navigate(`/admin/products/${product.id}`)}
                          >
                            <div className="productNameBtn">{product.name}</div>
                            <div className="productMeta">
                              <span>#{product.id}</span>
                              <span>{fmtMoney(product.price)}</span>
                            </div>
                            <div className="productMeta">
                              <span>{product.category || "Uncategorized"}</span>
                              <span>{String(product.description || "").length} chars</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {!loading && tab === "orders" ? (
                <div className="card">
                  <div className="section"><h2>Manage Orders</h2><p>Review current orders and update their status.</p></div>
                  <div className="tableWrap">
                    <table className="table"><thead><tr><th>Order</th><th>Customer</th><th>Contact</th><th>Total</th><th>Items</th><th>Status</th><th>Created</th></tr></thead><tbody>
                      {orders.map((order) => (
                        <tr key={order.id}>
                          <td className="stack"><strong>#{order.id}</strong><span className="muted">{order.user_email || "Guest checkout"}</span></td>
                          <td className="stack"><strong>{order.customer_name}</strong><span className="muted">{order.address}</span></td>
                          <td className="stack"><span>{order.phone}</span><span className="muted">{order.city} {order.pincode}</span></td>
                          <td>{fmtMoney(order.total_amount)}</td><td>{Array.isArray(order.items) ? order.items.length : 0}</td>
                          <td><select value={order.status} onChange={(e) => changeOrderStatus(order.id, e.target.value)} disabled={saving === `order-${order.id}`}>{orderStatuses.map((statusValue) => <option key={statusValue} value={statusValue}>{statusValue}</option>)}</select></td>
                          <td>{fmtDate(order.created_at)}</td>
                        </tr>
                      ))}
                    </tbody></table>
                  </div>
                </div>
              ) : null}

              {!loading && tab === "history" ? (
                <div className="card">
                  <div className="section"><h2>Order History</h2><p>Read-only history list of recorded order snapshots.</p></div>
                  <div className="tableWrap">
                    <table className="table"><thead><tr><th>History ID</th><th>Order</th><th>Customer</th><th>Status</th><th>Total</th><th>Ordered</th><th>Updated</th></tr></thead><tbody>
                      {historyEntries.map((entry) => (
                        <tr key={entry.id}>
                          <td>#{entry.id}</td><td>{entry.source_order_id ? `#${entry.source_order_id}` : "-"}</td>
                          <td className="stack"><strong>{entry.customer_name}</strong><span className="muted">{entry.user_email || "No linked account"}</span></td>
                          <td><span className="pill">{entry.status}</span></td><td>{fmtMoney(entry.total_amount)}</td><td>{fmtDate(entry.ordered_at)}</td><td>{fmtDate(entry.updated_at)}</td>
                        </tr>
                      ))}
                    </tbody></table>
                  </div>
                </div>
              ) : null}

              {!loading && tab === "feedback" ? (
                <div className="card">
                  <div className="section"><h2>Moderate Feedback</h2><p>Review customer feedback and update moderation status.</p></div>
                  <div className="tableWrap">
                    <table className="table"><thead><tr><th>Feedback</th><th>User</th><th>Target</th><th>Rating</th><th>Status</th><th>Created</th></tr></thead><tbody>
                      {feedbackEntries.map((entry) => (
                        <tr key={entry.id}>
                          <td className="stack"><strong>{entry.title}</strong><span className="muted">{entry.message}</span></td>
                          <td className="stack"><span>{entry.user_name}</span><span className="muted">{entry.user_email || "Guest"}</span></td>
                          <td>{entry.product_name || entry.target_type}</td><td>{entry.rating}/5</td>
                          <td><select value={entry.status} onChange={(e) => changeFeedbackStatus(entry.id, e.target.value)} disabled={saving === `feedback-${entry.id}`}>{feedbackStatuses.map((statusValue) => <option key={statusValue} value={statusValue}>{statusValue}</option>)}</select></td>
                          <td>{fmtDate(entry.created_at)}</td>
                        </tr>
                      ))}
                    </tbody></table>
                  </div>
                </div>
              ) : null}

              {!loading && tab === "users" ? (
                <div className="card">
                  <div className="section"><h2>User Manager And Staff Access</h2><p>Manage user details, active status, staff access, and group assignments.</p></div>
                  <div className="tableWrap">
                    <table className="table"><thead><tr><th>User</th><th>Name</th><th>Email</th><th>Flags</th><th>Groups</th><th>Actions</th></tr></thead><tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="stack"><strong>{user.username}</strong><span className="muted">Joined {fmtDate(user.date_joined)}</span></td>
                          <td className="stack"><input value={user.first_name || ""} placeholder="First name" onChange={(e) => setUsers((c) => c.map((item) => item.id === user.id ? { ...item, first_name: e.target.value } : item))} /><input value={user.last_name || ""} placeholder="Last name" onChange={(e) => setUsers((c) => c.map((item) => item.id === user.id ? { ...item, last_name: e.target.value } : item))} /></td>
                          <td><input value={user.email || ""} onChange={(e) => setUsers((c) => c.map((item) => item.id === user.id ? { ...item, email: e.target.value } : item))} /></td>
                          <td className="stack">
                            <label><input type="checkbox" checked={Boolean(user.is_active)} onChange={(e) => setUsers((c) => c.map((item) => item.id === user.id ? { ...item, is_active: e.target.checked } : item))} /> Active</label>
                            <label><input type="checkbox" checked={Boolean(user.is_staff)} onChange={(e) => setUsers((c) => c.map((item) => item.id === user.id ? { ...item, is_staff: e.target.checked } : item))} /> Staff</label>
                            <span className="muted">{user.is_superuser ? "Superuser" : "Regular account"}</span>
                          </td>
                          <td><select className="multi" multiple value={(user.groups || []).map((group) => String(group.id))} onChange={(e) => setUsers((c) => c.map((item) => item.id === user.id ? { ...item, groups: Array.from(e.target.selectedOptions).map((option) => ({ id: Number(option.value), name: option.label })) } : item))}>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></td>
                          <td><button className="btn" type="button" disabled={saving === `user-${user.id}`} onClick={() => saveUser(user)}>{saving === `user-${user.id}` ? "Saving..." : "Save User"}</button></td>
                        </tr>
                      ))}
                    </tbody></table>
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
                      <input type="number" placeholder="Price" value={productForm.price} onChange={(e) => setProductForm((c) => ({ ...c, price: e.target.value }))} />
                      <input placeholder="Category" value={productForm.category} onChange={(e) => setProductForm((c) => ({ ...c, category: e.target.value }))} />
                      <textarea className="full" placeholder="Description" value={productForm.description} onInput={autoResizeTextarea} onChange={(e) => { autoResizeTextarea(e); setProductForm((c) => ({ ...c, description: e.target.value })); }} />
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
      </section>
    </>
  );
}
