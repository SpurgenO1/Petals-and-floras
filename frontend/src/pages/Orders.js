import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getOrderHistory } from "../services/api";

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
          width: min(1120px, 100%);
          margin: 0 auto;
          display: grid;
          gap: 1.2rem;
          position: relative;
          z-index: 10;
        }
        .orders-hero,
        .order-card {
          background: rgba(60, 5, 20, 0.68);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 28px;
          padding: 1.6rem;
          box-shadow: 0 24px 60px rgba(0,0,0,0.34);
          backdrop-filter: blur(16px);
        }
        .orders-hero h1,
        .order-card h2 {
          margin-top: 0;
        }
        .orders-copy {
          color: rgba(255,255,255,0.74);
          line-height: 1.7;
          max-width: 760px;
        }
        .order-top {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }
        .order-kicker {
          color: #f9a8d4;
          font-size: 0.82rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .order-meta {
          color: rgba(255,255,255,0.68);
          line-height: 1.6;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.85rem;
          margin-bottom: 1.2rem;
        }
        .summary-tile {
          padding: 0.95rem;
          border-radius: 18px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .summary-tile strong {
          display: block;
          margin-bottom: 0.35rem;
        }
        .summary-tile span {
          color: rgba(255,255,255,0.7);
          line-height: 1.5;
          font-size: 0.88rem;
        }
        .progress-track {
          position: relative;
          width: 100%;
          height: 14px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03));
          overflow: hidden;
          margin-bottom: 1.25rem;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: inset 0 1px 10px rgba(0,0,0,0.28);
        }
        .progress-track::after {
          content: "";
          position: absolute;
          inset: 1px;
          border-radius: inherit;
          background: linear-gradient(180deg, rgba(255,255,255,0.08), transparent);
          pointer-events: none;
        }
        .progress-fill {
          position: relative;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #fb7185 0%, #f97316 55%, #facc15 100%);
          box-shadow: 0 0 22px rgba(249, 115, 22, 0.35);
          transition: width 0.45s ease;
        }
        .progress-fill::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.42) 38%, rgba(255,255,255,0.05) 62%, transparent 100%);
          transform: translateX(-35%);
          animation: progressShimmer 2.8s ease-in-out infinite;
        }
        .progress-fill::after {
          content: "";
          position: absolute;
          right: 0;
          top: 50%;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          transform: translate(35%, -50%);
          background: radial-gradient(circle, rgba(255,255,255,0.96) 0%, rgba(255,234,175,0.92) 32%, rgba(251,146,60,0.24) 72%, transparent 100%);
          filter: blur(0.4px);
          box-shadow: 0 0 20px rgba(251, 146, 60, 0.48);
        }
        .timeline {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.95rem;
          margin-bottom: 1.1rem;
        }
        .timeline-step {
          position: relative;
          padding: 1.15rem 1rem 1rem;
          border-radius: 22px;
          background: linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.03));
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.72);
          overflow: hidden;
          transition: transform 0.24s ease, border-color 0.24s ease, background 0.24s ease, box-shadow 0.24s ease;
        }
        .timeline-step::before {
          content: "";
          position: absolute;
          top: 0.95rem;
          left: 1rem;
          width: 11px;
          height: 11px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          box-shadow: 0 0 0 6px rgba(255,255,255,0.03);
        }
        .timeline-step::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.08), transparent 45%);
          opacity: 0;
          transition: opacity 0.24s ease;
        }
        .timeline-step.active {
          background: linear-gradient(145deg, rgba(217, 73, 105, 0.3), rgba(142, 28, 54, 0.36));
          border-color: rgba(251, 146, 60, 0.45);
          color: #fff;
          box-shadow: 0 16px 36px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .timeline-step.active::before {
          background: linear-gradient(180deg, #fff7ed, #fb923c);
          box-shadow: 0 0 0 6px rgba(251,146,60,0.14), 0 0 18px rgba(251,146,60,0.4);
        }
        .timeline-step:hover {
          transform: translateY(-3px);
          border-color: rgba(255,255,255,0.18);
        }
        .timeline-step:hover::after,
        .timeline-step.active::after {
          opacity: 1;
        }
        .timeline-step strong {
          display: block;
          margin-bottom: 0.45rem;
          padding-left: 1.1rem;
          font-size: 1.02rem;
          text-transform: capitalize;
        }
        .timeline-step span {
          display: block;
          padding-left: 1.1rem;
          line-height: 1.65;
          font-size: 0.94rem;
        }
        .events {
          display: grid;
          gap: 0.75rem;
        }
        .event {
          border-left: 2px solid rgba(244, 114, 182, 0.5);
          padding: 0.2rem 0 0.2rem 1rem;
        }
        .event strong {
          display: block;
          margin-bottom: 0.2rem;
        }
        .event span,
        .event p {
          margin: 0;
          color: rgba(255,255,255,0.72);
          line-height: 1.6;
        }
        .orders-empty {
          color: rgba(255,255,255,0.72);
        }
        @keyframes progressShimmer {
          0% { transform: translateX(-38%); opacity: 0.3; }
          45% { opacity: 0.9; }
          100% { transform: translateX(118%); opacity: 0.18; }
        }
        @media (max-width: 860px) {
          .summary-grid,
          .timeline {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (max-width: 640px) {
          .orders-page {
            padding: calc(var(--nav-height) + 1.2rem) 0.85rem 3rem;
          }
          .orders-hero,
          .order-card {
            padding: 1.2rem;
            border-radius: 22px;
          }
          .summary-grid,
          .timeline {
            grid-template-columns: 1fr;
          }
          .progress-fill::after {
            width: 18px;
            height: 18px;
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
                      <h2>{order.delivery_status_label || "Delivery in progress"}</h2>
                      <p className="order-meta">
                        Placed on {formatDateTime(order.created_at)}. Payment status: {order.status}.
                      </p>
                    </div>
                    <div className="order-meta">
                      <div>Total: Rs. {Number(order.total_amount || 0).toLocaleString()}</div>
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
                          <span>{event?.description || "Awaiting this delivery stage."}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="events">
                    {(order.tracking_events || []).map((event) => (
                      <div key={`${order.id}-${event.status}-${event.created_at}`} className="event">
                        <strong>{event.label || event.title}</strong>
                        <span>{formatDateTime(event.created_at)}</span>
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
