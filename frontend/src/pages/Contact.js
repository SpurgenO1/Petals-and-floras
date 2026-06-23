import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { createFeedback } from "../services/api";

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

const ICON_MAP = {
  Phone: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  Mail: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  City: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Chat: (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
      <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
    </svg>
  ),
  Insta: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  ),
};

function InfoCard({ icon, label, value, href, delay }) {
  const content = (
    <div className="cn-info-card">
      <div className="cn-info-icon">{ICON_MAP[icon] || icon}</div>
      <div className="cn-info-body">
        <p className="cn-info-label">{label}</p>
        <p className="cn-info-value">{value}</p>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay }}
    >
      <TiltCard>
        {href ? (
          <a
            href={href}
            className="cn-info-card-link"
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noreferrer" : undefined}
          >
            {content}
          </a>
        ) : (
          content
        )}
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
  rating: "5",
  title: "",
  message: "",
};

export default function Contact({ authUser = null }) {
  const [form, setForm] = useState(initialForm);
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
    { icon: "Mail", label: "Email", value: "petalsandflora@gmail.com", href: "mailto:petalsandflora@gmail.com", delay: 0.1 },
    { icon: "City", label: "City", value: "Chennai, Tamil Nadu", href: process.env.REACT_APP_MAPS_URL || "https://www.google.com/maps?q=12.9272616,80.1131223&z=17&hl=en", delay: 0.2 },
    { icon: "Chat", label: "WhatsApp", value: "Chat with us instantly", href: process.env.REACT_APP_WHATSAPP_URL || "https://wa.me/918055895353", delay: 0.3 },
    { icon: "Insta", label: "Instagram", value: "@petalsandflora2725", href: process.env.REACT_APP_INSTAGRAM_URL || "https://www.instagram.com/petalsandflora2725?igsh=a292dGx0bHBmZ3U5", delay: 0.4 },
  ];

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

    setLoading(true);

    try {
      await createFeedback({
        target_type: "shop",
        product_id: null,
        rating: Number(form.rating),
        title: form.title,
        message: form.message,
      });

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
          overflow-x: hidden;
          overflow-y: auto;
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
        .cn-cards-wrap { position: relative; z-index: 10; max-width: 1140px; margin: 0 auto 2.5rem; }
        .cn-cards-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 1rem;
        }
        .cn-info-card {
          padding: 1.4rem 1.15rem 1.3rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0.8rem;
          transform: translateZ(20px);
        }
        .cn-info-card-link {
          display: block;
          text-decoration: none;
          border-radius: 22px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .cn-info-card-link:hover {
          transform: translateY(-2px);
        }
        .cn-info-card-link:hover .cn-info-value,
        .cn-info-card-link:hover .cn-info-label,
        .cn-info-card-link:hover .cn-info-icon {
          color: #fff;
          text-shadow: 0 0 18px rgba(232,83,109,0.28);
        }
        .cn-info-body {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.45rem;
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
          font-family: 'Jost', sans-serif;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.46);
        }
        .cn-info-value {
          font-family: 'Jost', sans-serif;
          font-size: clamp(0.78rem, 0.95vw, 0.92rem);
          font-weight: 500;
          letter-spacing: 0.01em;
          color: rgba(255,255,255,0.96);
          line-height: 1.5;
          text-wrap: balance;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        .cn-layout {
          position: relative;
          z-index: 10;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 1.8rem;
          max-width: 900px;
          margin: 0 auto;
        }
        .cn-form-panel { padding: 2.15rem; }
        .cn-form-intro {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.38rem 0.8rem;
          margin-bottom: 0.9rem;
          border-radius: 999px;
          background: rgba(232,83,109,0.12);
          border: 1px solid rgba(232,83,109,0.22);
          color: #ffd7df;
          font-size: 0.76rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .cn-panel-title, .cn-hours-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: #fff;
          margin-bottom: 0.85rem;
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
          margin: 0 0 1.35rem;
          color: rgba(255,255,255,0.68);
          font-size: 0.92rem;
          line-height: 1.7;
          max-width: 32rem;
        }
        .cn-rating-block {
          padding: 1rem 1rem 1.05rem;
          margin-bottom: 1rem;
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
          border: 1px solid rgba(255,255,255,0.08);
        }
        .cn-rating-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 0.8rem;
          margin-bottom: 0.85rem;
        }
        .cn-rating-title {
          color: #fff;
          font-size: 0.98rem;
          font-weight: 600;
        }
        .cn-rating-copy {
          color: rgba(255,255,255,0.52);
          font-size: 0.8rem;
          line-height: 1.5;
        }
        .cn-rating-current {
          color: var(--rose-light);
          font-size: 0.82rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          white-space: nowrap;
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
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.11);
          border-radius: 18px;
          padding: 1rem 1.05rem 0.72rem;
          margin-bottom: 1rem;
          transition: border-color 0.25s, background 0.25s, box-shadow 0.25s, transform 0.25s;
          overflow: hidden;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
        }
        .cn-fi-focused {
          border-color: rgba(232,83,109,0.6);
          background: rgba(192,53,78,0.11);
          box-shadow: 0 12px 28px rgba(0,0,0,0.18);
          transform: translateY(-1px);
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
          font-size: 0.95rem;
          line-height: 1.6;
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
          margin-bottom: 0;
        }
        .cn-rating-pill {
          border: 1px solid rgba(255,255,255,0.13);
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.8);
          padding: 0.7rem 1rem;
          border-radius: 999px;
          cursor: pointer;
          font: inherit;
          font-weight: 600;
          transition: transform 0.18s, border-color 0.18s, background 0.18s, color 0.18s;
        }
        .cn-rating-pill:hover {
          transform: translateY(-1px);
          border-color: rgba(232,83,109,0.4);
          background: rgba(255,255,255,0.08);
          color: #fff;
        }
        .cn-rating-pill.active {
          color: #fff;
          border-color: rgba(232,83,109,0.7);
          background: linear-gradient(135deg, var(--rose-mid), var(--rose-deep));
          box-shadow: 0 10px 24px rgba(192,53,78,0.28);
        }
        .cn-submit {
          width: 100%;
          padding: 1rem 1.1rem;
          border-radius: 50px;
          border: none;
          background: linear-gradient(135deg, var(--rose-mid), var(--rose-deep));
          color: #fff;
          font-family: 'Jost', sans-serif;
          font-size: 0.92rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          margin-top: 0.75rem;
          box-shadow: 0 16px 34px rgba(123,26,46,0.32);
          transition: transform 0.22s, box-shadow 0.22s, opacity 0.22s;
        }
        .cn-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 20px 40px rgba(123,26,46,0.38);
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
        @media (max-width: 1200px) {
          .cn-cards-grid { grid-template-columns: repeat(3, 1fr); }
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
          .cn-info-value { font-size: 0.94rem; }
          .cn-panel-title { font-size: 1.3rem; }
          .cn-helper { font-size: 0.86rem; margin-bottom: 1rem; }
          .cn-rating-head { flex-direction: column; align-items: flex-start; }
          .cn-rating-pill { flex: 1 1 calc(50% - 0.35rem); justify-content: center; text-align: center; }
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
                <div className="cn-form-intro">Quick and easy</div>
                <p className="cn-panel-title">Submit Feedback</p>
                <p className="cn-helper">
                  Share how your experience felt in a few words. Your feedback helps us improve every bouquet, order, and delivery.
                </p>

                <div className="cn-rating-block">
                  <div className="cn-rating-head">
                    <div>
                      <p className="cn-rating-title">How was your experience?</p>
                      <p className="cn-rating-copy">Pick a rating that matches your order and service experience.</p>
                    </div>
                    <span className="cn-rating-current">{form.rating} / 5 selected</span>
                  </div>
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
                  { day: "Monday - Saturday", time: "8:00 AM - 8:00 PM", open: true },
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
                    <a href={process.env.REACT_APP_WHATSAPP_URL || "https://wa.me/918055895353"} className="cn-social-btn" target="_blank" rel="noreferrer">WhatsApp</a>
                    <a href={process.env.REACT_APP_INSTAGRAM_URL || "https://www.instagram.com/petalsandflora2725?igsh=a292dGx0bHBmZ3U5"} className="cn-social-btn" target="_blank" rel="noreferrer">Instagram</a>
                    <a href="mailto:petalsandflora@gmail.com" className="cn-social-btn">Email</a>
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
                    Chennai, Tamil Nadu<br />
                    12°55'38.1"N 80°06'47.2"E<br />
                    <strong>India</strong>
                  </p>
                </div>
                <a
                  href={process.env.REACT_APP_MAPS_URL || "https://www.google.com/maps?q=12.9272616,80.1131223&z=17&hl=en"}
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
      </div>
    </>
  );
}
