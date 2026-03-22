import { useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { createOrder, createPaymentOrder } from "../services/api";

const initialFormState = {
  name: "",
  phone: "",
  address: "",
  city: "",
  pincode: "",
};

// ── Floating petal ────────────────────────────────────────────────────────────
function FloatingPetal({ style }) {
  return (
    <motion.div
      style={style}
      className="co-petal"
      animate={{ y: ["0vh", "110vh"], rotate: [0, 360], opacity: [0, 0.65, 0] }}
      transition={{ duration: style.duration, repeat: Infinity, ease: "linear", delay: style.delay }}
    />
  );
}

// ── 3-D Tilt wrapper ──────────────────────────────────────────────────────────
function TiltPanel({ children, className = "" }) {
  const ref = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), { stiffness: 180, damping: 22 });
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-6, 6]), { stiffness: 180, damping: 22 });
  const gx = useTransform(mx, [-0.5, 0.5], ["0%", "100%"]);
  const gy = useTransform(my, [-0.5, 0.5], ["0%", "100%"]);

  function onMove(e) {
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }
  function onLeave() { mx.set(0); my.set(0); }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d", perspective: 900 }}
      className={`co-tilt ${className}`}
    >
      {children}
      <motion.div
        className="co-glare"
        style={{ background: `radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.22) 0%, transparent 65%)` }}
      />
    </motion.div>
  );
}

// ── Fancy Input ───────────────────────────────────────────────────────────────
function FloatInput({ label, name, value, onChange, type = "text", icon }) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;
  return (
    <div className={`fi-wrap ${active ? "fi-active" : ""} ${focused ? "fi-focused" : ""}`}>
      <span className="fi-icon">{icon}</span>
      <div className="fi-inner">
        <label className="fi-label">{label}</label>
        <input
          className="fi-input"
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete="off"
        />
      </div>
      <motion.div
        className="fi-bar"
        animate={{ scaleX: focused ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
    </div>
  );
}

// ── Cart Summary Row ──────────────────────────────────────────────────────────
function CartRow({ item, index }) {
  return (
    <motion.div
      className="cr-row"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07 }}
    >
      <span className="cr-name">{item.name}</span>
      <span className="cr-qty">×{item.qty || 1}</span>
      <span className="cr-price">₹{(Number(item.price) * Number(item.qty || 1)).toLocaleString()}</span>
    </motion.div>
  );
}

// ── Main Checkout ─────────────────────────────────────────────────────────────
export default function Checkout({ cart = [], clearCart = () => {}, authUser = null }) {
  const [form, setForm] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const total = useMemo(
    () => cart.reduce((s, i) => s + Number(i.price || 0) * Number(i.qty || 1), 0),
    [cart]
  );

  const petals = Array.from({ length: 14 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    width: `${10 + Math.random() * 16}px`,
    height: `${14 + Math.random() * 20}px`,
    duration: 8 + Math.random() * 8,
    delay: Math.random() * 10,
  }));

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  if (!authUser) {
    return (
      <>
        <style>{`
          .checkout-auth-wall {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: calc(var(--nav-height) + 2rem) 1rem 3rem;
            background:
              radial-gradient(ellipse 80% 60% at 15% 10%, rgba(192,53,78,0.28) 0%, transparent 55%),
              radial-gradient(ellipse 60% 55% at 85% 90%, rgba(123,26,46,0.38) 0%, transparent 55%),
              radial-gradient(ellipse 100% 100% at 50% 50%, #1a0510 0%, #0d0007 100%);
          }
          .checkout-auth-card {
            width: min(100%, 520px);
            padding: 2rem;
            border-radius: 24px;
            background: rgba(60, 5, 20, 0.5);
            border: 1px solid rgba(255,255,255,0.13);
            backdrop-filter: blur(24px) saturate(1.8);
            color: #fff;
            text-align: center;
            box-shadow: 0 25px 60px rgba(0,0,0,0.45);
            font-family: 'Jost', sans-serif;
          }
          .checkout-auth-card h2 {
            font-family: 'Cormorant Garamond', serif;
            font-size: clamp(2rem, 5vw, 2.8rem);
            margin-bottom: 0.75rem;
          }
          .checkout-auth-card p {
            color: rgba(255,255,255,0.72);
            line-height: 1.8;
            margin-bottom: 1.5rem;
          }
          .checkout-auth-actions {
            display: flex;
            gap: 0.8rem;
            justify-content: center;
            flex-wrap: wrap;
          }
          .checkout-auth-link {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 180px;
            padding: 0.95rem 1.25rem;
            border-radius: 999px;
            text-decoration: none;
            font-family: 'Jost', sans-serif;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            font-size: 0.82rem;
          }
          .checkout-auth-link.primary {
            background: linear-gradient(135deg, var(--rose-mid), var(--rose-deep));
            color: #fff;
          }
          .checkout-auth-link.secondary {
            background: rgba(255,255,255,0.05);
            color: rgba(255,255,255,0.82);
            border: 1px solid rgba(255,255,255,0.16);
          }
        `}</style>
        <section className="checkout-auth-wall">
          <div className="checkout-auth-card">
            <h2>Login Required</h2>
            <p>Please login first to place an order. Once you sign in, you can continue checkout and complete payment.</p>
            <div className="checkout-auth-actions">
              <Link to="/login" className="checkout-auth-link primary">Login</Link>
              <Link to="/cart" className="checkout-auth-link secondary">Back to Cart</Link>
            </div>
          </div>
        </section>
      </>
    );
  }

  const validate = () => {
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      setError("Please fill all required fields.");
      return false;
    }
    if (!/^\d{10}$/.test(form.phone.trim())) {
      setError("Enter a valid 10-digit phone number.");
      return false;
    }
    if (cart.length === 0) {
      setError("Your cart is empty. Add some flowers first 🌸");
      return false;
    }
    return true;
  };

  const placeOrder = async () => {
    setError(""); setMessage("");
    if (!authUser) {
      setError("Please login first to place your order.");
      return;
    }
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await createOrder({
        ...form,
        items: cart,
        status: "Pending",
        payment_method: "COD",
        payment_status: "UNPAID",
      });
      setMessage(res.data?.message || "Order placed successfully.");
      setSuccess(true);
      setForm(initialFormState);
      clearCart();
    } catch (err) {
      setError(err?.response?.data?.error || err?.response?.data?.message || "Failed to place order.");
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpay = () => new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

  const payNow = async () => {
    setError(""); setMessage("");
    if (!authUser) {
      setError("Please login first to continue payment.");
      return;
    }
    if (!validate()) return;
    setLoading(true);
    try {
      const ok = await loadRazorpay();
      if (!ok) { setError("Unable to load payment gateway."); return; }
      const payRes = await createPaymentOrder(total * 100);
      const opts = {
        key: payRes.data.key,
        amount: payRes.data.amount,
        currency: payRes.data.currency,
        name: "Petals & Floras",
        description: "Flower order payment",
        order_id: payRes.data.id,
        handler: async (response) => {
          try {
            const res = await createOrder({
              ...form,
              items: cart,
              status: "Paid",
              payment_method: "ONLINE",
              payment_status: "PAID",
              payment_order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
            });
            setMessage(res.data?.message || "Payment successful. Order placed!");
            setSuccess(true);
            setForm(initialFormState);
            clearCart();
          } catch {
            setError("Payment succeeded but order save failed. Contact support.");
          }
        },
        theme: { color: "#c0354e" },
      };
      new window.Razorpay(opts).open();
    } catch (err) {
      setError(err?.response?.data?.error || "Unable to start payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Jost:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --rose-deep:   #7b1a2e;
          --rose-mid:    #c0354e;
          --rose-light:  #f1a0b0;
          --rose-petal:  #e8536d;
          --gold:        #d4a84b;
        }

        /* ── page ── */
        .co-page {
          min-height: 100vh;
          background:
            radial-gradient(ellipse 80% 60% at 15% 10%, rgba(192,53,78,0.38) 0%, transparent 55%),
            radial-gradient(ellipse 60% 55% at 85% 90%, rgba(123,26,46,0.48) 0%, transparent 55%),
            radial-gradient(ellipse 100% 100% at 50% 50%, #1a0510 0%, #0d0007 100%);
          position: relative;
          overflow: hidden;
          font-family: 'Jost', sans-serif;
          padding: calc(var(--nav-height) + 3rem) 1.5rem 5rem;
        }

        /* grain */
        .co-page::before {
          content: "";
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E");
          opacity: 0.5;
        }

        /* petals */
        .co-petals { position: fixed; inset: 0; pointer-events: none; z-index: 1; }
        .co-petal {
          position: absolute; top: -60px;
          background: radial-gradient(ellipse at 40% 30%, #f8b4c0, #c0354e 60%, #7b1a2e);
          border-radius: 0 80% 0 80%;
          will-change: transform;
        }

        /* ── header ── */
        .co-header {
          position: relative; z-index: 10;
          text-align: center; margin-bottom: 2.5rem;
        }
        .co-eyebrow {
          font-size: 0.7rem; letter-spacing: 0.35em;
          text-transform: uppercase; color: var(--rose-light);
          font-weight: 300; margin-bottom: 0.6rem;
        }
        .co-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(2rem, 4vw, 3.2rem);
          font-weight: 700; color: #fff;
          text-shadow: 0 2px 30px rgba(192,53,78,0.5);
          line-height: 1.1;
        }
        .co-title span { color: var(--rose-petal); }
        .co-deco {
          display: flex; align-items: center; gap: 1rem;
          justify-content: center; margin-top: 1.2rem;
        }
        .co-deco::before, .co-deco::after {
          content: ""; flex: 0 0 70px; height: 1px;
          background: linear-gradient(90deg, transparent, var(--rose-mid));
        }
        .co-deco::after { background: linear-gradient(90deg, var(--rose-mid), transparent); }

        /* ── layout ── */
        .co-layout {
          position: relative; z-index: 10;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          max-width: 1000px;
          margin: 0 auto;
        }
        @media (max-width: 720px) {
          .co-layout { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .co-page { padding: calc(var(--nav-height) + 1.5rem) 0.9rem 4rem; }
          .co-header { margin-bottom: 1.8rem; }
          .co-panel { padding: 1.2rem; border-radius: 18px; }
          .co-panel-title { font-size: 1.1rem; margin-bottom: 1.1rem; }
          .fi-wrap { padding: 0.8rem 0.85rem 0.55rem; }
          .cr-row { align-items: flex-start; gap: 0.4rem; }
          .cr-name { font-size: 0.82rem; }
          .cr-price { min-width: auto; font-size: 0.95rem; }
          .co-total-val { font-size: 1.7rem; }
          .co-btn { font-size: 0.78rem; padding: 0.85rem 1rem; }
          .co-success-box { max-width: calc(100vw - 2rem); padding: 2rem 1.2rem; }
        }

        /* ── tilt panel ── */
        .co-tilt {
          position: relative;
          border-radius: 24px;
        }
        .co-glare {
          position: absolute; inset: 0;
          border-radius: 24px;
          pointer-events: none; z-index: 5;
        }

        /* ── glass panel ── */
        .co-panel {
          background: rgba(60, 5, 20, 0.45);
          border: 1px solid rgba(255,255,255,0.13);
          backdrop-filter: blur(24px) saturate(1.8);
          -webkit-backdrop-filter: blur(24px) saturate(1.8);
          border-radius: 24px;
          padding: 2rem;
          box-shadow:
            0 2px 0 rgba(255,255,255,0.07) inset,
            0 25px 60px rgba(0,0,0,0.5),
            0 4px 24px rgba(192,53,78,0.18);
          transform: translateZ(0);
        }

        .co-panel-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.3rem; font-weight: 600;
          color: #fff; margin-bottom: 1.6rem;
          display: flex; align-items: center; gap: 0.5rem;
        }
        .co-panel-title::after {
          content: ""; flex: 1; height: 1px;
          background: linear-gradient(90deg, rgba(255,255,255,0.15), transparent);
        }

        /* ── float input ── */
        .fi-wrap {
          position: relative;
          display: flex; align-items: center; gap: 0.7rem;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 0.9rem 1rem 0.6rem;
          margin-bottom: 1rem;
          transition: border-color 0.25s, background 0.25s;
          overflow: hidden;
        }
        .fi-focused {
          border-color: rgba(232,83,109,0.6);
          background: rgba(192,53,78,0.1);
        }
        .fi-icon { font-size: 1rem; flex-shrink: 0; margin-top: 6px; }
        .fi-inner { flex: 1; position: relative; }
        .fi-label {
          position: absolute; left: 0; top: 50%;
          transform: translateY(-50%);
          font-size: 0.82rem; color: rgba(255,255,255,0.4);
          pointer-events: none;
          transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
          letter-spacing: 0.04em;
        }
        .fi-active .fi-label {
          top: 0; transform: translateY(-110%);
          font-size: 0.68rem; color: var(--rose-light);
          letter-spacing: 0.1em;
        }
        .fi-input {
          width: 100%; background: transparent;
          border: none; outline: none;
          color: #fff; font-family: 'Jost', sans-serif;
          font-size: 0.9rem; font-weight: 400;
          padding-top: 6px;
          caret-color: var(--rose-petal);
        }
        .fi-bar {
          position: absolute; bottom: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--rose-mid), var(--rose-petal));
          transform-origin: left; border-radius: 0 0 14px 14px;
        }

        /* ── cart summary ── */
        .cr-row {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.65rem 0;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .cr-row:last-of-type { border-bottom: none; }
        .cr-name { flex: 1; font-size: 0.88rem; color: rgba(255,255,255,0.8); }
        .cr-qty {
          font-size: 0.78rem; color: var(--rose-light);
          background: rgba(192,53,78,0.2); border-radius: 50px;
          padding: 0.15rem 0.5rem;
        }
        .cr-price {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1rem; font-weight: 600; color: #fff;
          min-width: 70px; text-align: right;
        }

        .co-divider {
          height: 1px; margin: 1rem 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
        }

        .co-total {
          display: flex; justify-content: space-between; align-items: baseline;
          margin-top: 0.5rem;
        }
        .co-total-label {
          font-size: 0.8rem; letter-spacing: 0.12em;
          text-transform: uppercase; color: rgba(255,255,255,0.45);
        }
        .co-total-val {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2rem; font-weight: 700; color: #fff;
        }
        .co-total-val span { font-size: 1.1rem; color: var(--rose-light); margin-right: 2px; }

        .co-empty {
          text-align: center; padding: 2rem 0;
          color: rgba(255,255,255,0.3);
          font-size: 0.9rem; letter-spacing: 0.06em;
        }

        /* ── buttons ── */
        .co-btns { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1.8rem; }

        .co-btn {
          width: 100%; padding: 0.9rem 1.5rem;
          border-radius: 50px; border: none;
          font-family: 'Jost', sans-serif;
          font-size: 0.88rem; font-weight: 500;
          letter-spacing: 0.1em; text-transform: uppercase;
          cursor: pointer; transition: all 0.25s;
          position: relative; overflow: hidden;
        }
        .co-btn::before {
          content: ""; position: absolute; inset: 0;
          background: rgba(255,255,255,0.12);
          transform: translateX(-100%);
          transition: transform 0.4s ease;
        }
        .co-btn:hover::before { transform: translateX(0); }
        .co-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .co-btn-primary {
          background: linear-gradient(135deg, var(--rose-mid), var(--rose-deep));
          color: #fff;
          box-shadow: 0 4px 20px rgba(192,53,78,0.45), 0 1px 0 rgba(255,255,255,0.1) inset;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .co-btn-primary:hover:not(:disabled) {
          box-shadow: 0 8px 30px rgba(192,53,78,0.6), 0 1px 0 rgba(255,255,255,0.1) inset;
          transform: translateY(-1px);
        }

        .co-btn-outline {
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.85);
          border: 1px solid rgba(255,255,255,0.18);
          backdrop-filter: blur(8px);
        }
        .co-btn-outline:hover:not(:disabled) {
          background: rgba(255,255,255,0.1);
          border-color: var(--rose-petal);
          color: #fff;
          box-shadow: 0 4px 20px rgba(192,53,78,0.3);
          transform: translateY(-1px);
        }

        /* ── feedback ── */
        .co-feedback {
          margin-top: 1rem;
          padding: 0.8rem 1.1rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 400;
          letter-spacing: 0.03em;
          border: 1px solid;
        }
        .co-feedback.success {
          background: rgba(34,197,94,0.1);
          border-color: rgba(34,197,94,0.3);
          color: #86efac;
        }
        .co-feedback.error {
          background: rgba(239,68,68,0.1);
          border-color: rgba(239,68,68,0.3);
          color: #fca5a5;
        }

        /* ── success overlay ── */
        .co-success-overlay {
          position: fixed; inset: 0; z-index: 100;
          display: flex; align-items: center; justify-content: center;
          background: rgba(10,0,5,0.75);
          backdrop-filter: blur(8px);
        }
        .co-success-box {
          background: rgba(60,5,20,0.9);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 24px;
          padding: 3rem 2.5rem;
          text-align: center;
          box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 4px 24px rgba(192,53,78,0.3);
          max-width: 380px;
        }
        .co-success-icon { font-size: 3.5rem; margin-bottom: 1rem; }
        .co-success-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2rem; font-weight: 700; color: #fff;
          margin-bottom: 0.5rem;
        }
        .co-success-sub { color: rgba(255,255,255,0.5); font-size: 0.9rem; margin-bottom: 1.5rem; }
      `}</style>

      {/* petals */}
      <div className="co-petals">
        {petals.map((s, i) => <FloatingPetal key={i} style={s} />)}
      </div>

      <div className="co-page">

        {/* header */}
        <motion.div
          className="co-header"
          initial={{ opacity: 0, y: -28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <p className="co-eyebrow">✦ Almost there ✦</p>
          <h2 className="co-title">Complete Your <span>Order</span></h2>
          <div className="co-deco"><span>🌹</span></div>
        </motion.div>

        {/* two-column layout */}
        <div className="co-layout">

          {/* ── LEFT: form ── */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <TiltPanel>
              <div className="co-panel">
                <p className="co-panel-title">📦 Delivery Details</p>

                <FloatInput label="Full Name *" name="name" value={form.name} onChange={handleChange} icon="👤" />
                <FloatInput label="Phone Number *" name="phone" value={form.phone} onChange={handleChange} icon="📱" type="tel" />
                <FloatInput label="Street Address *" name="address" value={form.address} onChange={handleChange} icon="🏠" />
                <FloatInput label="City" name="city" value={form.city} onChange={handleChange} icon="🌆" />
                <FloatInput label="Pincode" name="pincode" value={form.pincode} onChange={handleChange} icon="📮" />

                <div className="co-btns">
                  <motion.button
                    className="co-btn co-btn-primary"
                    whileTap={{ scale: 0.97 }}
                    onClick={placeOrder}
                    disabled={loading}
                  >
                    {loading ? "⏳ Placing order…" : "🛍 Place Order (COD)"}
                  </motion.button>

                  <motion.button
                    className="co-btn co-btn-outline"
                    whileTap={{ scale: 0.97 }}
                    onClick={payNow}
                    disabled={loading}
                  >
                    {loading ? "⏳ Processing…" : "💳 Pay Online (Razorpay)"}
                  </motion.button>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      className="co-feedback error"
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    >
                      ⚠ {error}
                    </motion.div>
                  )}
                  {message && !success && (
                    <motion.div
                      className="co-feedback success"
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    >
                      ✓ {message}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </TiltPanel>
          </motion.div>

          {/* ── RIGHT: cart summary ── */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
          >
            <TiltPanel>
              <div className="co-panel">
                <p className="co-panel-title">🌸 Order Summary</p>

                {cart.length === 0 ? (
                  <p className="co-empty">No items in cart yet.</p>
                ) : (
                  <>
                    {cart.map((item, i) => <CartRow key={item.id} item={item} index={i} />)}
                    <div className="co-divider" />
                    <div className="co-total">
                      <span className="co-total-label">Total</span>
                      <span className="co-total-val"><span>₹</span>{total.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </TiltPanel>
          </motion.div>
        </div>
      </div>

      {/* ── success overlay ── */}
      <AnimatePresence>
        {success && (
          <motion.div
            className="co-success-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSuccess(false)}
          >
            <motion.div
              className="co-success-box"
              initial={{ scale: 0.7, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              onClick={e => e.stopPropagation()}
            >
              <motion.div
                className="co-success-icon"
                animate={{ rotate: [0, -10, 10, -6, 6, 0], scale: [1, 1.2, 1] }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                🌹
              </motion.div>
              <p className="co-success-title">Order Placed!</p>
              <p className="co-success-sub">{message || "Thank you for choosing Petals & Floras."}</p>
              <motion.button
                className="co-btn co-btn-primary"
                style={{ marginTop: "0.5rem" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSuccess(false)}
              >
                Continue Shopping
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
