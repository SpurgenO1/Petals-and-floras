import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";

// ── Floating petal ────────────────────────────────────────────────────────────
function FloatingPetal({ style }) {
  return (
    <motion.div
      style={style}
      className="ct-petal"
      animate={{ y: ["0vh", "110vh"], rotate: [0, 360], opacity: [0, 0.65, 0] }}
      transition={{ duration: style.duration, repeat: Infinity, ease: "linear", delay: style.delay }}
    />
  );
}

// ── 3-D Tilt wrapper ──────────────────────────────────────────────────────────
function TiltCard({ children }) {
  const ref = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 22 });
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 22 });
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
      className="ct-tilt"
    >
      {children}
      <motion.div
        className="ct-glare"
        style={{ background: `radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.22) 0%, transparent 65%)` }}
      />
    </motion.div>
  );
}

// ── Cart Item Row ─────────────────────────────────────────────────────────────
function CartItem({ item, onRemove, index }) {
  const [removing, setRemoving] = useState(false);

  function handleRemove() {
    setRemoving(true);
    setTimeout(() => onRemove(item.id), 320);
  }

  return (
    <motion.div
      className="ct-item"
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: removing ? 0 : 1, x: removing ? 40 : 0, scale: removing ? 0.95 : 1 }}
      transition={{ delay: index * 0.07, duration: 0.3 }}
      layout
    >
      {/* flower icon + name */}
      <div className="ct-item-left">
        <div className="ct-flower-dot">🌸</div>
        <div className="ct-item-info">
          <p className="ct-item-name">{item.name}</p>
          <p className="ct-item-cat">{item.category || "Flower"}</p>
        </div>
      </div>

      {/* qty × price */}
      <div className="ct-item-mid">
        <span className="ct-qty-badge">×{item.qty || 1}</span>
        <span className="ct-item-price">₹{(Number(item.price) * Number(item.qty || 1)).toLocaleString()}</span>
      </div>

      {/* remove */}
      <motion.button
        className="ct-remove-btn"
        whileTap={{ scale: 0.88 }}
        onClick={handleRemove}
        title="Remove"
      >
        ✕
      </motion.button>
    </motion.div>
  );
}

// ── Main Cart ─────────────────────────────────────────────────────────────────
export default function Cart({ cart = [], removeFromCart = () => {} }) {
  const total = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1),
    0
  );

  const petals = Array.from({ length: 14 }, () => ({
    left: `${Math.random() * 100}%`,
    width: `${10 + Math.random() * 16}px`,
    height: `${14 + Math.random() * 20}px`,
    duration: 8 + Math.random() * 8,
    delay: Math.random() * 10,
  }));

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
        .ct-page {
          min-height: 100vh;
          background:
            radial-gradient(ellipse 80% 60% at 15% 10%, rgba(192,53,78,0.38) 0%, transparent 55%),
            radial-gradient(ellipse 60% 55% at 85% 90%, rgba(123,26,46,0.48) 0%, transparent 55%),
            radial-gradient(ellipse 100% 100% at 50% 50%, #1a0510 0%, #0d0007 100%);
          position: relative; overflow: hidden;
          font-family: 'Jost', sans-serif;
          padding: calc(var(--nav-height) + 3rem) 1.5rem 5rem;
        }
        .ct-page::before {
          content: "";
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E");
          opacity: 0.5;
        }

        /* petals */
        .ct-petals { position: fixed; inset: 0; pointer-events: none; z-index: 1; }
        .ct-petal {
          position: absolute; top: -60px;
          background: radial-gradient(ellipse at 40% 30%, #f8b4c0, #c0354e 60%, #7b1a2e);
          border-radius: 0 80% 0 80%;
          will-change: transform;
        }

        /* ── header ── */
        .ct-header {
          position: relative; z-index: 10;
          text-align: center; margin-bottom: 2.8rem;
        }
        .ct-eyebrow {
          font-size: 0.7rem; letter-spacing: 0.35em;
          text-transform: uppercase; color: var(--rose-light);
          font-weight: 300; margin-bottom: 0.6rem;
        }
        .ct-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(2rem, 4vw, 3.2rem);
          font-weight: 700; color: #fff;
          text-shadow: 0 2px 30px rgba(192,53,78,0.5);
        }
        .ct-title span { color: var(--rose-petal); }
        .ct-deco {
          display: flex; align-items: center; gap: 1rem;
          justify-content: center; margin-top: 1.2rem;
        }
        .ct-deco::before, .ct-deco::after {
          content: ""; flex: 0 0 70px; height: 1px;
          background: linear-gradient(90deg, transparent, var(--rose-mid));
        }
        .ct-deco::after { background: linear-gradient(90deg, var(--rose-mid), transparent); }

        /* ── tilt ── */
        .ct-tilt { position: relative; border-radius: 24px; }
        .ct-glare {
          position: absolute; inset: 0; border-radius: 24px;
          pointer-events: none; z-index: 5;
        }

        /* ── glass panel ── */
        .ct-panel {
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
          max-width: 680px;
          margin: 0 auto;
          position: relative; z-index: 10;
        }
        .ct-panel-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.3rem; font-weight: 600; color: #fff;
          margin-bottom: 1.6rem;
          display: flex; align-items: center; gap: 0.5rem;
        }
        .ct-panel-title::after {
          content: ""; flex: 1; height: 1px;
          background: linear-gradient(90deg, rgba(255,255,255,0.15), transparent);
        }

        /* ── item row ── */
        .ct-item {
          display: flex; align-items: center; gap: 1rem;
          padding: 0.9rem 0;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .ct-item:last-of-type { border-bottom: none; }

        .ct-item-left { display: flex; align-items: center; gap: 0.8rem; flex: 1; min-width: 0; }

        .ct-flower-dot {
          width: 38px; height: 38px; flex-shrink: 0;
          background: rgba(192,53,78,0.2);
          border: 1px solid rgba(232,83,109,0.3);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem;
        }

        .ct-item-name {
          font-size: 0.92rem; color: rgba(255,255,255,0.9);
          font-weight: 400; white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis;
        }
        .ct-item-cat {
          font-size: 0.7rem; color: var(--rose-light);
          letter-spacing: 0.1em; text-transform: uppercase; margin-top: 2px;
        }

        .ct-item-mid {
          display: flex; align-items: center; gap: 0.6rem; flex-shrink: 0;
        }
        .ct-qty-badge {
          background: rgba(192,53,78,0.22);
          border: 1px solid rgba(232,83,109,0.3);
          color: var(--rose-light);
          font-size: 0.75rem; padding: 0.18rem 0.55rem;
          border-radius: 50px; letter-spacing: 0.04em;
        }
        .ct-item-price {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.05rem; font-weight: 600; color: #fff;
          min-width: 72px; text-align: right;
        }

        .ct-remove-btn {
          width: 30px; height: 30px; flex-shrink: 0;
          border-radius: 50%; border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.4);
          font-size: 0.7rem; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.22s;
        }
        .ct-remove-btn:hover {
          background: rgba(239,68,68,0.2);
          border-color: rgba(239,68,68,0.4);
          color: #fca5a5;
        }

        /* ── divider ── */
        .ct-divider {
          height: 1px; margin: 1.2rem 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
        }

        /* ── total row ── */
        .ct-total {
          display: flex; justify-content: space-between; align-items: baseline;
          margin-bottom: 1.8rem;
        }
        .ct-total-label {
          font-size: 0.78rem; letter-spacing: 0.14em;
          text-transform: uppercase; color: rgba(255,255,255,0.4);
        }
        .ct-total-val {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2.2rem; font-weight: 700; color: #fff;
        }
        .ct-total-val span { font-size: 1.1rem; color: var(--rose-light); margin-right: 2px; }

        /* ── checkout button ── */
        .ct-checkout-btn {
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          width: 100%; padding: 1rem 1.5rem;
          border-radius: 50px; border: none;
          background: linear-gradient(135deg, var(--rose-mid), var(--rose-deep));
          color: #fff;
          font-family: 'Jost', sans-serif;
          font-size: 0.92rem; font-weight: 500;
          letter-spacing: 0.1em; text-transform: uppercase;
          text-decoration: none;
          cursor: pointer;
          box-shadow: 0 4px 22px rgba(192,53,78,0.45), 0 1px 0 rgba(255,255,255,0.1) inset;
          border: 1px solid rgba(255,255,255,0.1);
          position: relative; overflow: hidden;
          transition: box-shadow 0.25s, transform 0.25s;
        }
        .ct-checkout-btn::before {
          content: ""; position: absolute; inset: 0;
          background: rgba(255,255,255,0.12);
          transform: translateX(-100%);
          transition: transform 0.4s ease;
        }
        .ct-checkout-btn:hover::before { transform: translateX(0); }
        .ct-checkout-btn:hover {
          box-shadow: 0 8px 32px rgba(192,53,78,0.6), 0 1px 0 rgba(255,255,255,0.1) inset;
          transform: translateY(-1px);
        }

        /* item count badge in header */
        .ct-count-badge {
          display: inline-flex; align-items: center; justify-content: center;
          background: rgba(192,53,78,0.25);
          border: 1px solid rgba(232,83,109,0.35);
          color: var(--rose-light);
          font-size: 0.78rem; font-family: 'Jost', sans-serif;
          padding: 0.2rem 0.8rem; border-radius: 50px;
          margin-top: 0.8rem; letter-spacing: 0.06em;
        }

        /* ── empty state ── */
        .ct-empty {
          text-align: center; padding: 3rem 1rem;
          position: relative; z-index: 10;
        }
        .ct-empty-icon { font-size: 4rem; margin-bottom: 1rem; opacity: 0.6; }
        .ct-empty-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.8rem; color: rgba(255,255,255,0.6);
          margin-bottom: 0.5rem;
        }
        .ct-empty-sub { color: rgba(255,255,255,0.3); font-size: 0.88rem; margin-bottom: 1.8rem; }
        .ct-shop-link {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.7rem 1.8rem; border-radius: 50px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.75);
          font-family: 'Jost', sans-serif; font-size: 0.85rem;
          letter-spacing: 0.08em; text-decoration: none;
          transition: all 0.25s;
        }
        .ct-shop-link:hover {
          background: rgba(192,53,78,0.2);
          border-color: var(--rose-petal);
          color: #fff;
        }
        @media (max-width: 640px) {
          .ct-page { padding: calc(var(--nav-height) + 1.5rem) 0.9rem 4rem; }
          .ct-panel { padding: 1.2rem; }
          .ct-item { align-items: flex-start; gap: 0.7rem; flex-wrap: wrap; }
          .ct-item-left { min-width: 0; width: calc(100% - 38px); }
          .ct-item-mid { width: 100%; justify-content: space-between; padding-left: 2.9rem; }
          .ct-item-name { white-space: normal; }
          .ct-total { align-items: center; }
          .ct-total-val { font-size: 1.7rem; }
          .ct-checkout-btn { font-size: 0.82rem; padding: 0.9rem 1rem; }
        }
      `}</style>

      {/* petals */}
      <div className="ct-petals">
        {petals.map((s, i) => <FloatingPetal key={i} style={s} />)}
      </div>

      <div className="ct-page">

        {/* header */}
        <motion.div
          className="ct-header"
          initial={{ opacity: 0, y: -28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <p className="ct-eyebrow">✦ Ready to bloom ✦</p>
          <h2 className="ct-title">Your <span>Cart</span></h2>
          <div className="ct-deco"><span>🛒</span></div>
          {cart.length > 0 && (
            <div><span className="ct-count-badge">{cart.length} item{cart.length !== 1 ? "s" : ""} in your basket</span></div>
          )}
        </motion.div>

        {/* empty state */}
        {cart.length === 0 ? (
          <motion.div
            className="ct-empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="ct-empty-icon">🌷</div>
            <p className="ct-empty-title">Your cart is empty</p>
            <p className="ct-empty-sub">Looks like you haven't added any blooms yet.</p>
            <Link to="/products" className="ct-shop-link">🌸 Browse Collection</Link>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18 }}
          >
            <TiltCard>
              <div className="ct-panel">
                <p className="ct-panel-title">🌺 Your Selections</p>

                <AnimatePresence>
                  {cart.map((item, i) => (
                    <CartItem
                      key={item.id}
                      item={item}
                      index={i}
                      onRemove={removeFromCart}
                    />
                  ))}
                </AnimatePresence>

                <div className="ct-divider" />

                <div className="ct-total">
                  <span className="ct-total-label">Order Total</span>
                  <span className="ct-total-val"><span>₹</span>{total.toLocaleString()}</span>
                </div>

                <motion.div whileTap={{ scale: 0.98 }}>
                  <Link to="/checkout" className="ct-checkout-btn">
                    Proceed to Checkout →
                  </Link>
                </motion.div>
              </div>
            </TiltCard>
          </motion.div>
        )}
      </div>
    </>
  );
}
