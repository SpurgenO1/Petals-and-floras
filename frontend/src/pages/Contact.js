import { useRef, useState } from "react";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";

// ── Floating petal ────────────────────────────────────────────────────────────
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

// ── 3-D Tilt wrapper ──────────────────────────────────────────────────────────
function TiltCard({ children, className = "" }) {
  const ref = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 180, damping: 22 });
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-7, 7]), { stiffness: 180, damping: 22 });
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
      className={`cn-tilt ${className}`}
    >
      {children}
      <motion.div
        className="cn-glare"
        style={{ background: `radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.2) 0%, transparent 65%)` }}
      />
    </motion.div>
  );
}

// ── Contact info card ─────────────────────────────────────────────────────────
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
              <a href={href} className="cn-info-value cn-info-link">{value}</a>
            ) : (
              <p className="cn-info-value">{value}</p>
            )}
          </div>
        </div>
      </TiltCard>
    </motion.div>
  );
}

// ── Float label input ─────────────────────────────────────────────────────────
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
      <motion.div
        className="cn-fi-bar"
        animate={{ scaleX: focused ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
    </div>
  );
}

// ── Main Contact ──────────────────────────────────────────────────────────────
export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sent, setSent] = useState(false);

  const petals = Array.from({ length: 15 }, () => ({
    left: `${Math.random() * 100}%`,
    width: `${10 + Math.random() * 16}px`,
    height: `${14 + Math.random() * 20}px`,
    duration: 7 + Math.random() * 9,
    delay: Math.random() * 12,
  }));

  const infoCards = [
    { icon: "📞", label: "Phone / WhatsApp", value: "+91 80558 95353", href: "tel:+918055895353", delay: 0 },
    { icon: "✉️", label: "Email", value: "support@petalsandfloras.com", href: "mailto:support@petalsandfloras.com", delay: 0.1 },
    { icon: "📍", label: "City", value: "Chennai, Tamil Nadu", href: null, delay: 0.2 },
    { icon: "💬", label: "WhatsApp", value: "Chat with us instantly", href: "https://wa.me/918055895353", delay: 0.3 },
  ];

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit() {
    if (!form.name || !form.email || !form.message) return;
    // wire up to your API here
    setSent(true);
    setForm({ name: "", email: "", phone: "", message: "" });
    setTimeout(() => setSent(false), 4000);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Jost:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --rose-deep:  #7b1a2e;
          --rose-mid:   #c0354e;
          --rose-light: #f1a0b0;
          --rose-petal: #e8536d;
          --gold:       #d4a84b;
        }

        /* ── page ── */
        .cn-page {
          min-height: 100vh;
          background:
            radial-gradient(ellipse 80% 60% at 20% 10%, rgba(192,53,78,0.38) 0%, transparent 55%),
            radial-gradient(ellipse 60% 55% at 80% 90%, rgba(123,26,46,0.48) 0%, transparent 55%),
            radial-gradient(ellipse 100% 100% at 50% 50%, #1a0510 0%, #0d0007 100%);
          position: relative; overflow: hidden;
          font-family: 'Jost', sans-serif;
          padding: calc(var(--nav-height) + 2.5rem) 2rem 6rem;
        }
        .cn-page::before {
          content: "";
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E");
          opacity: 0.5;
        }

        /* petals */
        .cn-petals { position: fixed; inset: 0; pointer-events: none; z-index: 1; }
        .cn-petal {
          position: absolute; top: -60px;
          background: radial-gradient(ellipse at 40% 30%, #f8b4c0, #c0354e 60%, #7b1a2e);
          border-radius: 0 80% 0 80%;
          will-change: transform;
        }

        /* ── tilt ── */
        .cn-tilt { position: relative; border-radius: 22px; }
        .cn-glare {
          position: absolute; inset: 0; border-radius: 22px;
          pointer-events: none; z-index: 5;
        }

        /* ── glass base ── */
        .cn-glass {
          background: rgba(60,5,20,0.45);
          border: 1px solid rgba(255,255,255,0.13);
          backdrop-filter: blur(24px) saturate(1.8);
          -webkit-backdrop-filter: blur(24px) saturate(1.8);
          border-radius: 22px;
          box-shadow: 0 2px 0 rgba(255,255,255,0.07) inset, 0 20px 60px rgba(0,0,0,0.5), 0 4px 24px rgba(192,53,78,0.15);
        }

        /* ── header ── */
        .cn-header {
          position: relative; z-index: 10;
          text-align: center; margin-bottom: 3rem;
        }
        .cn-eyebrow {
          font-size: 0.7rem; letter-spacing: 0.38em;
          text-transform: uppercase; color: var(--rose-light);
          font-weight: 300; margin-bottom: 0.7rem;
        }
        .cn-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(2.2rem, 5vw, 4rem);
          font-weight: 700; color: #fff; line-height: 1.1;
          text-shadow: 0 4px 40px rgba(192,53,78,0.5);
        }
        .cn-title span { color: var(--rose-petal); }
        .cn-sub {
          color: rgba(255,255,255,0.45); font-size: 0.95rem;
          font-weight: 300; margin-top: 0.8rem; letter-spacing: 0.04em;
        }
        .cn-deco {
          display: flex; align-items: center; gap: 1rem;
          justify-content: center; margin: 1.2rem 0 0;
        }
        .cn-deco::before, .cn-deco::after {
          content: ""; flex: 0 0 70px; height: 1px;
          background: linear-gradient(90deg, transparent, var(--rose-mid));
        }
        .cn-deco::after { background: linear-gradient(90deg, var(--rose-mid), transparent); }

        /* ── info cards grid ── */
        .cn-cards-wrap {
          position: relative; z-index: 10;
          max-width: 900px; margin: 0 auto 2.5rem;
        }
        .cn-cards-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }
        @media (max-width: 860px) { .cn-cards-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 480px) { .cn-cards-grid { grid-template-columns: 1fr 1fr; gap: 0.75rem; } }

        .cn-info-card {
          padding: 1.5rem 1.2rem;
          display: flex; flex-direction: column; align-items: center;
          text-align: center; gap: 0.6rem;
          transform: translateZ(20px);
        }
        .cn-info-icon {
          width: 48px; height: 48px;
          background: rgba(192,53,78,0.2);
          border: 1px solid rgba(232,83,109,0.3);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.3rem;
          box-shadow: 0 4px 16px rgba(192,53,78,0.25);
          margin-bottom: 0.3rem;
        }
        .cn-info-label {
          font-size: 0.68rem; letter-spacing: 0.15em;
          text-transform: uppercase; color: rgba(255,255,255,0.4);
        }
        .cn-info-value {
          font-family: 'Cormorant Garamond', serif;
          font-size: 0.98rem; font-weight: 600; color: #fff;
          line-height: 1.3;
        }
        .cn-info-link {
          text-decoration: none;
          color: var(--rose-light);
          transition: color 0.2s;
        }
        .cn-info-link:hover { color: #fff; }

        /* ── layout ── */
        .cn-layout {
          position: relative; z-index: 10;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 1.8rem;
          max-width: 900px; margin: 0 auto;
        }
        @media (max-width: 720px) { .cn-layout { grid-template-columns: 1fr; } }

        /* ── form panel ── */
        .cn-form-panel { padding: 2rem; }
        .cn-panel-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.3rem; font-weight: 600; color: #fff;
          margin-bottom: 1.5rem;
          display: flex; align-items: center; gap: 0.5rem;
        }
        .cn-panel-title::after {
          content: ""; flex: 1; height: 1px;
          background: linear-gradient(90deg, rgba(255,255,255,0.15), transparent);
        }

        /* float input */
        .cn-fi-wrap {
          position: relative;
          display: flex; align-items: flex-start; gap: 0.7rem;
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
        .cn-fi-icon { font-size: 1rem; flex-shrink: 0; margin-top: 8px; }
        .cn-fi-inner { flex: 1; position: relative; }
        .cn-fi-label {
          position: absolute; left: 0; top: 50%;
          transform: translateY(-50%);
          font-size: 0.82rem; color: rgba(255,255,255,0.4);
          pointer-events: none;
          transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
          letter-spacing: 0.04em;
        }
        .cn-fi-active .cn-fi-label {
          top: 0; transform: translateY(-110%);
          font-size: 0.68rem; color: var(--rose-light);
          letter-spacing: 0.1em;
        }
        .cn-fi-input {
          width: 100%; background: transparent;
          border: none; outline: none;
          color: #fff; font-family: 'Jost', sans-serif;
          font-size: 0.9rem; font-weight: 400;
          padding-top: 6px;
          caret-color: var(--rose-petal);
          resize: none;
        }
        .cn-fi-bar {
          position: absolute; bottom: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--rose-mid), var(--rose-petal));
          transform-origin: left; border-radius: 0 0 14px 14px;
        }

        /* submit btn */
        .cn-submit {
          width: 100%; padding: 0.9rem;
          border-radius: 50px; border: none;
          background: linear-gradient(135deg, var(--rose-mid), var(--rose-deep));
          color: #fff;
          font-family: 'Jost', sans-serif;
          font-size: 0.88rem; font-weight: 500;
          letter-spacing: 0.1em; text-transform: uppercase;
          cursor: pointer; margin-top: 0.5rem;
          box-shadow: 0 4px 20px rgba(192,53,78,0.45), 0 1px 0 rgba(255,255,255,0.1) inset;
          border: 1px solid rgba(255,255,255,0.1);
          position: relative; overflow: hidden;
          transition: box-shadow 0.25s, transform 0.25s;
        }
        .cn-submit::before {
          content: ""; position: absolute; inset: 0;
          background: rgba(255,255,255,0.12);
          transform: translateX(-100%);
          transition: transform 0.4s ease;
        }
        .cn-submit:hover::before { transform: translateX(0); }
        .cn-submit:hover {
          box-shadow: 0 8px 30px rgba(192,53,78,0.6), 0 1px 0 rgba(255,255,255,0.1) inset;
          transform: translateY(-1px);
        }
        .cn-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        /* success toast */
        .cn-toast {
          margin-top: 1rem; padding: 0.8rem 1.1rem;
          border-radius: 12px; font-size: 0.85rem;
          background: rgba(34,197,94,0.1);
          border: 1px solid rgba(34,197,94,0.3);
          color: #86efac; letter-spacing: 0.03em;
        }

        /* ── map / hours panel ── */
        .cn-side-panel { padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem; }

        .cn-hours-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.3rem; font-weight: 600; color: #fff;
          margin-bottom: 1rem;
          display: flex; align-items: center; gap: 0.5rem;
        }
        .cn-hours-title::after {
          content: ""; flex: 1; height: 1px;
          background: linear-gradient(90deg, rgba(255,255,255,0.15), transparent);
        }

        .cn-hours-row {
          display: flex; justify-content: space-between;
          padding: 0.55rem 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          font-size: 0.85rem;
        }
        .cn-hours-row:last-child { border-bottom: none; }
        .cn-hours-day { color: rgba(255,255,255,0.5); }
        .cn-hours-time { color: #fff; font-weight: 400; }
        .cn-hours-time.open { color: #86efac; }

        /* social links */
        .cn-socials {
          display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.5rem;
        }
        .cn-social-btn {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.5rem 1.1rem; border-radius: 50px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.13);
          color: rgba(255,255,255,0.7);
          font-family: 'Jost', sans-serif; font-size: 0.8rem;
          text-decoration: none; letter-spacing: 0.05em;
          transition: all 0.22s;
        }
        .cn-social-btn:hover {
          background: rgba(192,53,78,0.2);
          border-color: var(--rose-petal);
          color: #fff;
          box-shadow: 0 4px 16px rgba(192,53,78,0.3);
        }

        /* address block */
        .cn-address {
          padding: 1.2rem 1.4rem;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 14px;
          transform: translateZ(10px);
        }
        .cn-address p {
          font-size: 0.85rem; color: rgba(255,255,255,0.55);
          line-height: 1.7; font-weight: 300;
        }
        .cn-address strong { color: var(--rose-light); font-weight: 400; }
        @media (max-width: 640px) {
          .cn-page { padding: calc(var(--nav-height) + 1.5rem) 0.9rem 4rem; }
          .cn-cards-grid { grid-template-columns: 1fr; }
          .cn-form-panel, .cn-side-panel { padding: 1.2rem; }
          .cn-info-card { padding: 1.1rem 1rem; }
        }
      `}</style>

      {/* petals */}
      <div className="cn-petals">
        {petals.map((s, i) => <FloatingPetal key={i} style={s} />)}
      </div>

      <div className="cn-page">

        {/* ── HEADER ── */}
        <motion.div
          className="cn-header"
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <p className="cn-eyebrow">✦ We'd love to hear from you ✦</p>
          <h2 className="cn-title">Get in <span>Touch</span></h2>
          <p className="cn-sub">Reach out for orders, custom bouquets, or anything flowers.</p>
          <div className="cn-deco"><span>🌹</span></div>
        </motion.div>

        {/* ── INFO CARDS ── */}
        <div className="cn-cards-wrap">
          <div className="cn-cards-grid">
            {infoCards.map((c, i) => <InfoCard key={c.label} {...c} />)}
          </div>
        </div>

        {/* ── FORM + SIDE ── */}
        <div className="cn-layout">

          {/* form */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <TiltCard>
              <div className="cn-glass cn-form-panel">
                <p className="cn-panel-title">📝 Send a Message</p>

                <FloatInput label="Your Name" name="name" value={form.name} onChange={handleChange} icon="👤" />
                <FloatInput label="Email Address" name="email" value={form.email} onChange={handleChange} icon="✉️" />
                <FloatInput label="Phone (optional)" name="phone" value={form.phone} onChange={handleChange} icon="📱" />
                <FloatInput label="Your Message" name="message" value={form.message} onChange={handleChange} icon="💬" textarea />

                <motion.button
                  className="cn-submit"
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSubmit}
                  disabled={!form.name || !form.email || !form.message}
                >
                  🌸 Send Message
                </motion.button>

                <AnimatePresence>
                  {sent && (
                    <motion.div
                      className="cn-toast"
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    >
                      ✓ Message sent! We'll get back to you soon.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </TiltCard>
          </motion.div>

          {/* side panel */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.32 }}
            style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}
          >
            {/* hours */}
            <TiltCard>
              <div className="cn-glass cn-side-panel" style={{ padding: "1.8rem" }}>
                <p className="cn-hours-title">🕐 Business Hours</p>
                {[
                  { day: "Monday – Friday", time: "8:00 AM – 8:00 PM", open: true },
                  { day: "Saturday", time: "8:00 AM – 9:00 PM", open: true },
                  { day: "Sunday", time: "9:00 AM – 6:00 PM", open: true },
                  { day: "Public Holidays", time: "Call ahead", open: false },
                ].map(r => (
                  <div key={r.day} className="cn-hours-row">
                    <span className="cn-hours-day">{r.day}</span>
                    <span className={`cn-hours-time ${r.open ? "open" : ""}`}>{r.time}</span>
                  </div>
                ))}

                <div style={{ marginTop: "1.4rem" }}>
                  <p className="cn-hours-title" style={{ marginBottom: "0.8rem" }}>🔗 Find Us Online</p>
                  <div className="cn-socials">
                    <a href="https://wa.me/918055895353" className="cn-social-btn" target="_blank" rel="noreferrer">💬 WhatsApp</a>
                    <a href="mailto:support@petalsandfloras.com" className="cn-social-btn">📧 Email</a>
                    <a href="tel:+918055895353" className="cn-social-btn">📞 Call</a>
                  </div>
                </div>
              </div>
            </TiltCard>

            {/* address */}
            <TiltCard>
              <div className="cn-glass" style={{ padding: "1.6rem" }}>
                <p className="cn-hours-title">📍 Our Location</p>
                <div className="cn-address">
                  <p>
                    <strong>Petals & Flora</strong><br />
                    West Tambaram,<br />
                    Chennai, Tamil Nadu — 600 045<br />
                    <strong>India</strong>
                  </p>
                </div>
                <a
                  href="https://maps.google.com/?q=Tambaram,Chennai"
                  target="_blank"
                  rel="noreferrer"
                  className="cn-social-btn"
                  style={{ marginTop: "1rem", display: "inline-flex" }}
                >
                  🗺 Open in Maps
                </a>
              </div>
            </TiltCard>
          </motion.div>

        </div>
      </div>
    </>
  );
}
