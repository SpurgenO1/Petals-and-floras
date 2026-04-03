import { useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";

// ── Floating petal ────────────────────────────────────────────────────────────
function FloatingPetal({ style }) {
  return (
    <motion.div
      style={style}
      className="ab-petal"
      animate={{ y: ["0vh", "110vh"], rotate: [0, 360], opacity: [0, 0.65, 0] }}
      transition={{ duration: style.duration, repeat: Infinity, ease: "linear", delay: style.delay }}
    />
  );
}

// ── 3-D Tilt Card ─────────────────────────────────────────────────────────────
function TiltCard({ children, className = "" }) {
  const ref = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 180, damping: 22 });
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), { stiffness: 180, damping: 22 });
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
      className={`ab-tilt ${className}`}
    >
      {children}
      <motion.div
        className="ab-glare"
        style={{ background: `radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.2) 0%, transparent 65%)` }}
      />
    </motion.div>
  );
}


// ── Value card ────────────────────────────────────────────────────────────────
function ValueCard({ icon, title, desc, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.55, delay }}
    >
      <TiltCard>
        <div className="ab-value">
          <span className="ab-value-icon">{icon}</span>
          <h3 className="ab-value-title">{title}</h3>
          <p className="ab-value-desc">{desc}</p>
        </div>
      </TiltCard>
    </motion.div>
  );
}

// ── Main About ────────────────────────────────────────────────────────────────
export default function About() {
  const petals = Array.from({ length: 16 }, () => ({
    left: `${Math.random() * 100}%`,
    width: `${10 + Math.random() * 18}px`,
    height: `${14 + Math.random() * 22}px`,
    duration: 7 + Math.random() * 9,
    delay: Math.random() * 12,
  }));

  const values = [
    { icon: "💐", title: "Our Philosophy", desc: "At Petals and Flora, we believe that flowers have the power to brighten someone's day, express emotions, and create memories. Our commitment is to provide the freshest and most beautiful flowers while offering unique floral arrangements for any occasion." },
    { icon: "🚚", title: "Reliable Delivery", desc: "We pride ourselves on reliable flower delivery services and sharing helpful plant care tips to ensure your blooms last long after they arrive." },
    { icon: "🎊", title: "Weddings & Events", desc: "We provide stunning floral arrangements for weddings and events, heartfelt sympathy arrangements, and reliable flower delivery for daily needs." },
    { icon: "🎨", title: "Custom Designs", desc: "We specialize in custom-designed arrangements and gift baskets that can be tailored to meet your specific preferences and budget." },
    { icon: "🌿", title: "Plant Care Tips", desc: "Don't forget to check out our plant care tips to keep your greenery thriving! We share expert advice to help your blooms last longer." },
    { icon: "📍", title: "Local Roots", desc: "Born in Tambaram, we understand Chennai's love for fresh, vibrant flowers at every occasion — from grand celebrations to quiet everyday moments." },
  ];

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --rose-deep:  #7b1a2e;
          --rose-mid:   #c0354e;
          --rose-light: #f1a0b0;
          --rose-petal: #e8536d;
          --gold:       #d4a84b;
        }

        /* ── page ── */
        .ab-page {
          min-height: 100vh;
          background:
            radial-gradient(ellipse 80% 60% at 20% 10%, rgba(192,53,78,0.38) 0%, transparent 55%),
            radial-gradient(ellipse 60% 55% at 80% 90%, rgba(123,26,46,0.48) 0%, transparent 55%),
            radial-gradient(ellipse 100% 100% at 50% 50%, #1a0510 0%, #0d0007 100%);
          position: relative; overflow: hidden;
          font-family: 'Jost', sans-serif;
          padding-top: var(--nav-height);
        }
        .ab-page::before {
          content: "";
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E");
          opacity: 0.5;
        }

        /* ── petals ── */
        .ab-petals { position: fixed; inset: 0; pointer-events: none; z-index: 1; }
        .ab-petal {
          position: absolute; top: -60px;
          background: radial-gradient(ellipse at 40% 30%, #f8b4c0, #c0354e 60%, #7b1a2e);
          border-radius: 0 80% 0 80%;
          will-change: transform;
        }

        /* ── tilt ── */
        .ab-tilt { position: relative; border-radius: 22px; }
        .ab-glare {
          position: absolute; inset: 0; border-radius: 22px;
          pointer-events: none; z-index: 5;
        }

        /* ── glass panel base ── */
        .ab-glass {
          background: rgba(60,5,20,0.45);
          border: 1px solid rgba(255,255,255,0.13);
          backdrop-filter: blur(24px) saturate(1.8);
          -webkit-backdrop-filter: blur(24px) saturate(1.8);
          border-radius: 22px;
          box-shadow: 0 2px 0 rgba(255,255,255,0.07) inset, 0 20px 60px rgba(0,0,0,0.5), 0 4px 24px rgba(192,53,78,0.15);
        }

        /* ── HERO section ── */
        .ab-hero {
          position: relative; z-index: 10;
          min-height: 70vh;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center;
          padding: 5rem 2rem 4rem;
        }

        .ab-eyebrow {
          font-size: 0.7rem; letter-spacing: 0.38em;
          text-transform: uppercase; color: var(--rose-light);
          font-weight: 300; margin-bottom: 1rem;
        }
        .ab-hero-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(3rem, 7vw, 5.5rem);
          font-weight: 700; color: #fff; line-height: 1.05;
          text-shadow: 0 4px 40px rgba(192,53,78,0.5);
          margin-bottom: 0.5rem;
        }
        .ab-hero-title span { color: var(--rose-petal); }
        .ab-hero-title em {
          font-style: italic; font-weight: 300;
          color: rgba(255,255,255,0.7);
        }

        .ab-hero-sub {
          max-width: 560px; margin: 1.5rem auto 0;
          color: rgba(255,255,255,0.74);
          font-size: 1rem; font-weight: 300;
          line-height: 1.75; letter-spacing: 0.03em;
        }

        .ab-deco {
          display: flex; align-items: center; gap: 1rem;
          justify-content: center; margin: 1.5rem 0;
        }
        .ab-deco::before, .ab-deco::after {
          content: ""; flex: 0 0 80px; height: 1px;
          background: linear-gradient(90deg, transparent, var(--rose-mid));
        }
        .ab-deco::after { background: linear-gradient(90deg, var(--rose-mid), transparent); }

        /* ── big quote ── */
        .ab-quote-wrap {
          position: relative; z-index: 10;
          padding: 0 2rem 4rem;
          max-width: 800px; margin: 0 auto;
        }
        .ab-quote-panel {
          padding: 2.5rem 3rem;
          text-align: center;
        }
        .ab-quote-mark {
          font-family: 'Cormorant Garamond', serif;
          font-size: 5rem; line-height: 0.6;
          color: var(--rose-petal); opacity: 0.4;
          display: block; margin-bottom: 0.5rem;
        }
        .ab-quote-text {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.3rem, 2.5vw, 1.75rem);
          font-style: italic; font-weight: 400;
          color: rgba(255,255,255,0.85);
          line-height: 1.6; letter-spacing: 0.02em;
        }
        .ab-quote-attr {
          display: block; margin-top: 1.2rem;
          font-size: 0.75rem; letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--rose-light); opacity: 0.7;
        }

        /* ── stats ── */
        .ab-section {
          position: relative; z-index: 10;
          padding: 2rem 2rem 4rem;
          max-width: 1100px; margin: 0 auto;
        }
        .ab-section-title {
          text-align: center; margin-bottom: 2.5rem;
        }
        .ab-section-title h2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.8rem, 3.5vw, 2.8rem);
          font-weight: 700; color: #fff;
          text-shadow: 0 2px 24px rgba(192,53,78,0.4);
        }
        .ab-section-title h2 span { color: var(--rose-petal); }
        .ab-section-title p {
          color: rgba(255,255,255,0.7);
          font-size: 0.9rem; margin-top: 0.5rem;
          letter-spacing: 0.04em;
        }

        .ab-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.2rem;
        }
        @media (max-width: 800px) { .ab-stats-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 420px) { .ab-stats-grid { grid-template-columns: 1fr 1fr; gap: 0.8rem; } }

        .ab-stat {
          padding: 1.8rem 1.2rem;
          text-align: center;
          display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
          transform: translateZ(20px);
        }
        .ab-stat-icon { font-size: 1.8rem; margin-bottom: 0.4rem; }
        .ab-stat-val {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2rem; font-weight: 700; color: #fff;
          line-height: 1;
        }
        .ab-stat-label {
          font-size: 0.72rem; letter-spacing: 0.12em;
          text-transform: uppercase; color: rgba(255,255,255,0.72);
        }

        /* ── values grid ── */
        .ab-values-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.4rem;
        }
        @media (max-width: 860px) { .ab-values-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 520px) { .ab-values-grid { grid-template-columns: 1fr; } }

        .ab-value {
          padding: 1.8rem 1.5rem;
          transform: translateZ(20px);
        }
        .ab-value-icon {
          font-size: 1.8rem; display: block; margin-bottom: 0.9rem;
          filter: drop-shadow(0 2px 8px rgba(192,53,78,0.4));
        }
        .ab-value-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.2rem; font-weight: 600; color: #fff;
          margin-bottom: 0.6rem;
        }
        .ab-value-desc {
          font-size: 0.85rem; color: rgba(255,255,255,0.74);
          line-height: 1.65; font-weight: 300;
        }

        /* ── story section ── */
        .ab-story-wrap {
          position: relative; z-index: 10;
          padding: 0 2rem 5rem;
          max-width: 800px; margin: 0 auto;
        }
        .ab-story {
          padding: 2.5rem 2.5rem;
        }
        .ab-story-inner { transform: translateZ(20px); }
        .ab-story h3 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.8rem; font-weight: 600; color: #fff;
          margin-bottom: 1.2rem; display: flex; align-items: center; gap: 0.5rem;
        }
        .ab-story h3::after {
          content: ""; flex: 1; height: 1px;
          background: linear-gradient(90deg, rgba(255,255,255,0.15), transparent);
        }
        .ab-story p {
          font-size: 0.92rem; color: rgba(255,255,255,0.76);
          line-height: 1.85; font-weight: 300; margin-bottom: 1rem;
          letter-spacing: 0.02em;
        }
        .ab-story p:last-child { margin-bottom: 0; }
        .ab-story strong { color: var(--rose-light); font-weight: 400; }

        /* occasion chips */
        .ab-chips {
          display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 1.5rem;
        }
        .ab-chip {
          padding: 0.35rem 1rem; border-radius: 50px;
          background: rgba(192,53,78,0.18);
          border: 1px solid rgba(232,83,109,0.28);
          color: var(--rose-light);
          font-size: 0.75rem; letter-spacing: 0.08em;
        }

        /* ── team layout ── */
        .ab-team-layout {
          display: grid; grid-template-columns: 1fr 1.2fr; gap: 1.8rem;
          align-items: center; margin-top: 0.5rem;
        }
        @media (max-width: 600px) { .ab-team-layout { grid-template-columns: 1fr; } }
        .ab-team-img-wrap {
          border-radius: 16px; overflow: hidden;
          box-shadow: 0 8px 30px rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.1);
          background: #2d5a27;
        }
        .ab-team-img { width: 100%; height: 220px; object-fit: cover; display: block; }

        /* ── philosophy + services grid ── */
        .ab-ps-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;
        }
        @media (max-width: 700px) { .ab-ps-grid { grid-template-columns: 1fr; } }

        .ab-ps-card { overflow: hidden; }
        .ab-ps-img-wrap { position: relative; height: 200px; overflow: hidden; background: rgba(192,53,78,0.15); }
        .ab-ps-img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.5s ease; }
        .ab-tilt:hover .ab-ps-img { transform: scale(1.06); }
        .ab-ps-img-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(180deg, transparent 40%, rgba(15,0,7,0.7) 100%);
        }
        .ab-ps-body { padding: 1.4rem 1.6rem 1.8rem; transform: translateZ(20px); }
        .ab-ps-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.3rem; font-weight: 600; color: #fff;
          margin-bottom: 0.8rem;
          display: flex; align-items: center; gap: 0.4rem;
        }
        .ab-ps-desc {
          font-size: 0.86rem; color: rgba(255,255,255,0.74);
          line-height: 1.75; font-weight: 300;
        }
        @media (max-width: 640px) {
          .ab-hero { min-height: auto; padding: 2rem 1rem 2.5rem; }
          .ab-quote-wrap, .ab-section, .ab-story-wrap { padding-left: 0.9rem; padding-right: 0.9rem; }
          .ab-quote-panel, .ab-story { padding: 1.5rem 1.2rem; }
          .ab-team-img { height: 180px; }
        }
      `}</style>

      {/* petals */}
      <div className="ab-petals">
        {petals.map((s, i) => <FloatingPetal key={i} style={s} />)}
      </div>

      <div className="ab-page">

        {/* ── HERO ── */}
        <section className="ab-hero">
          <motion.p className="ab-eyebrow"
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}>
            ✦ Our story ✦
          </motion.p>

          <motion.h1 className="ab-hero-title"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}>
            Petals <em>&</em> <span>Flora</span>
          </motion.h1>

          <div className="ab-deco"><span>🌹</span></div>

          <motion.p className="ab-hero-sub"
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}>
            We deliver premium floral arrangements for birthdays, anniversaries, weddings, and everyday gifting — bringing nature's finest blooms straight to your doorstep across Chennai.
          </motion.p>
        </section>

        {/* ── QUOTE ── */}
        <div className="ab-quote-wrap">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.65 }}
          >
            <TiltCard>
              <div className="ab-glass ab-quote-panel">
                <span className="ab-quote-mark">"</span>
                <p className="ab-quote-text">
                  Flowers are the music of the ground, from earth's lips spoken without sound.
                </p>
                <span className="ab-quote-attr">— Edwin Curran</span>
              </div>
            </TiltCard>
          </motion.div>
        </div>

        {/* ── VALUES ── */}
        <section className="ab-section" style={{ paddingTop: 0 }}>
          <div className="ab-section-title">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55 }}
            >
              What We <span>Stand For</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
            >
              Our philosophy, services, and commitment — all rooted in a love for flowers.
            </motion.p>
          </div>
          <div className="ab-values-grid">
            {values.map((v, i) => (
              <ValueCard key={v.title} {...v} delay={i * 0.08} />
            ))}
          </div>
        </section>

        {/* ── STORY ── */}
        <div className="ab-story-wrap">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.65 }}
          >
            <TiltCard>
              <div className="ab-glass ab-story">
                <div className="ab-story-inner">
                  <h3>🌷 Our Story</h3>
                  <p>
                    Founded in <strong>2025 in Tambaram</strong>, Petals & Flora started with a simple dream — to make premium blooms accessible to everyone in Chennai. What began with a handful of roses has blossomed into a full-scale delivery service trusted by thousands.
                  </p>
                  <p>
                    We work directly with trusted local farms, cutting out middlemen to bring you fresher flowers at better prices. Each arrangement is hand-crafted by our in-house florists who treat every bouquet like a work of art.
                  </p>
                  <p>
                    Whether it's a grand wedding centrepiece or a simple "thinking of you" bunch, we pour the same passion into every order. Because we believe <strong>every moment deserves to bloom.</strong>
                  </p>
                  <div className="ab-chips">
                    {["Birthdays", "Anniversaries", "Weddings", "Funerals", "Festivals", "Corporate", "Just Because 🌸"].map(c => (
                      <span key={c} className="ab-chip">{c}</span>
                    ))}
                  </div>
                </div>
              </div>
            </TiltCard>
          </motion.div>
        </div>

        {/* ── OUR TEAM ── */}
        <div className="ab-story-wrap" style={{ paddingTop: 0 }}>
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.65 }}
          >
            <TiltCard>
              <div className="ab-glass ab-story">
                <div className="ab-story-inner">
                  <h3>👩‍🌾 Our Team</h3>
                  <div className="ab-team-layout">
                    <div className="ab-team-img-wrap">
                      <img
                        src="/team-image.png"
                        alt="Our florist team"
                        className="ab-team-img"
                        style={{ objectFit: "contain", background: "#2d5a27", padding: "1rem" }}
                      />
                    </div>
                    <div className="ab-team-text">
                      <p>
                        Our team of <strong>experienced florists</strong> is dedicated to creating stunning floral arrangements that exceed your expectations. We are passionate about what we do and take pride in our work.
                      </p>
                      <p>
                        Whether you're interested in <strong>flower delivery</strong> or need plant care tips, we are always happy to answer any questions you may have and help you choose the perfect arrangement for your needs.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TiltCard>
          </motion.div>
        </div>

        {/* ── PHILOSOPHY + SERVICES ── */}
        <section className="ab-section" style={{ paddingTop: 0, paddingBottom: "5rem" }}>
          <div className="ab-ps-grid">

            {/* Philosophy */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55 }}
            >
              <TiltCard>
                <div className="ab-glass ab-ps-card">
                  <div className="ab-ps-img-wrap">
                    <img
                      src="https://images.unsplash.com/photo-1457089328109-e5d9bd499191?w=600&q=80"
                      alt="Our Philosophy"
                      className="ab-ps-img"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                    <div className="ab-ps-img-overlay" />
                  </div>
                  <div className="ab-ps-body">
                    <h3 className="ab-ps-title">🌸 Our Philosophy</h3>
                    <p className="ab-ps-desc">
                      At Petals and Flora, we believe that flowers have the power to brighten someone's day, express emotions, and create memories. Our commitment is to provide our customers with the freshest and most beautiful flowers while offering unique floral arrangements for any occasion. Additionally, we pride ourselves on reliable flower delivery services and sharing helpful plant care tips to ensure your blooms last.
                    </p>
                  </div>
                </div>
              </TiltCard>
            </motion.div>

            {/* Services */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, delay: 0.12 }}
            >
              <TiltCard>
                <div className="ab-glass ab-ps-card">
                  <div className="ab-ps-img-wrap">
                    <img
                      src="https://images.unsplash.com/photo-1519378058457-4c29a0a2efac?w=600&q=80"
                      alt="Our Services"
                      className="ab-ps-img"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                    <div className="ab-ps-img-overlay" />
                  </div>
                  <div className="ab-ps-body">
                    <h3 className="ab-ps-title">🎊 Our Services</h3>
                    <p className="ab-ps-desc">
                      We provide a diverse range of services, including stunning floral arrangements for weddings and events, heartfelt sympathy arrangements, and reliable flower delivery for daily needs. Additionally, we specialize in custom-designed arrangements and gift baskets that can be tailored to meet your specific preferences. Don't forget to check out our plant care tips to keep your greenery thriving!
                    </p>
                  </div>
                </div>
              </TiltCard>
            </motion.div>

          </div>
        </section>

      </div>
    </>
  );
}
