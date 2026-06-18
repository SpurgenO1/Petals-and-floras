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
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewMode, setViewMode] = useState("active");
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

  const activeOrders = useMemo(
    () => enrichedOrders.filter((order) => order.delivery_status !== "delivered"),
    [enrichedOrders]
  );

  const deliveredOrders = useMemo(
    () => enrichedOrders.filter((order) => order.delivery_status === "delivered"),
    [enrichedOrders]
  );

  useEffect(() => {
    if (!selectedOrder) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedOrder(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedOrder]);

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
          position: relative;
          background: rgba(45, 4, 16, 0.78);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 20px;
          padding: 1.15rem 1.25rem 4.7rem;
          box-shadow: 0 18px 46px rgba(0,0,0,0.28);
          backdrop-filter: blur(14px);
        }
        .orders-hero {
          padding: 1.2rem 1.25rem;
        }
        .orders-hero-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }
        .orders-hero-copy {
          min-width: 0;
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
        .orders-view-switch {
          flex: 0 0 auto;
          display: inline-flex;
          gap: 0.35rem;
          padding: 0.28rem;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
        }
        .orders-view-btn {
          position: relative;
          min-height: 36px;
          padding: 0.45rem 0.75rem;
          border-radius: 999px;
          border: 0;
          background: transparent;
          color: rgba(255,255,255,0.7);
          font: inherit;
          font-size: 0.88rem;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }
        .orders-view-btn.active {
          background: rgba(255,255,255,0.14);
          color: #fff;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
        }
        .orders-view-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 22px;
          margin-left: 0.4rem;
          padding: 0 0.35rem;
          border-radius: 999px;
          background: rgba(251,146,60,0.18);
          color: #fed7aa;
          font-size: 0.75rem;
        }
        .orders-section-head {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.4rem 0.2rem 0;
        }
        .orders-section-head h2 {
          margin: 0;
          font-size: clamp(1.2rem, 1.2vw + 0.9rem, 1.7rem);
        }
        .orders-section-head span {
          color: rgba(255,255,255,0.6);
          font-size: 0.92rem;
        }
        .history-card {
          opacity: 0.92;
        }
        .history-card {
          display: grid;
          grid-template-columns: minmax(0, 1.5fr) minmax(220px, 0.9fr) auto;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          min-height: 96px;
        }
        .history-card .order-top {
          margin: 0;
        }
        .history-card .order-title-row h2 {
          font-size: 1.08rem;
        }
        .history-card .order-meta {
          margin: 0.32rem 0 0;
          font-size: 0.86rem;
          line-height: 1.35;
        }
        .history-card .order-total {
          min-width: 110px;
        }
        .history-summary {
          display: grid;
          gap: 0.25rem;
          color: rgba(255,255,255,0.72);
          font-size: 0.9rem;
          line-height: 1.35;
        }
        .history-summary strong {
          color: #fff;
          font-size: 1rem;
        }
        .history-summary span {
          overflow-wrap: anywhere;
        }
        .history-quick {
          display: grid;
          gap: 0.35rem;
          color: rgba(255,255,255,0.72);
          font-size: 0.88rem;
          line-height: 1.35;
          min-width: 0;
        }
        .history-quick span {
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .history-quick strong {
          color: rgba(255,255,255,0.94);
          font-weight: 800;
        }
        .history-actions {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }
        .history-card .view-order-btn {
          position: static;
          right: auto;
          bottom: auto;
        }
        .history-card .progress-fill {
          background: linear-gradient(90deg, #22c55e 0%, #f97316 100%);
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
          position: absolute;
          right: 1.25rem;
          bottom: 1.15rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 34px;
          padding: 0.45rem 0.8rem;
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
          display: none;
        }
        .order-details-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.2rem;
          background: rgba(7, 0, 4, 0.74);
          backdrop-filter: blur(10px);
        }
        .order-details-page {
          width: min(940px, 100%);
          max-height: min(760px, calc(100vh - 2.4rem));
          overflow: auto;
          border-radius: 22px;
          background: linear-gradient(180deg, rgba(54, 5, 20, 0.98), rgba(31, 3, 12, 0.98));
          border: 1px solid rgba(255,255,255,0.14);
          box-shadow: 0 32px 90px rgba(0,0,0,0.52);
          color: #fff;
        }
        .order-details-top {
          position: sticky;
          top: 0;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: flex-start;
          padding: 1.2rem;
          background: rgba(42, 4, 16, 0.96);
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .order-details-title h2 {
          margin: 0.15rem 0 0.35rem;
          font-size: clamp(1.35rem, 2vw, 2rem);
        }
        .order-details-title p {
          margin: 0;
          color: rgba(255,255,255,0.68);
        }
        .close-details-btn {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(255,255,255,0.08);
          color: #fff;
          font-size: 1.25rem;
          line-height: 1;
          cursor: pointer;
        }
        .order-details-body {
          display: grid;
          gap: 1rem;
          padding: 1.2rem;
        }
        .order-details-summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.7rem;
        }
        .order-details-stat {
          padding: 0.8rem;
          border-radius: 14px;
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(255,255,255,0.09);
        }
        .order-details-stat strong {
          display: block;
          color: rgba(255,255,255,0.58);
          font-size: 0.74rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 0.35rem;
        }
        .order-details-stat span {
          display: block;
          color: rgba(255,255,255,0.92);
          line-height: 1.35;
          overflow-wrap: anywhere;
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
          grid-template-columns: 72px minmax(0, 1fr) auto;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: 14px;
          background: rgba(0,0,0,0.14);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .order-item-image {
          width: 72px;
          height: 72px;
          border-radius: 12px;
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
            padding-bottom: 4.8rem;
            border-radius: 18px;
          }
          .orders-hero {
            padding-bottom: 1.2rem;
          }
          .orders-hero-top {
            flex-direction: column;
          }
          .orders-view-switch {
            width: 100%;
          }
          .orders-view-btn {
            flex: 1;
          }
          .history-card {
            grid-template-columns: 1fr;
            align-items: stretch;
          }
          .history-card .order-total {
            text-align: left;
          }
          .history-actions {
            justify-content: space-between;
          }
          .history-quick span {
            white-space: normal;
          }
          .history-card .view-order-btn {
            width: 100%;
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
          .order-details-overlay {
            padding: 0.75rem;
          }
          .order-details-page {
            max-height: calc(100vh - 1.5rem);
            border-radius: 18px;
          }
          .order-details-top {
            padding: 1rem;
          }
          .order-details-body {
            padding: 1rem;
          }
          .order-details-summary {
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
            <div className="orders-hero-top">
              <div className="orders-hero-copy">
                <h1>{viewMode === "history" ? "Order History" : "My Orders"}</h1>
                <p className="orders-copy">
                  {viewMode === "history"
                    ? "Delivered orders are saved here after completion, with full flower details and totals."
                    : "Track active bouquet deliveries from confirmation to doorstep arrival."}
                </p>
              </div>
              <div className="orders-view-switch" aria-label="Order view">
                <button
                  type="button"
                  className={`orders-view-btn ${viewMode === "active" ? "active" : ""}`}
                  onClick={() => setViewMode("active")}
                >
                  My Orders <span className="orders-view-count">{activeOrders.length}</span>
                </button>
                <button
                  type="button"
                  className={`orders-view-btn ${viewMode === "history" ? "active" : ""}`}
                  onClick={() => setViewMode("history")}
                >
                  Order History <span className="orders-view-count">{deliveredOrders.length}</span>
                </button>
              </div>
            </div>
          </div>

          {loading ? <div className="order-card">Loading your order timeline...</div> : null}
          {error ? <div className="order-card">{error}</div> : null}
          {!loading && !error && !enrichedOrders.length ? (
            <div className="order-card orders-empty">
              You have not placed any orders yet. When you do, your delivery schedule, gift message, and live progress will appear here.
            </div>
          ) : null}

          {!loading && !error
            ? (
              <>
                {viewMode === "active" ? (
                  <>
                    <div className="orders-section-head">
                      <h2>Active Deliveries</h2>
                      <span>{activeOrders.length} current</span>
                    </div>
                    {!activeOrders.length && enrichedOrders.length ? (
                      <div className="order-card orders-empty">
                        No active deliveries right now. Delivered orders are saved in Order History.
                      </div>
                    ) : null}
                    {activeOrders.map((order) => (
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

                  <div className="events">
                    {(order.tracking_events || []).map((event) => (
                      <div key={`${order.id}-${event.status}-${event.created_at}`} className="event">
                        <div>
                          <strong>{event.label || event.title}</strong>
                          <span>{formatShortDate(order.delivery_date)} - {order.delivery_slot_label || order.delivery_slot || "-"}</span>
                        </div>
                        <p>{event.description}</p>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="view-order-btn"
                    onClick={() => setSelectedOrder(order)}
                  >
                    View order
                  </button>
                </article>
                    ))}
                  </>
                ) : (
                  <>
                    <div className="orders-section-head">
                      <h2>Delivered Orders</h2>
                      <span>{deliveredOrders.length} delivered</span>
                    </div>
                    {!deliveredOrders.length && enrichedOrders.length ? (
                      <div className="order-card orders-empty">
                        Delivered orders will appear here after they are marked as delivered.
                      </div>
                    ) : null}
                    {deliveredOrders.map((order) => (
                <article key={order.id} className="order-card history-card">
                  <div className="order-top">
                    <div>
                      <div className="order-kicker">Order #{order.id}</div>
                      <div className="order-title-row">
                        <h2>{order.delivery_status_label || "Delivered"}</h2>
                        <span className="status-pill">{order.status}</span>
                      </div>
                      <p className="order-meta">
                        Placed {formatDateTime(order.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="history-quick">
                    <span><strong>Delivered:</strong> {formatDateOnly(order.delivery_date)}</span>
                    <span><strong>Slot:</strong> {order.delivery_slot_label || order.delivery_slot || "-"}</span>
                  </div>

                  <div className="history-actions">
                    <div className="order-total">
                      <strong>Rs. {Number(order.total_amount || 0).toLocaleString()}</strong>
                      <div>{order.item_count} item{order.item_count === 1 ? "" : "s"}</div>
                    </div>
                    <button
                      type="button"
                      className="view-order-btn"
                      onClick={() => setSelectedOrder(order)}
                    >
                      View
                    </button>
                  </div>
                </article>
                    ))}
                  </>
                )}
              </>
            )
            : null}
        </div>
        {selectedOrder ? (
          <div className="order-details-overlay" role="dialog" aria-modal="true" aria-labelledby="order-details-title">
            <div className="order-details-page">
              <div className="order-details-top">
                <div className="order-details-title">
                  <div className="order-kicker">Order #{selectedOrder.id}</div>
                  <h2 id="order-details-title">Order Details</h2>
                  <p>{selectedOrder.delivery_status_label || "Delivery in progress"} - {formatDateTime(selectedOrder.created_at)}</p>
                </div>
                <button type="button" className="close-details-btn" onClick={() => setSelectedOrder(null)} aria-label="Close order details">
                  x
                </button>
              </div>

              <div className="order-details-body">
                <div className="order-details-summary">
                  <div className="order-details-stat">
                    <strong>Total</strong>
                    <span>Rs. {Number(selectedOrder.total_amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="order-details-stat">
                    <strong>Status</strong>
                    <span>{selectedOrder.status}</span>
                  </div>
                  <div className="order-details-stat">
                    <strong>Delivery</strong>
                    <span>{formatDateOnly(selectedOrder.delivery_date)}</span>
                  </div>
                  <div className="order-details-stat">
                    <strong>Time</strong>
                    <span>{selectedOrder.delivery_slot_label || selectedOrder.delivery_slot || "-"}</span>
                  </div>
                </div>

                <div className="order-details-head">
                  <strong>Ordered Flowers</strong>
                  <span>{selectedOrder.item_count} item{selectedOrder.item_count === 1 ? "" : "s"}</span>
                </div>
                <div className="order-items">
                  {(selectedOrder.items || []).map((item, index) => {
                    const image = getOrderItemImage(item);
                    const quantity = Number(item.qty || item.quantity || 1);
                    const price = Number(item.price || 0);
                    const lineTotal = Number(item.line_total || price * quantity);
                    return (
                      <div key={`${selectedOrder.id}-${item.id || item.product_id || item.name || index}`} className="order-item-row">
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
                            {item.category || "Floral"} - {formatPurchaseType(item.purchaseType || item.purchase_type)} - Qty {quantity}
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
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
