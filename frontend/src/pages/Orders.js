import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getOrderHistory } from "../services/api";
import { PRODUCT_SPECIFIC_IMAGES } from "../data/catalogProducts";

const DELIVERY_STAGE_ORDER = [
  "order_placed",
  "preparing_bouquet",
  "out_for_delivery",
  "delivered",
];

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const formatDateOnly = (value) => {
  if (!value) {
    return "-";
  }

  try {
    return new Intl.DateTimeFormat("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value;
  }
};

const formatShortDate = (value) => {
  if (!value) {
    return "-";
  }

  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value;
  }
};

const getOrderItemImage = (item) => {
  const name = String(item?.name || "").trim();
  const category = String(item?.category || "").trim();
  return (
    item?.image ||
    item?.photo_url ||
    item?.professional_image ||
    PRODUCT_SPECIFIC_IMAGES[`${category}:${name}`] ||
    PRODUCT_SPECIFIC_IMAGES[name] ||
    ""
  );
};

const formatPurchaseType = (value) => {
  const normalized = String(value || "").replace(/_/g, " ").trim();
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "Flower";
};

function FloatingPetal({ style }) {
  return (
    <motion.div
      style={style}
      className="orders-petal"
      animate={{ y: ["0vh", "110vh"], rotate: [0, 360], opacity: [0, 0.7, 0] }}
      transition={{ duration: style.duration, repeat: Infinity, ease: "linear", delay: style.delay }}
    />
  );
}

export default function Orders({ authUser = null }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedOrders, setExpandedOrders] = useState({});
  const petalsRef = useRef(
    Array.from({ length: 12 }, () => ({
      left: `${Math.random() * 100}%`,
      width: `${12 + Math.random() * 18}px`,
      height: `${16 + Math.random() * 22}px`,
      duration: 7 + Math.random() * 9,
      delay: Math.random() * 10,
      filter: `hue-rotate(${Math.random() * 30 - 15}deg)`,
    }))
  );

  useEffect(() => {
    if (!authUser) {
      setLoading(false);
      return undefined;
    }

    let active = true;

    const loadOrders = async ({ quiet = false } = {}) => {
      if (!quiet) {
        setLoading(true);
      }

      try {
        const response = await getOrderHistory();
        if (active) {
          setOrders(response.data || []);
          setError("");
        }
      } catch (requestError) {
        if (active) {
          setError(requestError?.response?.data?.error || "We could not load your deliveries right now.");
        }
      } finally {
        if (active && !quiet) {
          setLoading(false);
        }
      }
    };

    loadOrders();
    const intervalId = window.setInterval(() => loadOrders({ quiet: true }), 20000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [authUser]);

  const enrichedOrders = useMemo(
    () =>
      orders.map((order) => {
        const currentIndex = Math.max(
          DELIVERY_STAGE_ORDER.indexOf(order.delivery_status),
          0
        );

        return {
          ...order,
          currentIndex,
          progressPercent: ((currentIndex + 1) / DELIVERY_STAGE_ORDER.length) * 100,
        };
      }),
    [orders]
  );

  const toggleOrderDetails = (orderId) => {
    setExpandedOrders((current) => ({
      ...current,
      [orderId]: !current[orderId],
    }));
  };

  if (!authUser) {
    return (
      <section style={{ minHeight: "100vh", padding: "calc(var(--nav-height) + 2rem) 1rem 3rem", background: "linear-gradient(180deg, #18040d 0%, #260714 100%)", color: "#fff" }}>
        <div style={{ width: "min(560px, 100%)", margin: "0 auto", padding: "2rem", borderRadius: "24px", background: "rgba(60, 5, 20, 0.72)", border: "1px solid rgba(255,255,255,0.12)", textAlign: "center" }}>
          <h1 style={{ marginTop: 0 }}>Login To Track Your Delivery</h1>
          <p style={{ color: "rgba(255,255,255,0.74)", lineHeight: 1.7 }}>
            Sign in to see your bouquet timeline, scheduled delivery window, and gift messages.
          </p>
          <Link to="/login" style={{ display: "inline-flex", padding: "0.95rem 1.2rem", borderRadius: "999px", background: "linear-gradient(135deg, #d94969, #8e1c36)", color: "#fff", textDecoration: "none" }}>
            Login
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <style>{`
        .orders-page {
          min-height: 100vh;
          padding: calc(var(--nav-height) + 2rem) 1rem 4rem;
          background:
            radial-gradient(ellipse 80% 60% at 20% 10%, rgba(192,53,78,0.25) 0%, transparent 55%),
            radial-gradient(ellipse 60% 50% at 80% 85%, rgba(123,26,46,0.3) 0%, transparent 55%),
            radial-gradient(ellipse 100% 100% at 50% 50%, #0f0208 0%, #050002 100%);
          position: relative;
          overflow: hidden;
          color: #fff;
        }
        .orders-page::before {
          content: "";
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E");
          opacity: 0.5;
        }
        .orders-petals-layer {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 1;
        }
        .orders-petal {
          position: absolute;
          top: -60px;
          background: radial-gradient(ellipse at 40% 30%, #f8b4c0, #c0354e 60%, #7b1a2e);
          border-radius: 0 80% 0 80%;
          opacity: 0.55;
          will-change: transform;
        }
        .orders-shell {
          width: min(1080px, 100%);
          margin: 0 auto;
          display: grid;
          gap: 1rem;
          position: relative;
          z-index: 10;
        }
        .orders-hero,
        .order-card {
          background: rgba(45, 4, 16, 0.78);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 20px;
          padding: 1.15rem 1.25rem;
          box-shadow: 0 18px 46px rgba(0,0,0,0.28);
          backdrop-filter: blur(14px);
        }
        .orders-hero h1,
        .order-card h2 {
          margin-top: 0;
        }
        .orders-hero {
          padding-block: 1.2rem;
        }
        .orders-copy {
          color: rgba(255,255,255,0.74);
          line-height: 1.55;
          max-width: 760px;
          margin-bottom: 0;
        }
        .order-top {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: flex-start;
          margin-bottom: 0.9rem;
        }
        .order-kicker {
          color: #f9a8d4;
          font-size: 0.78rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 800;
          margin-bottom: 0.25rem;
        }
        .order-title-row {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          flex-wrap: wrap;
        }
        .order-title-row h2 {
          margin-bottom: 0;
          font-size: clamp(1.05rem, 1vw + 0.85rem, 1.35rem);
          line-height: 1.2;
        }
        .status-pill {
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          padding: 0.3rem 0.65rem;
          border-radius: 999px;
          background: rgba(34, 197, 94, 0.13);
          border: 1px solid rgba(74, 222, 128, 0.28);
          color: #bbf7d0;
          font-size: 0.78rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .view-order-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 34px;
          padding: 0.45rem 0.8rem;
          margin-top: 0.65rem;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(255,255,255,0.07);
          color: #fff;
          font: inherit;
          font-size: 0.88rem;
          font-weight: 800;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
        }
        .view-order-btn:hover {
          background: rgba(255,255,255,0.12);
          border-color: rgba(251,146,60,0.38);
          transform: translateY(-1px);
        }
        .order-meta {
          color: rgba(255,255,255,0.68);
          line-height: 1.45;
          font-size: 0.92rem;
        }
        .order-total {
          min-width: 130px;
          text-align: right;
          color: rgba(255,255,255,0.76);
        }
        .order-total strong {
          display: block;
          color: #fff;
          font-size: 1.05rem;
          margin-bottom: 0.2rem;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.65rem 1rem;
          margin-bottom: 1rem;
        }
        .summary-tile {
          display: grid;
          grid-template-columns: 130px minmax(0, 1fr);
          gap: 0.75rem;
          align-items: baseline;
          padding: 0.68rem 0;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .summary-tile strong {
          color: rgba(255,255,255,0.58);
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .summary-tile span {
          color: rgba(255,255,255,0.9);
          line-height: 1.35;
          font-size: 0.95rem;
          min-width: 0;
          overflow-wrap: anywhere;
        }
        .progress-track {
          position: relative;
          width: 100%;
          height: 6px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          overflow: hidden;
          margin: 0.25rem 0 0.75rem;
        }
        .progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #fb7185 0%, #f97316 100%);
          transition: width 0.45s ease;
        }
        .timeline {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.45rem;
          margin-bottom: 1rem;
        }
        .timeline-step {
          position: relative;
          min-height: 48px;
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.55rem 0.65rem;
          border-radius: 12px;
          background: rgba(255,255,255,0.045);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.62);
          overflow: hidden;
          transition: border-color 0.24s ease, background 0.24s ease, color 0.24s ease;
        }
        .timeline-step::before {
          content: "";
          flex: 0 0 auto;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
        }
        .timeline-step.active {
          background: rgba(251, 113, 133, 0.12);
          border-color: rgba(251, 146, 60, 0.35);
          color: #fff;
        }
        .timeline-step.active::before {
          background: #fb923c;
          box-shadow: 0 0 0 4px rgba(251,146,60,0.13);
        }
        .timeline-step strong {
          display: block;
          font-size: 0.88rem;
          text-transform: capitalize;
          line-height: 1.2;
        }
        .events {
          display: grid;
          gap: 0.45rem;
        }
        .order-details {
          display: grid;
          gap: 0.7rem;
          margin: 0.95rem 0 0.9rem;
          padding: 0.9rem;
          border-radius: 16px;
          background: rgba(255,255,255,0.045);
          border: 1px solid rgba(255,255,255,0.09);
        }
        .order-details-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 1rem;
          padding-bottom: 0.55rem;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .order-details-head strong {
          font-size: 1rem;
        }
        .order-details-head span {
          color: rgba(255,255,255,0.66);
          font-size: 0.9rem;
        }
        .order-items {
          display: grid;
          gap: 0.65rem;
        }
        .order-item-row {
          display: grid;
          grid-template-columns: 62px minmax(0, 1fr) auto;
          align-items: center;
          gap: 0.75rem;
          padding: 0.6rem;
          border-radius: 12px;
          background: rgba(0,0,0,0.14);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .order-item-image {
          width: 62px;
          height: 62px;
          border-radius: 10px;
          overflow: hidden;
          background: linear-gradient(135deg, rgba(251,113,133,0.28), rgba(251,146,60,0.16));
          border: 1px solid rgba(255,255,255,0.09);
        }
        .order-item-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .order-item-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.68);
          font-weight: 900;
          font-size: 1.2rem;
        }
        .order-item-info {
          min-width: 0;
        }
        .order-item-info strong {
          display: block;
          overflow-wrap: anywhere;
          line-height: 1.25;
        }
        .order-item-info span {
          display: block;
          margin-top: 0.25rem;
          color: rgba(255,255,255,0.64);
          font-size: 0.86rem;
          line-height: 1.35;
        }
        .order-item-price {
          text-align: right;
          color: rgba(255,255,255,0.78);
          white-space: nowrap;
        }
        .order-item-price strong {
          display: block;
          color: #fff;
          margin-bottom: 0.2rem;
        }
        .event {
          display: grid;
          grid-template-columns: 150px minmax(0, 1fr);
          gap: 0.7rem;
          padding: 0.75rem 0 0;
          border-top: 1px solid rgba(255,255,255,0.08);
        }
        .event strong {
          display: block;
          margin-bottom: 0.2rem;
          font-size: 0.95rem;
        }
        .event span,
        .event p {
          margin: 0;
          color: rgba(255,255,255,0.68);
          line-height: 1.45;
          font-size: 0.9rem;
        }
        .orders-empty {
          color: rgba(255,255,255,0.72);
        }
        @media (max-width: 860px) {
          .summary-grid {
            grid-template-columns: 1fr;
          }
          .timeline {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 640px) {
          .orders-page {
            padding: calc(var(--nav-height) + 1.2rem) 0.85rem 3rem;
          }
          .orders-hero,
          .order-card {
            padding: 1.2rem;
            border-radius: 18px;
          }
          .order-top {
            flex-direction: column;
          }
          .order-total {
            width: 100%;
            text-align: left;
          }
          .summary-grid,
          .timeline {
            grid-template-columns: 1fr;
          }
          .summary-tile {
            grid-template-columns: 1fr;
            gap: 0.25rem;
          }
          .event {
            grid-template-columns: 1fr;
            gap: 0.2rem;
          }
          .order-details-head,
          .order-item-row {
            grid-template-columns: 1fr;
          }
          .order-details-head {
            display: grid;
            gap: 0.2rem;
          }
          .order-item-row {
            grid-template-columns: 54px minmax(0, 1fr);
          }
          .order-item-image {
            width: 54px;
            height: 54px;
          }
          .order-item-price {
            grid-column: 1 / -1;
            text-align: left;
            padding-left: 0;
          }
        }
      `}</style>

      <section className="orders-page">
        <div className="orders-petals-layer">
          {petalsRef.current.map((style, index) => <FloatingPetal key={index} style={style} />)}
        </div>
        <div className="orders-shell">
          <div className="orders-hero">
            <h1>My Deliveries</h1>
            <p className="orders-copy">
              Follow each bouquet from confirmation to doorstep arrival. We refresh this page automatically so the delivery story feels clear and reassuring.
            </p>
          </div>

          {loading ? <div className="order-card">Loading your order timeline...</div> : null}
          {error ? <div className="order-card">{error}</div> : null}
          {!loading && !error && !enrichedOrders.length ? (
            <div className="order-card orders-empty">
              You have not placed any orders yet. When you do, your delivery schedule, gift message, and live progress will appear here.
            </div>
          ) : null}

          {!loading && !error
            ? enrichedOrders.map((order) => (
                <article key={order.id} className="order-card">
                  <div className="order-top">
                    <div>
                      <div className="order-kicker">Order #{order.id}</div>
                      <div className="order-title-row">
                        <h2>{order.delivery_status_label || "Delivery in progress"}</h2>
                        <span className="status-pill">{order.status}</span>
                      </div>
                      <p className="order-meta">
                        Placed {formatDateTime(order.created_at)}
                      </p>
                      <button
                        type="button"
                        className="view-order-btn"
                        onClick={() => toggleOrderDetails(order.id)}
                        aria-expanded={Boolean(expandedOrders[order.id])}
                      >
                        {expandedOrders[order.id] ? "Hide order" : "View order"}
                      </button>
                    </div>
                    <div className="order-total">
                      <strong>Rs. {Number(order.total_amount || 0).toLocaleString()}</strong>
                      <div>{order.item_count} item{order.item_count === 1 ? "" : "s"}</div>
                    </div>
                  </div>

                  <div className="summary-grid">
                    <div className="summary-tile">
                      <strong>Delivery Date</strong>
                      <span>{formatDateOnly(order.delivery_date)}</span>
                    </div>
                    <div className="summary-tile">
                      <strong>Time Window</strong>
                      <span>{order.delivery_slot_label || order.delivery_slot || "-"}</span>
                    </div>
                    <div className="summary-tile">
                      <strong>Occasion</strong>
                      <span>{order.occasion ? order.occasion.replace(/_/g, " ") : "Gifting moment"}</span>
                    </div>
                    <div className="summary-tile">
                      <strong>Gift Message</strong>
                      <span>{order.gift_message || "No gift message added."}</span>
                    </div>
                  </div>

                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${order.progressPercent}%` }} />
                  </div>

                  <div className="timeline">
                    {DELIVERY_STAGE_ORDER.map((stage, index) => {
                      const event = (order.tracking_events || []).find((item) => item.status === stage);
                      return (
                        <div
                          key={stage}
                          className={`timeline-step ${index <= order.currentIndex ? "active" : ""}`}
                        >
                          <strong>{event?.label || stage.replace(/_/g, " ")}</strong>
                        </div>
                      );
                    })}
                  </div>

                  {expandedOrders[order.id] ? (
                    <div className="order-details">
                      <div className="order-details-head">
                        <strong>Ordered Flowers</strong>
                        <span>{order.item_count} item{order.item_count === 1 ? "" : "s"} · Rs. {Number(order.total_amount || 0).toLocaleString()}</span>
                      </div>
                      <div className="order-items">
                        {(order.items || []).map((item, index) => {
                          const image = getOrderItemImage(item);
                          const quantity = Number(item.qty || item.quantity || 1);
                          const price = Number(item.price || 0);
                          const lineTotal = Number(item.line_total || price * quantity);
                          return (
                            <div key={`${order.id}-${item.id || item.product_id || item.name || index}`} className="order-item-row">
                              <div className="order-item-image">
                                {image ? (
                                  <img src={image} alt={item.name || "Ordered flower"} loading="lazy" decoding="async" />
                                ) : (
                                  <div className="order-item-placeholder">{String(item.name || "F").charAt(0).toUpperCase()}</div>
                                )}
                              </div>
                              <div className="order-item-info">
                                <strong>{item.name || "Flower item"}</strong>
                                <span>
                                  {item.category || "Floral"} · {formatPurchaseType(item.purchaseType || item.purchase_type)} · Qty {quantity}
                                </span>
                              </div>
                              <div className="order-item-price">
                                <strong>Rs. {lineTotal.toLocaleString()}</strong>
                                <span>Rs. {price.toLocaleString()} each</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div className="events">
                    {(order.tracking_events || []).map((event) => (
                      <div key={`${order.id}-${event.status}-${event.created_at}`} className="event">
                        <div>
                          <strong>{event.label || event.title}</strong>
                          <span>{formatShortDate(order.delivery_date)} · {order.delivery_slot_label || order.delivery_slot || "-"}</span>
                        </div>
                        <p>{event.description}</p>
                      </div>
                    ))}
                  </div>
                </article>
              ))
            : null}
        </div>
      </section>
    </>
  );
}
