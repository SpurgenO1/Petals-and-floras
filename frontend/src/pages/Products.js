import { useEffect, useState, useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";

// ── Inline mock (replace with your real import) ──────────────────────────────
const mockProducts = [
  { id: 1, name: "Red Velvet Roses", category: "Roses", price: 349, image: "https://images.unsplash.com/photo-1548460607-caef4d2d6f0e?w=400&q=80", rating: 4.8 },
  { id: 2, name: "Sunset Gerbera Pack", category: "Gerbera", price: 199, image: "https://images.unsplash.com/photo-1453791052107-5c843da62d97?w=400&q=80", rating: 4.5 },
  { id: 3, name: "Love Bouquet", category: "Bouquet", price: 599, image: "https://images.unsplash.com/photo-1487530811015-780ce0e81958?w=400&q=80", rating: 4.9 },
  { id: 4, name: "Pink Asiatic Lily", category: "Asiatic Lily", price: 449, image: "https://images.unsplash.com/photo-1490750967868-88df5691cc52?w=400&q=80", rating: 4.7 },
  { id: 5, name: "White Pearl Roses", category: "Roses", price: 399, image: "https://images.unsplash.com/photo-1518895312237-a9e23508077d?w=400&q=80", rating: 4.6 },
  { id: 6, name: "Coral Gerbera Bunch", category: "Gerbera", price: 249, image: "https://images.unsplash.com/photo-1516709766524-e1e4a6b2f78b?w=400&q=80", rating: 4.4 },
];

// ── Floating petal SVG component ─────────────────────────────────────────────
function FloatingPetal({ style }) {
  return (
    <motion.div
      style={style}
      className="petal"
      animate={{ y: ["0vh", "110vh"], rotate: [0, 360], opacity: [0, 0.7, 0] }}
      transition={{ duration: style.duration, repeat: Infinity, ease: "linear", delay: style.delay }}
    />
  );
}

// ── 3-D tilt card ─────────────────────────────────────────────────────────────
function TiltCard({ children }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [12, -12]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-12, 12]), { stiffness: 200, damping: 20 });
  const glareX = useTransform(x, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(y, [-0.5, 0.5], ["0%", "100%"]);

  function onMove(e) {
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }
  function onLeave() { x.set(0); y.set(0); }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d", perspective: 800 }}
      className="tilt-wrapper"
    >
      {children}
      {/* glare overlay */}
      <motion.div
        className="glare"
        style={{
          background: `radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.28) 0%, transparent 70%)`,
        }}
      />
    </motion.div>
  );
}

// ── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({ product, addToCart }) {
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <TiltCard>
      <div className="card">
        <div className="card-img-wrap">
          <img src={product.image} alt={product.name} className="card-img" />
          <div className="img-overlay" />
          <span className="badge">₹{product.price}</span>
        </div>
        <div className="card-body">
          <p className="card-cat">{product.category}</p>
          <h3 className="card-title">{product.name}</h3>
          <div className="card-footer">
            <span className="stars">{"★".repeat(Math.round(product.rating))}<span className="star-val"> {product.rating}</span></span>
            <motion.button
              className={`btn-add ${added ? "btn-added" : ""}`}
              whileTap={{ scale: 0.92 }}
              onClick={handleAdd}
            >
              {added ? "✓ Added" : "+ Cart"}
            </motion.button>
          </div>
        </div>
      </div>
    </TiltCard>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Products({ cart = [], setCart = () => {} }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("Tambaram");

  useEffect(() => {
    // Replace mock with: getProducts().then(res => setProducts(res.data))
    setTimeout(() => { setProducts(mockProducts); setLoading(false); }, 800);
  }, []);

  const addToCart = (product) => {
    setCart(prev => {
      const exists = prev.find(i => i.id === product.id);
      return exists
        ? prev.map(i => i.id === product.id ? { ...i, qty: (i.qty || 1) + 1 } : i)
        : [...prev, { ...product, qty: 1 }];
    });
  };

  const categories = ["Roses", "Gerbera", "Bouquet", "Asiatic Lily"];
  const filtered = products.filter(p => !categoryFilter || p.category === categoryFilter);

  const petals = Array.from({ length: 18 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    width: `${12 + Math.random() * 18}px`,
    height: `${16 + Math.random() * 22}px`,
    duration: 7 + Math.random() * 9,
    delay: Math.random() * 10,
    filter: `hue-rotate(${Math.random() * 30 - 15}deg)`,
  }));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Jost:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── kill any global white backgrounds leaking in ── */
        .section-padding { background: transparent !important; }
        .filter-bar, .filter-group { background: transparent !important; background-color: transparent !important; border: none !important; box-shadow: none !important; }

        :root {
          --rose-deep:   #7b1a2e;
          --rose-mid:    #c0354e;
          --rose-light:  #f1a0b0;
          --rose-blush:  #fde8ed;
          --rose-petal:  #e8536d;
          --gold:        #d4a84b;
          --glass-bg:    rgba(255,255,255,0.08);
          --glass-border:rgba(255,255,255,0.22);
          --glass-shadow:0 8px 40px rgba(123,26,46,0.25);
        }

        body { font-family: 'Jost', sans-serif; }

        /* ── page shell ── */
        .page {
          min-height: 100vh;
          background:
            radial-gradient(ellipse 80% 60% at 20% 10%, rgba(192,53,78,0.35) 0%, transparent 55%),
            radial-gradient(ellipse 60% 50% at 80% 85%, rgba(123,26,46,0.45) 0%, transparent 55%),
            radial-gradient(ellipse 100% 100% at 50% 50%, #1a0510 0%, #0d0007 100%);
          position: relative;
          overflow: hidden;
          padding: calc(var(--nav-height) + 3rem) 2rem 5rem;
        }

        /* noise grain overlay */
        .page::before {
          content: "";
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E");
          opacity: 0.5;
        }

        /* ── floating petals ── */
        .petals-layer { position: fixed; inset: 0; pointer-events: none; z-index: 1; }
        .petal {
          position: absolute;
          top: -60px;
          background: radial-gradient(ellipse at 40% 30%, #f8b4c0, #c0354e 60%, #7b1a2e);
          border-radius: 0 80% 0 80%;
          opacity: 0.55;
          will-change: transform;
        }

        /* ── header ── */
        .header { position: relative; z-index: 10; text-align: center; margin-bottom: 3.5rem; }
        .header-eyebrow {
          font-family: 'Jost', sans-serif;
          font-weight: 300;
          letter-spacing: 0.35em;
          font-size: 0.72rem;
          color: var(--rose-light);
          text-transform: uppercase;
          margin-bottom: 0.75rem;
        }
        .header h2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(2.4rem, 5vw, 4rem);
          font-weight: 700;
          color: #fff;
          line-height: 1.1;
          text-shadow: 0 2px 30px rgba(192,53,78,0.5);
        }
        .header h2 span { color: var(--rose-petal); }
        .header p {
          color: rgba(255,255,255,0.5);
          font-size: 0.95rem;
          margin-top: 0.8rem;
          font-weight: 300;
          letter-spacing: 0.04em;
        }

        /* decorative line */
        .deco-line {
          display: flex; align-items: center; gap: 1rem;
          justify-content: center; margin-top: 1.5rem;
        }
        .deco-line::before, .deco-line::after {
          content: "";
          flex: 0 0 80px; height: 1px;
          background: linear-gradient(90deg, transparent, var(--rose-mid));
        }
        .deco-line::after { background: linear-gradient(90deg, var(--rose-mid), transparent); }
        .deco-rose { font-size: 1.1rem; }

        /* ── filter bar ── */
        .filter-bar {
          display: flex; gap: 1rem; flex-wrap: wrap;
          justify-content: center; margin-bottom: 3rem;
          position: relative; z-index: 10;
          background: transparent !important;
          background-color: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          border-radius: 0 !important;
          width: auto !important;
          max-width: fit-content !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }
        .filter-glass {
          display: flex; align-items: center; gap: 0.6rem;
          padding: 0.55rem 1.2rem;
          background: rgba(60, 5, 20, 0.55);
          border: 1px solid rgba(255,255,255,0.18);
          backdrop-filter: blur(20px) saturate(1.8);
          -webkit-backdrop-filter: blur(20px) saturate(1.8);
          border-radius: 50px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.08) inset;
          transition: border-color 0.3s, background 0.3s;
        }
        .filter-glass:hover {
          border-color: var(--rose-petal);
          background: rgba(80, 10, 30, 0.65);
        }
        .filter-glass span { font-size: 1rem; }
        .filter-glass select {
          background: transparent;
          border: none;
          outline: none;
          color: rgba(255, 255, 255, 0.9);
          font-family: 'Jost', sans-serif;
          font-size: 0.85rem;
          font-weight: 400;
          letter-spacing: 0.03em;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          min-width: 130px;
        }
        .filter-glass select option {
          background: #2d0616;
          color: #fff;
        }

        /* category chips */
        .chip-row {
          display: flex; gap: 0.6rem; flex-wrap: wrap;
          justify-content: center; margin-bottom: 2.5rem;
          position: relative; z-index: 10;
        }
        .chip {
          padding: 0.4rem 1.1rem;
          border-radius: 50px;
          font-size: 0.8rem;
          font-family: 'Jost', sans-serif;
          letter-spacing: 0.06em;
          border: 1px solid var(--glass-border);
          background: var(--glass-bg);
          color: rgba(255,255,255,0.65);
          cursor: pointer;
          backdrop-filter: blur(10px);
          transition: all 0.25s;
        }
        .chip:hover, .chip.active {
          background: linear-gradient(135deg, var(--rose-mid), var(--rose-deep));
          border-color: var(--rose-petal);
          color: #fff;
          box-shadow: 0 4px 20px rgba(192,53,78,0.4);
        }

        /* ── grid ── */
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 2rem;
          position: relative; z-index: 10;
          max-width: 1300px;
          margin: 0 auto;
        }

        /* ── tilt wrapper ── */
        .tilt-wrapper {
          position: relative;
          border-radius: 20px;
          transform-style: preserve-3d;
          cursor: pointer;
        }
        .glare {
          position: absolute; inset: 0;
          border-radius: 20px;
          pointer-events: none;
          z-index: 5;
          transition: background 0.05s;
        }

        /* ── card ── */
        .card {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.15);
          backdrop-filter: blur(20px) saturate(1.8);
          border-radius: 20px;
          overflow: hidden;
          box-shadow:
            0 2px 0 rgba(255,255,255,0.08) inset,
            0 20px 60px rgba(0,0,0,0.45),
            0 4px 20px rgba(192,53,78,0.2);
          transform: translateZ(0);
          transition: box-shadow 0.3s;
        }
        .tilt-wrapper:hover .card {
          box-shadow:
            0 2px 0 rgba(255,255,255,0.12) inset,
            0 30px 70px rgba(0,0,0,0.55),
            0 8px 35px rgba(192,53,78,0.45);
        }

        .card-img-wrap {
          position: relative; overflow: hidden; height: 220px;
        }
        .card-img {
          width: 100%; height: 100%; object-fit: cover;
          transition: transform 0.55s cubic-bezier(0.25,0.46,0.45,0.94);
        }
        .tilt-wrapper:hover .card-img { transform: scale(1.08); }

        .img-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(
            180deg,
            transparent 35%,
            rgba(20,0,8,0.65) 100%
          );
        }
        .badge {
          position: absolute; bottom: 12px; right: 14px;
          background: linear-gradient(135deg, var(--rose-mid), var(--rose-deep));
          color: #fff;
          font-family: 'Cormorant Garamond', serif;
          font-weight: 700;
          font-size: 1.05rem;
          padding: 0.25rem 0.85rem;
          border-radius: 50px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.4);
          letter-spacing: 0.03em;
        }

        .card-body {
          padding: 1.2rem 1.4rem 1.4rem;
          transform: translateZ(30px);
        }
        .card-cat {
          font-size: 0.7rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--rose-light);
          font-weight: 400;
          margin-bottom: 0.35rem;
        }
        .card-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.35rem;
          font-weight: 600;
          color: #fff;
          line-height: 1.25;
          margin-bottom: 1rem;
        }
        .card-footer {
          display: flex; align-items: center; justify-content: space-between;
        }
        .stars { color: var(--gold); font-size: 0.82rem; }
        .star-val { color: rgba(255,255,255,0.55); font-size: 0.78rem; font-family: 'Jost', sans-serif; }

        .btn-add {
          padding: 0.42rem 1.15rem;
          border-radius: 50px;
          border: 1px solid var(--rose-petal);
          background: transparent;
          color: var(--rose-light);
          font-family: 'Jost', sans-serif;
          font-size: 0.8rem;
          letter-spacing: 0.06em;
          cursor: pointer;
          transition: all 0.25s;
        }
        .btn-add:hover {
          background: linear-gradient(135deg, var(--rose-mid), var(--rose-deep));
          color: #fff;
          box-shadow: 0 4px 18px rgba(192,53,78,0.5);
          border-color: transparent;
        }
        .btn-added {
          background: linear-gradient(135deg, #2d7a4f, #1f5c39);
          border-color: transparent;
          color: #fff;
        }

        /* ── loading / error ── */
        .center-msg {
          display: flex; align-items: center; justify-content: center;
          min-height: 60vh; color: rgba(255,255,255,0.5);
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.4rem;
          letter-spacing: 0.1em;
        }
        .loading-rose {
          display: inline-block;
          animation: spin 2s linear infinite;
          margin-right: 0.6rem;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── empty ── */
        .empty { text-align: center; color: rgba(255,255,255,0.35); padding: 3rem 0; font-size: 1rem; letter-spacing: 0.08em; }

        /* ── cart bubble ── */
        .cart-bubble {
          position: fixed; bottom: 2rem; right: 2rem; z-index: 100;
          background: linear-gradient(135deg, var(--rose-mid), var(--rose-deep));
          color: #fff;
          border-radius: 50px;
          padding: 0.7rem 1.4rem;
          font-family: 'Jost', sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          box-shadow: 0 8px 30px rgba(192,53,78,0.55);
          border: 1px solid rgba(255,255,255,0.15);
          backdrop-filter: blur(10px);
          cursor: default;
          letter-spacing: 0.04em;
        }

        @media (max-width: 900px) {
          .page { padding: calc(var(--nav-height) + 2.25rem) 1.25rem 4rem; }
          .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem; }
        }
        @media (max-width: 640px) {
          .page { padding: calc(var(--nav-height) + 1.5rem) 0.9rem 4rem; }
          .header { margin-bottom: 2.2rem; }
          .header p { font-size: 0.88rem; line-height: 1.6; }
          .filter-bar { width: 100% !important; max-width: none !important; }
          .filter-glass { width: 100%; justify-content: space-between; padding: 0.8rem 1rem; }
          .filter-glass select { min-width: 0; width: 100%; }
          .grid { grid-template-columns: 1fr; gap: 1rem; }
          .card-body { padding: 0.9rem 1rem 1rem; }
          .card-img-wrap { height: 160px; }
          .card-footer { align-items: flex-start; gap: 0.75rem; flex-direction: column; }
          .btn-add { width: 100%; }
          .cart-bubble { left: 1rem; right: 1rem; bottom: 1rem; text-align: center; padding: 0.8rem 1rem; }
        }
      `}</style>

      {/* floating petals */}
      <div className="petals-layer">
        {petals.map((s, i) => <FloatingPetal key={i} style={s} />)}
      </div>

      <div className="page">
        {/* header */}
        <motion.div
          className="header"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <p className="header-eyebrow">✦ Fresh from the garden ✦</p>
          <h2>Our <span>Premium</span> Collection</h2>
          <p>Handpicked blooms, rare bouquets & exotic arrangements — delivered fresh.</p>
          <div className="deco-line"><span className="deco-rose">🌹</span></div>
        </motion.div>

        {/* filters */}
        <motion.div
          className="filter-bar"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="filter-glass">
            <span>📍</span>
            <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)}>
              <option value="Chennai">All Chennai</option>
              <option value="Tambaram">West Tambaram</option>
              <option value="Nearby">Nearby Shops</option>
            </select>
          </div>
          <div className="filter-glass">
            <span>💐</span>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </motion.div>

        {/* category chips */}
        <motion.div
          className="chip-row"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <span className={`chip ${categoryFilter === "" ? "active" : ""}`} onClick={() => setCategoryFilter("")}>All</span>
          {categories.map(c => (
            <span
              key={c}
              className={`chip ${categoryFilter === c ? "active" : ""}`}
              onClick={() => setCategoryFilter(c)}
            >{c}</span>
          ))}
        </motion.div>

        {/* content */}
        {loading ? (
          <div className="center-msg"><span className="loading-rose">🌸</span> Gathering fresh petals…</div>
        ) : error ? (
          <div className="center-msg">⚠ {error}</div>
        ) : (
          <>
            <motion.div
              className="grid"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.09 } }
              }}
            >
              {filtered.map(product => (
                <motion.div
                  key={product.id}
                  variants={{
                    hidden: { opacity: 0, y: 35, scale: 0.95 },
                    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } }
                  }}
                >
                  <ProductCard product={product} addToCart={addToCart} />
                </motion.div>
              ))}
            </motion.div>

            {filtered.length === 0 && (
              <p className="empty">🌷 No blooms found in this category.</p>
            )}
          </>
        )}
      </div>

      {/* cart bubble */}
      {cart.length > 0 && (
        <motion.div
          className="cart-bubble"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          🛒 {cart.reduce((s, i) => s + (i.qty || 1), 0)} item{cart.reduce((s, i) => s + (i.qty || 1), 0) !== 1 ? "s" : ""}
        </motion.div>
      )}
    </>
  );
}
