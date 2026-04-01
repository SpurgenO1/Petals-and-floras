import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { createFeedback, getFeedback, getProducts } from "../services/api";

function FloatingPetal({ style }) {
  return (
    <motion.div
      style={style}
      className="cn-petal"
      animate={{ y: ["0vh", "110vh"], rotate: [0, 360], opacity: [0, 0.65, 0] }}
      transition={{ duration: style.duration, repeat: Infinity, ease: "linear", delay: style.delay }}
    />
  );
}

function TiltCard({ children, className = "" }) {
  const ref = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 180, damping: 22 });
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-7, 7]), { stiffness: 180, damping: 22 });
  const gx = useTransform(mx, [-0.5, 0.5], ["0%", "100%"]);
  const gy = useTransform(my, [-0.5, 0.5], ["0%", "100%"]);

  function onMove(event) {
    const rect = ref.current.getBoundingClientRect();
    mx.set((event.clientX - rect.left) / rect.width - 0.5);
    my.set((event.clientY - rect.top) / rect.height - 0.5);
  }

  function onLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d", perspective: 900 }}
      className={`cn-tilt ${className}`}
    >
      {children}
      <motion.div
        className="cn-glare"
        style={{
          background: `radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.2) 0%, transparent 65%)`,
        }}
      />
    </motion.div>
  );
}

function InfoCard({ icon, label, value, href, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay }}
    >
      <TiltCard>
        <div className="cn-info-card">
          <div className="cn-info-icon">{icon}</div>
          <div className="cn-info-body">
            <p className="cn-info-label">{label}</p>
            {href ? (
              <a href={href} className="cn-info-value cn-info-link">
                {value}
              </a>
            ) : (
              <p className="cn-info-value">{value}</p>
            )}
          </div>
        </div>
      </TiltCard>
    </motion.div>
  );
}

function FloatInput({ label, name, value, onChange, icon, textarea = false }) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;
  const Tag = textarea ? "textarea" : "input";

  return (
    <div className={`cn-fi-wrap ${active ? "cn-fi-active" : ""} ${focused ? "cn-fi-focused" : ""}`}>
      <span className="cn-fi-icon">{icon}</span>
      <div className="cn-fi-inner">
        <label className="cn-fi-label">{label}</label>
        <Tag
          className="cn-fi-input"
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={textarea ? 4 : undefined}
        />
      </div>
      <motion.div className="cn-fi-bar" animate={{ scaleX: focused ? 1 : 0 }} transition={{ duration: 0.3 }} />
    </div>
  );
}

function RatingButton({ active, label, onClick }) {
  return (
    <button type="button" className={`cn-rating-pill ${active ? "active" : ""}`} onClick={onClick}>
      {label}
    </button>
  );
}

const initialForm = {
  targetType: "shop",
  productId: "",
  rating: "5",
  title: "",
  message: "",
};

export default function Contact({ authUser = null }) {
  const [form, setForm] = useState(initialForm);
  const [products, setProducts] = useState([]);
  const [recentFeedback, setRecentFeedback] = useState([]);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const petals = Array.from({ length: 15 }, () => ({
    left: `${Math.random() * 100}%`,
    width: `${10 + Math.random() * 16}px`,
    height: `${14 + Math.random() * 20}px`,
    duration: 7 + Math.random() * 9,
    delay: Math.random() * 12,
  }));

  const infoCards = [
    { icon: "Phone", label: "Phone / WhatsApp", value: "+91 80558 95353", href: "tel:+918055895353", delay: 0 },
    { icon: "Mail", label: "Email", value: "support@petalsandfloras.com", href: "mailto:support@petalsandfloras.com", delay: 0.1 },
    { icon: "City", label: "City", value: "Chennai, Tamil Nadu", href: null, delay: 0.2 },
    { icon: "Chat", label: "WhatsApp", value: "Chat with us instantly", href: "https://wa.me/918055895353", delay: 0.3 },
  ];

  useEffect(() => {
    let mounted = true;

    getProducts()
      .then((response) => {
        if (mounted) {
          setProducts(Array.isArray(response.data) ? response.data : []);
        }
      })
      .catch(() => {
        if (mounted) {
          setProducts([]);
        }
      });

    getFeedback()
      .then((response) => {
        if (mounted) {
          setRecentFeedback(Array.isArray(response.data) ? response.data.slice(0, 6) : []);
        }
      })
      .catch(() => {
        if (mounted) {
          setRecentFeedback([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  function handleChange(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit() {
    setError("");

    if (!authUser) {
      setError("Please login first to submit feedback.");
      return;
    }

    if (!form.title.trim() || !form.message.trim()) {
      setError("Please fill the feedback title and message.");
      return;
    }

    if (form.targetType === "flower" && !form.productId) {
      setError("Please choose a flower product for flower feedback.");
      return;
    }

    setLoading(true);

    try {
      const response = await createFeedback({
        target_type: form.targetType,
        product_id: form.targetType === "flower" ? Number(form.productId) : null,
        rating: Number(form.rating),
        title: form.title,
        message: form.message,
      });

      if (response.data?.feedback) {
        setRecentFeedback((current) => [response.data.feedback, ...current].slice(0, 6));
      }

      setSent(true);
      setForm(initialForm);
      window.setTimeout(() => setSent(false), 4000);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.error ||
          requestError?.response?.data?.message ||
          requestError?.response?.data?.product_id?.[0] ||
          "Failed to submit feedback."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Jost:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --rose-deep: #7b1a2e;
          --rose-mid: #c0354e;
          --rose-light: #f1a0b0;
          --rose-petal: #e8536d;
        }

        .cn-page {
          min-height: 100vh;
          background:
            radial-gradient(ellipse 80% 60% at 20% 10%, rgba(192,53,78,0.38) 0%, transparent 55%),
            radial-gradient(ellipse 60% 55% at 80% 90%, rgba(123,26,46,0.48) 0%, transparent 55%),
            radial-gradient(ellipse 100% 100% at 50% 50%, #1a0510 0%, #0d0007 100%);
          position: relative;
          overflow: hidden;
          font-family: 'Jost', sans-serif;
          padding: calc(var(--nav-height) + 2.5rem) 2rem 6rem;
        }
        .cn-page::before {
          content: "";
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E");
          opacity: 0.5;
        }
        .cn-petals { position: fixed; inset: 0; pointer-events: none; z-index: 1; }
        .cn-petal {
          position: absolute;
          top: -60px;
          background: radial-gradient(ellipse at 40% 30%, #f8b4c0, #c0354e 60%, #7b1a2e);
          border-radius: 0 80% 0 80%;
          will-change: transform;
        }
        .cn-tilt { position: relative; border-radius: 22px; }
        .cn-glare { position: absolute; inset: 0; border-radius: 22px; pointer-events: none; z-index: 5; }
        .cn-glass {
          background: rgba(60,5,20,0.45);
          border: 1px solid rgba(255,255,255,0.13);
          backdrop-filter: blur(24px) saturate(1.8);
          -webkit-backdrop-filter: blur(24px) saturate(1.8);
          border-radius: 22px;
          box-shadow: 0 2px 0 rgba(255,255,255,0.07) inset, 0 20px 60px rgba(0,0,0,0.5), 0 4px 24px rgba(192,53,78,0.15);
        }
        .cn-header { position: relative; z-index: 10; text-align: center; margin-bottom: 3rem; }
        .cn-eyebrow {
          font-size: 0.7rem;
          letter-spacing: 0.38em;
          text-transform: uppercase;
          color: var(--rose-light);
          font-weight: 300;
          margin-bottom: 0.7rem;
        }
        .cn-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(2.2rem, 5vw, 4rem);
          font-weight: 700;
          color: #fff;
          line-height: 1.1;
          text-shadow: 0 4px 40px rgba(192,53,78,0.5);
        }
        .cn-title span { color: var(--rose-petal); }
        .cn-sub {
          color: rgba(255,255,255,0.45);
          font-size: 0.95rem;
          font-weight: 300;
          margin-top: 0.8rem;
          letter-spacing: 0.04em;
        }
        .cn-deco {
          display: flex;
          align-items: center;
          gap: 1rem;
          justify-content: center;
          margin: 1.2rem 0 0;
        }
        .cn-deco::before, .cn-deco::after {
          content: "";
          flex: 0 0 70px;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--rose-mid));
        }
        .cn-deco::after { background: linear-gradient(90deg, var(--rose-mid), transparent); }
        .cn-cards-wrap { position: relative; z-index: 10; max-width: 900px; margin: 0 auto 2.5rem; }
        .cn-cards-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }
        .cn-info-card {
          padding: 1.5rem 1.2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0.6rem;
          transform: translateZ(20px);
        }
        .cn-info-icon {
          width: 48px;
          height: 48px;
          background: rgba(192,53,78,0.2);
          border: 1px solid rgba(232,83,109,0.3);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.95rem;
          box-shadow: 0 4px 16px rgba(192,53,78,0.25);
          margin-bottom: 0.3rem;
          color: #fff;
        }
        .cn-info-label {
          font-size: 0.68rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.4);
        }
        .cn-info-value {
          font-family: 'Cormorant Garamond', serif;
          font-size: 0.98rem;
          font-weight: 600;
          color: #fff;
          line-height: 1.3;
        }
        .cn-info-link {
          text-decoration: none;
          color: var(--rose-light);
          transition: color 0.2s;
        }
        .cn-info-link:hover { color: #fff; }
        .cn-layout {
          position: relative;
          z-index: 10;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 1.8rem;
          max-width: 900px;
          margin: 0 auto;
        }
        .cn-form-panel { padding: 2rem; }
        .cn-panel-title, .cn-hours-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.3rem;
          font-weight: 600;
          color: #fff;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .cn-panel-title::after, .cn-hours-title::after {
          content: "";
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, rgba(255,255,255,0.15), transparent);
        }
        .cn-helper {
          margin: 0 0 1rem;
          color: rgba(255,255,255,0.58);
          font-size: 0.84rem;
          line-height: 1.6;
        }
        .cn-select {
          width: 100%;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          background: rgba(255,255,255,0.05);
          color: #fff;
          padding: 0.95rem 1rem;
          outline: none;
          margin-bottom: 1rem;
          font: inherit;
        }
        .cn-select option { background: #2d0616; color: #fff; }
        .cn-fi-wrap {
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 0.7rem;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 0.9rem 1rem 0.6rem;
          margin-bottom: 1rem;
          transition: border-color 0.25s, background 0.25s;
          overflow: hidden;
        }
        .cn-fi-focused {
          border-color: rgba(232,83,109,0.6);
          background: rgba(192,53,78,0.1);
        }
        .cn-fi-icon { font-size: 1rem; flex-shrink: 0; margin-top: 8px; color: rgba(255,255,255,0.7); }
        .cn-fi-inner { flex: 1; position: relative; }
        .cn-fi-label {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          font-size: 0.82rem;
          color: rgba(255,255,255,0.4);
          pointer-events: none;
          transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
          letter-spacing: 0.04em;
        }
        .cn-fi-active .cn-fi-label {
          top: 0;
          transform: translateY(-110%);
          font-size: 0.68rem;
          color: var(--rose-light);
          letter-spacing: 0.1em;
        }
        .cn-fi-input {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          color: #fff;
          font-family: 'Jost', sans-serif;
          font-size: 0.9rem;
          padding-top: 6px;
          caret-color: var(--rose-petal);
          resize: none;
        }
        .cn-fi-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--rose-mid), var(--rose-petal));
          transform-origin: left;
          border-radius: 0 0 14px 14px;
        }
        .cn-rating-row {
          display: flex;
          gap: 0.6rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }
        .cn-rating-pill {
          border: 1px solid rgba(255,255,255,0.13);
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.72);
          padding: 0.55rem 0.9rem;
          border-radius: 999px;
          cursor: pointer;
          font: inherit;
        }
        .cn-rating-pill.active {
          color: #fff;
          border-color: rgba(232,83,109,0.7);
          background: linear-gradient(135deg, var(--rose-mid), var(--rose-deep));
        }
        .cn-submit {
          width: 100%;
          padding: 0.9rem;
          border-radius: 50px;
          border: none;
          background: linear-gradient(135deg, var(--rose-mid), var(--rose-deep));
          color: #fff;
          font-family: 'Jost', sans-serif;
          font-size: 0.88rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          margin-top: 0.5rem;
        }
        .cn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .cn-toast, .cn-error {
          margin-top: 1rem;
          padding: 0.8rem 1.1rem;
          border-radius: 12px;
          font-size: 0.85rem;
          letter-spacing: 0.03em;
        }
        .cn-toast {
          background: rgba(34,197,94,0.1);
          border: 1px solid rgba(34,197,94,0.3);
          color: #86efac;
        }
        .cn-error {
          background: rgba(239,68,68,0.12);
          border: 1px solid rgba(239,68,68,0.32);
          color: #fecaca;
        }
        .cn-side-panel { padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem; }
        .cn-hours-row {
          display: flex;
          justify-content: space-between;
          padding: 0.55rem 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          font-size: 0.85rem;
        }
        .cn-hours-row:last-child { border-bottom: none; }
        .cn-hours-day { color: rgba(255,255,255,0.5); }
        .cn-hours-time { color: #fff; font-weight: 400; }
        .cn-hours-time.open { color: #86efac; }
        .cn-socials { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.5rem; }
        .cn-social-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1.1rem;
          border-radius: 50px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.13);
          color: rgba(255,255,255,0.7);
          font-family: 'Jost', sans-serif;
          font-size: 0.8rem;
          text-decoration: none;
          letter-spacing: 0.05em;
          transition: all 0.22s;
        }
        .cn-social-btn:hover {
          background: rgba(192,53,78,0.2);
          border-color: var(--rose-petal);
          color: #fff;
        }
        .cn-address {
          padding: 1.2rem 1.4rem;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 14px;
        }
        .cn-address p {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.55);
          line-height: 1.7;
          font-weight: 300;
        }
        .cn-address strong { color: var(--rose-light); font-weight: 400; }
        .cn-recent-wrap { position: relative; z-index: 10; max-width: 1100px; margin: 2.5rem auto 0; }
        .cn-feedback-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
        }
        .cn-feedback-card { padding: 1.2rem; height: 100%; }
        .cn-feedback-head {
          display: flex;
          justify-content: space-between;
          gap: 0.8rem;
          margin-bottom: 0.6rem;
          align-items: flex-start;
        }
        .cn-feedback-name { color: #fff; font-weight: 600; font-size: 0.95rem; }
        .cn-feedback-meta {
          color: rgba(255,255,255,0.45);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .cn-feedback-title {
          color: var(--rose-light);
          font-size: 0.95rem;
          margin-bottom: 0.4rem;
          font-weight: 600;
        }
        .cn-feedback-message { color: rgba(255,255,255,0.7); font-size: 0.88rem; line-height: 1.6; }
        .cn-feedback-stars { color: #ffd166; letter-spacing: 0.08em; font-size: 0.86rem; white-space: nowrap; }
        @media (max-width: 900px) {
          .cn-feedback-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 860px) {
          .cn-cards-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 720px) {
          .cn-layout { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .cn-page { padding: calc(var(--nav-height) + 1.5rem) 0.9rem 4rem; }
          .cn-cards-grid { grid-template-columns: 1fr; }
          .cn-form-panel, .cn-side-panel { padding: 1.2rem; }
          .cn-info-card { padding: 1.1rem 1rem; }
          .cn-feedback-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="cn-petals">
        {petals.map((style, index) => <FloatingPetal key={index} style={style} />)}
      </div>

      <div className="cn-page">
        <motion.div
          className="cn-header"
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <p className="cn-eyebrow">Share what you felt about us</p>
          <h2 className="cn-title">Flower <span>Feedback</span></h2>
          <p className="cn-sub">Users can review the shop or a specific flower, and every entry is saved to admin and MongoDB.</p>
          <div className="cn-deco"><span>Rose</span></div>
        </motion.div>

        <div className="cn-cards-wrap">
          <div className="cn-cards-grid">
            {infoCards.map((card) => <InfoCard key={card.label} {...card} />)}
          </div>
        </div>

        <div className="cn-layout">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <TiltCard>
              <div className="cn-glass cn-form-panel">
                <p className="cn-panel-title">Submit Feedback</p>
                <p className="cn-helper">
                  Login is required so each feedback stays linked to the right customer account in the shop admin.
                </p>

                <select className="cn-select" name="targetType" value={form.targetType} onChange={handleChange}>
                  <option value="shop">Feedback for the shop</option>
                  <option value="flower">Feedback for a flower</option>
                </select>

                {form.targetType === "flower" && (
                  <select className="cn-select" name="productId" value={form.productId} onChange={handleChange}>
                    <option value="">Select a flower product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                )}

                <div className="cn-rating-row">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <RatingButton
                      key={rating}
                      label={`${rating} Star${rating !== 1 ? "s" : ""}`}
                      active={Number(form.rating) === rating}
                      onClick={() => setForm((current) => ({ ...current, rating: String(rating) }))}
                    />
                  ))}
                </div>

                <FloatInput label="Feedback Title" name="title" value={form.title} onChange={handleChange} icon="Title" />
                <FloatInput label="Your Feedback" name="message" value={form.message} onChange={handleChange} icon="Note" textarea />

                <motion.button className="cn-submit" whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={loading || !form.title || !form.message}>
                  {loading ? "Saving Feedback..." : "Submit Feedback"}
                </motion.button>

                {error ? <div className="cn-error">{error}</div> : null}

                <AnimatePresence>
                  {sent && (
                    <motion.div
                      className="cn-toast"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      Feedback saved successfully.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </TiltCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.32 }}
            style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}
          >
            <TiltCard>
              <div className="cn-glass cn-side-panel" style={{ padding: "1.8rem" }}>
                <p className="cn-hours-title">Business Hours</p>
                {[
                  { day: "Monday - Friday", time: "8:00 AM - 8:00 PM", open: true },
                  { day: "Saturday", time: "8:00 AM - 9:00 PM", open: true },
                  { day: "Sunday", time: "9:00 AM - 6:00 PM", open: true },
                  { day: "Public Holidays", time: "Call ahead", open: false },
                ].map((row) => (
                  <div key={row.day} className="cn-hours-row">
                    <span className="cn-hours-day">{row.day}</span>
                    <span className={`cn-hours-time ${row.open ? "open" : ""}`}>{row.time}</span>
                  </div>
                ))}

                <div style={{ marginTop: "1.4rem" }}>
                  <p className="cn-hours-title" style={{ marginBottom: "0.8rem" }}>Find Us Online</p>
                  <div className="cn-socials">
                    <a href="https://wa.me/918055895353" className="cn-social-btn" target="_blank" rel="noreferrer">WhatsApp</a>
                    <a href="mailto:support@petalsandfloras.com" className="cn-social-btn">Email</a>
                    <a href="tel:+918055895353" className="cn-social-btn">Call</a>
                  </div>
                </div>
              </div>
            </TiltCard>

            <TiltCard>
              <div className="cn-glass" style={{ padding: "1.6rem" }}>
                <p className="cn-hours-title">Our Location</p>
                <div className="cn-address">
                  <p>
                    <strong>Petals & Flora</strong><br />
                    West Tambaram,<br />
                    Chennai, Tamil Nadu - 600 045<br />
                    <strong>India</strong>
                  </p>
                </div>
                <a
                  href="https://maps.google.com/?q=Tambaram,Chennai"
                  target="_blank"
                  rel="noreferrer"
                  className="cn-social-btn"
                  style={{ marginTop: "1rem" }}
                >
                  Open in Maps
                </a>
              </div>
            </TiltCard>
          </motion.div>
        </div>

        <div className="cn-recent-wrap">
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.45 }}>
            <TiltCard>
              <div className="cn-glass cn-side-panel" style={{ padding: "1.6rem" }}>
                <p className="cn-hours-title">Recent Feedback</p>
                <div className="cn-feedback-grid">
                  {recentFeedback.length === 0 ? (
                    <div className="cn-address">
                      <p>No feedback yet. Be the first to share how the shop or flowers felt for you.</p>
                    </div>
                  ) : (
                    recentFeedback.map((entry) => (
                      <div key={entry.id} className="cn-glass cn-feedback-card">
                        <div className="cn-feedback-head">
                          <div>
                            <div className="cn-feedback-name">{entry.user_name}</div>
                            <div className="cn-feedback-meta">
                              {entry.target_type === "flower" && entry.product_name
                                ? `Flower - ${entry.product_name}`
                                : "Shop"}
                            </div>
                          </div>
                          <div className="cn-feedback-stars">{"★".repeat(Number(entry.rating || 0))}</div>
                        </div>
                        <div className="cn-feedback-title">{entry.title}</div>
                        <div className="cn-feedback-message">{entry.message}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TiltCard>
          </motion.div>
        </div>
      </div>
    </>
  );
}
