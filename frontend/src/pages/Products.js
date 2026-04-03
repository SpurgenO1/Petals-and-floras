import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { getProducts } from "../services/api";
import { catalogProducts } from "../data/catalogProducts";

const CATEGORY_INTEREST_STORAGE_KEY = "pf_category_interest";
const MotionLink = motion(Link);

const CATEGORY_STYLES = {
  Roses: { start: "#f6b3c2", end: "#8f1d35", label: "Rose" },
  Carnations: { start: "#ffd8df", end: "#d95b78", label: "Carnation" },
  "Asiatic Lilies": { start: "#ffe0b3", end: "#f57c00", label: "Lily" },
  "Exotic & Novelties": { start: "#f7d06b", end: "#ef6c57", label: "Exotic" },
  Gerberas: { start: "#ffe082", end: "#f9a825", label: "Gerbera" },
  Orchids: { start: "#d7c4f3", end: "#7b1fa2", label: "Orchid" },
  "Oriental Lilies": { start: "#f8bbd0", end: "#c2185b", label: "Lily" },
  Fillers: { start: "#dcedc8", end: "#689f38", label: "Filler" },
  "Cut Foliages": { start: "#c8e6c9", end: "#2e7d32", label: "Leaf" },
  "Hybrid Chrysanthamums": { start: "#fff7bc", end: "#fbc02d", label: "Mum" },
  "Bouquet & Car Deco Materials": { start: "#d7ccc8", end: "#6d4c41", label: "Deco" },
};

function buildProductImage(product) {
  const style = CATEGORY_STYLES[product.category] || {
    start: "#f6d3da",
    end: "#a73755",
    label: "Flora",
  };
  const title = (product.name || "Catalog Item").replace(/[<&>]/g, "");

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${style.start}" />
          <stop offset="100%" stop-color="${style.end}" />
        </linearGradient>
      </defs>
      <rect width="800" height="600" rx="36" fill="url(#grad)" />
      <circle cx="650" cy="110" r="92" fill="rgba(255,255,255,0.18)" />
      <circle cx="110" cy="510" r="116" fill="rgba(255,255,255,0.12)" />
      <text x="72" y="134" fill="rgba(255,255,255,0.82)" font-family="Georgia, serif" font-size="40">${style.label}</text>
      <text x="72" y="320" fill="#ffffff" font-family="Georgia, serif" font-size="58" font-weight="700">${title}</text>
    </svg>
  `)}`;
}

function normalizeProduct(product) {
  return {
    ...product,
    price: Number(product.price || 0),
    category: product.category || "Floral",
    description: product.description || `${product.name} from our floral catalog.`,
    image: buildProductImage(product),
    isFromAdmin: Boolean(product.isFromAdmin),
  };
}

function readCategoryInterest() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(CATEGORY_INTEREST_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeCategoryInterest(nextInterest) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(CATEGORY_INTEREST_STORAGE_KEY, JSON.stringify(nextInterest));
  } catch {
    // Ignore storage failures so product browsing still works.
  }
}

function rankCategories(categories, products, interestMap, searchTerm) {
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  return [...categories].sort((leftCategory, rightCategory) => {
    const leftProducts = products.filter((product) => product.category === leftCategory);
    const rightProducts = products.filter((product) => product.category === rightCategory);
    const leftInterest = Number(interestMap[leftCategory] || 0);
    const rightInterest = Number(interestMap[rightCategory] || 0);

    if (normalizedSearchTerm) {
      const leftNameMatch = leftCategory.toLowerCase().includes(normalizedSearchTerm) ? 1 : 0;
      const rightNameMatch = rightCategory.toLowerCase().includes(normalizedSearchTerm) ? 1 : 0;

      if (leftNameMatch !== rightNameMatch) {
        return rightNameMatch - leftNameMatch;
      }
    }

    if (leftInterest !== rightInterest) {
      return rightInterest - leftInterest;
    }

    if (leftProducts.length !== rightProducts.length) {
      return rightProducts.length - leftProducts.length;
    }

    return leftCategory.localeCompare(rightCategory);
  });
}

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

function TiltCard({ children }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [12, -12]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-12, 12]), { stiffness: 200, damping: 20 });
  const glareX = useTransform(x, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(y, [-0.5, 0.5], ["0%", "100%"]);

  function onMove(event) {
    const rect = ref.current.getBoundingClientRect();
    x.set((event.clientX - rect.left) / rect.width - 0.5);
    y.set((event.clientY - rect.top) / rect.height - 0.5);
  }

  function onLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d", perspective: 800 }}
      className="tilt-wrapper"
    >
      {children}
      <motion.div
        className="glare"
        style={{
          background: `radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.28) 0%, transparent 70%)`,
        }}
      />
    </motion.div>
  );
}

function ProductCard({ product, addToCart }) {
  const [added, setAdded] = useState(false);
  const priceLabel = product.price > 0 ? `Rs ${product.price}` : "Price on request";
  const sourceLabel = product.isFromAdmin ? "Live item" : "Catalog item";

  function handleAdd() {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <TiltCard>
      <div className="card card-clickable" onClick={handleAdd}>
        <div className="card-img-wrap">
          <img src={product.image} alt={product.name} className="card-img" />
          <div className="img-overlay" />
          <span className="badge">{priceLabel}</span>
        </div>
        <div className="card-body">
          <p className="card-cat">{product.category}</p>
          <h3 className="card-title">{product.name}</h3>
          <p className="card-desc">{product.description}</p>
          <div className="card-footer">
            <span className="stock-note">{sourceLabel}</span>
            <motion.button
              type="button"
              className={`btn-add ${added ? "btn-added" : ""}`}
              whileTap={{ scale: 0.92 }}
              onClick={(event) => {
                event.stopPropagation();
                handleAdd();
              }}
            >
              {added ? "Added" : "Add to cart"}
            </motion.button>
          </div>
        </div>
      </div>
    </TiltCard>
  );
}

export default function Products({ cart = [], setCart = () => {} }) {
  const [products, setProducts] = useState(() =>
    catalogProducts.map((product) => normalizeProduct({ ...product, isFromAdmin: false }))
  );
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showCartBubble, setShowCartBubble] = useState(false);
  const [categoryInterest, setCategoryInterest] = useState(() => readCategoryInterest());
  const hasProductsRef = useRef(products.length > 0);
  const productsSignatureRef = useRef("");
  const lastFetchTimeRef = useRef(0);
  const fetchInFlightRef = useRef(false);
  const petalsRef = useRef(
    Array.from({ length: 18 }, () => ({
      left: `${Math.random() * 100}%`,
      width: `${12 + Math.random() * 18}px`,
      height: `${16 + Math.random() * 22}px`,
      duration: 7 + Math.random() * 9,
      delay: Math.random() * 10,
      filter: `hue-rotate(${Math.random() * 30 - 15}deg)`,
    }))
  );

  useEffect(() => {
    hasProductsRef.current = products.length > 0;
    productsSignatureRef.current = JSON.stringify(
      products.map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        description: product.description,
        isFromAdmin: product.isFromAdmin,
      }))
    );
  }, [products]);

  useEffect(() => {
    if (cart.length === 0) {
      setShowCartBubble(false);
      return undefined;
    }

    setShowCartBubble(true);
    const timer = window.setTimeout(() => {
      setShowCartBubble(false);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [cart]);

  const recordCategoryInterest = (category, amount = 1) => {
    if (!category) {
      return;
    }

    setCategoryInterest((current) => {
      const nextInterest = {
        ...current,
        [category]: Number(current[category] || 0) + amount,
      };
      writeCategoryInterest(nextInterest);
      return nextInterest;
    });
  };

  useEffect(() => {
    let ignore = false;

    async function loadProducts({ background = false, force = false } = {}) {
      const now = Date.now();
      const isInitialLoad = !hasProductsRef.current;

      if (fetchInFlightRef.current) {
        return;
      }

      if (!force && !isInitialLoad && now - lastFetchTimeRef.current < 60000) {
        return;
      }

      fetchInFlightRef.current = true;

      try {
        const response = await getProducts();
        if (!ignore) {
          const nextProducts = Array.isArray(response.data)
            ? response.data.map((product) => normalizeProduct({ ...product, isFromAdmin: true }))
            : [];

          const nextSignature = JSON.stringify(
            nextProducts.map((product) => ({
              id: product.id,
              name: product.name,
              category: product.category,
              price: product.price,
              description: product.description,
              isFromAdmin: product.isFromAdmin,
            }))
          );

          if (nextSignature !== productsSignatureRef.current) {
            setProducts(nextProducts);
          }

          setError(nextProducts.length > 0 ? "" : "No products found in MongoDB or Django admin.");
          lastFetchTimeRef.current = now;
        }
      } catch {
        if (!ignore) {
          if (!hasProductsRef.current) {
            setProducts(catalogProducts.map((product) => normalizeProduct({ ...product, isFromAdmin: false })));
          }
          setError(
            hasProductsRef.current
              ? "Live sync is temporarily unavailable. Current products will refresh when the backend reconnects."
              : "Showing catalog fallback. Start the backend server to load live products from MongoDB or Django admin."
          );
        }
      } finally {
        fetchInFlightRef.current = false;
      }
    }

    loadProducts({ force: true });

    function handleFocus() {
      loadProducts({ background: true });
    }

    window.addEventListener("focus", handleFocus);

    return () => {
      ignore = true;
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const addToCart = (product) => {
    recordCategoryInterest(product.category, 3);
    setCart((prev) => {
      const exists = prev.find((item) => item.id === product.id);
      return exists
        ? prev.map((item) => (item.id === product.id ? { ...item, qty: (item.qty || 1) + 1 } : item))
        : [...prev, { ...product, qty: 1 }];
    });
  };

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const searchMatchedProducts = products.filter((product) => {
    if (!normalizedSearchTerm) {
      return true;
    }

    const searchableText = [product.name, product.category, product.description]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedSearchTerm);
  });
  const categories = Array.from(new Set(searchMatchedProducts.map((product) => product.category).filter(Boolean)));
  const rankedCategories = rankCategories(categories, searchMatchedProducts, categoryInterest, searchTerm);
  const filtered = searchMatchedProducts.filter(
    (product) => !categoryFilter || product.category === categoryFilter
  );
  const visibleCategories = categoryFilter
    ? [
        categoryFilter,
        ...rankedCategories.filter((category) => category !== categoryFilter).slice(0, 4),
      ]
    : rankedCategories.slice(0, 5);
  const petals = petalsRef.current;

  useEffect(() => {
    if (categoryFilter && !categories.includes(categoryFilter)) {
      setCategoryFilter("");
    }
  }, [categories, categoryFilter]);

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .section-padding { background: transparent !important; }
        .filter-bar, .filter-group { background: transparent !important; background-color: transparent !important; border: none !important; box-shadow: none !important; }

        :root {
          --rose-deep: #7b1a2e;
          --rose-mid: #c0354e;
          --rose-light: #f1a0b0;
          --rose-petal: #e8536d;
          --glass-bg: rgba(255,255,255,0.08);
          --glass-border: rgba(255,255,255,0.22);
        }

        body { font-family: 'Jost', sans-serif; }

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

        .page::before {
          content: "";
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E");
          opacity: 0.5;
        }

        .petals-layer { position: fixed; inset: 0; pointer-events: none; z-index: 1; }
        .petal {
          position: absolute;
          top: -60px;
          background: radial-gradient(ellipse at 40% 30%, #f8b4c0, #c0354e 60%, #7b1a2e);
          border-radius: 0 80% 0 80%;
          opacity: 0.55;
          will-change: transform;
        }

        .header { position: relative; z-index: 10; text-align: center; margin-bottom: 3rem; }
        .header-eyebrow {
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
          color: rgba(255,255,255,0.78);
          font-size: 0.95rem;
          margin-top: 0.8rem;
          font-weight: 300;
          letter-spacing: 0.04em;
        }
        .deco-line {
          display: flex;
          align-items: center;
          gap: 1rem;
          justify-content: center;
          margin-top: 1.5rem;
        }
        .deco-line::before, .deco-line::after {
          content: "";
          flex: 0 0 80px;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--rose-mid));
        }
        .deco-line::after { background: linear-gradient(90deg, var(--rose-mid), transparent); }

        .filter-bar {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          justify-content: center;
          margin-bottom: 2rem;
          position: relative;
          z-index: 10;
        }
        .filter-glass {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.65rem 1.15rem;
          background: rgba(60, 5, 20, 0.55);
          border: 1px solid rgba(255,255,255,0.18);
          backdrop-filter: blur(20px) saturate(1.8);
          border-radius: 999px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.08) inset;
        }
        .filter-glass select {
          background: transparent;
          border: none;
          outline: none;
          color: rgba(255,255,255,0.9);
          font-family: 'Jost', sans-serif;
          font-size: 0.9rem;
          cursor: pointer;
          min-width: 160px;
        }
        .filter-glass select option {
          background: #2d0616;
          color: #fff;
        }
        .search-glass {
          display: flex;
          align-items: center;
          width: min(560px, 100%);
          padding: 0.2rem 0.35rem 0.2rem 1rem;
          background: rgba(60, 5, 20, 0.55);
          border: 1px solid rgba(255,255,255,0.18);
          backdrop-filter: blur(20px) saturate(1.8);
          border-radius: 999px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.08) inset;
        }
        .search-input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          color: rgba(255,255,255,0.92);
          font-family: 'Jost', sans-serif;
          font-size: 0.95rem;
          padding: 0.8rem 0.75rem 0.8rem 0;
        }
        .search-input::placeholder {
          color: rgba(255,255,255,0.64);
        }

        .chip-row {
          display: flex;
          gap: 0.6rem;
          flex-wrap: wrap;
          justify-content: center;
          margin-bottom: 2.5rem;
          position: relative;
          z-index: 10;
        }
        .chip {
          appearance: none;
          padding: 0.42rem 1.1rem;
          border-radius: 999px;
          font-size: 0.8rem;
          letter-spacing: 0.06em;
          border: 1px solid var(--glass-border);
          background: var(--glass-bg);
          color: rgba(255,255,255,0.72);
          cursor: pointer;
          backdrop-filter: blur(10px);
          transition: all 0.25s;
        }
        .chip:focus-visible,
        .btn-add:focus-visible,
        .search-input:focus-visible,
        .filter-glass select:focus-visible {
          outline: 3px solid rgba(255, 183, 204, 0.78);
          outline-offset: 2px;
        }
        .chip:hover, .chip.active {
          background: linear-gradient(135deg, var(--rose-mid), var(--rose-deep));
          border-color: var(--rose-petal);
          color: #fff;
          box-shadow: 0 4px 20px rgba(192,53,78,0.4);
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 2rem;
          position: relative;
          z-index: 10;
          max-width: 1300px;
          margin: 0 auto;
        }
        .tilt-wrapper {
          position: relative;
          border-radius: 20px;
          transform-style: preserve-3d;
        }
        .glare {
          position: absolute;
          inset: 0;
          border-radius: 20px;
          pointer-events: none;
          z-index: 5;
          transition: background 0.05s;
        }
        .card {
          height: 100%;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.15);
          backdrop-filter: blur(20px) saturate(1.8);
          border-radius: 20px;
          overflow: hidden;
          box-shadow:
            0 2px 0 rgba(255,255,255,0.08) inset,
            0 20px 60px rgba(0,0,0,0.45),
            0 4px 20px rgba(192,53,78,0.2);
          transition: box-shadow 0.3s, transform 0.2s, border-color 0.2s;
        }
        .card-clickable {
          cursor: pointer;
          outline: none;
        }
        .tilt-wrapper:hover .card {
          box-shadow:
            0 2px 0 rgba(255,255,255,0.12) inset,
            0 30px 70px rgba(0,0,0,0.55),
            0 8px 35px rgba(192,53,78,0.45);
        }
        .card-clickable:focus-visible {
          border-color: rgba(255, 183, 204, 0.95);
          box-shadow:
            0 0 0 3px rgba(255, 183, 204, 0.25),
            0 20px 60px rgba(0,0,0,0.45),
            0 4px 20px rgba(192,53,78,0.2);
        }
        .card-img-wrap {
          position: relative;
          overflow: hidden;
          height: 220px;
        }
        .card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .tilt-wrapper:hover .card-img { transform: scale(1.08); }
        .img-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 35%, rgba(20,0,8,0.65) 100%);
        }
        .badge {
          position: absolute;
          bottom: 12px;
          right: 14px;
          background: linear-gradient(135deg, var(--rose-mid), var(--rose-deep));
          color: #fff;
          font-family: 'Cormorant Garamond', serif;
          font-weight: 700;
          font-size: 1.05rem;
          padding: 0.25rem 0.85rem;
          border-radius: 999px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        }
        .card-body {
          display: flex;
          flex-direction: column;
          height: calc(100% - 220px);
          padding: 1.2rem 1.4rem 1.4rem;
          transform: translateZ(30px);
        }
        .card-cat {
          font-size: 0.72rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--rose-light);
          margin-bottom: 0.45rem;
        }
        .card-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.35rem;
          font-weight: 600;
          color: #fff;
          line-height: 1.25;
          margin-bottom: 0.8rem;
        }
        .card-desc {
          color: rgba(255,255,255,0.72);
          font-size: 0.92rem;
          line-height: 1.55;
          margin-bottom: 1rem;
          flex: 1;
        }
        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .stock-note {
          color: rgba(255,255,255,0.74);
          font-size: 0.8rem;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .btn-add {
          padding: 0.48rem 1.15rem;
          border-radius: 999px;
          border: 1px solid var(--rose-petal);
          background: transparent;
          color: var(--rose-light);
          font-family: 'Jost', sans-serif;
          font-size: 0.84rem;
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

        .center-msg {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          color: rgba(255,255,255,0.65);
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.45rem;
          letter-spacing: 0.06em;
          position: relative;
          z-index: 10;
        }
        .sync-banner {
          max-width: 1300px;
          margin: 0 auto 1.25rem;
          padding: 0.85rem 1rem;
          border-radius: 16px;
          position: relative;
          z-index: 10;
          color: #fff0d9;
          background: rgba(128, 73, 15, 0.28);
          border: 1px solid rgba(255, 193, 94, 0.24);
          backdrop-filter: blur(12px);
          font-size: 0.92rem;
          line-height: 1.5;
        }
        .empty {
          text-align: center;
          color: rgba(255,255,255,0.4);
          padding: 3rem 0;
          font-size: 1rem;
          letter-spacing: 0.08em;
          position: relative;
          z-index: 10;
        }
        .cart-bubble {
          position: fixed;
          bottom: 6.75rem;
          right: 2rem;
          z-index: 100;
          background: linear-gradient(135deg, var(--rose-mid), var(--rose-deep));
          color: #fff;
          border-radius: 999px;
          padding: 0.7rem 1.4rem;
          font-size: 0.92rem;
          font-weight: 500;
          box-shadow: 0 8px 30px rgba(192,53,78,0.55);
          border: 1px solid rgba(255,255,255,0.15);
          backdrop-filter: blur(10px);
          text-decoration: none;
          cursor: pointer;
        }
        .cart-bubble:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 34px rgba(192,53,78,0.6);
        }

        @media (max-width: 900px) {
          .page { padding: calc(var(--nav-height) + 2.25rem) 1.25rem 4rem; }
          .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem; }
        }
        @media (max-width: 640px) {
          .page { padding: calc(var(--nav-height) + 1.5rem) 0.9rem 4rem; }
          .header { margin-bottom: 2.2rem; }
          .header p { font-size: 0.88rem; line-height: 1.6; }
          .search-glass { width: 100%; }
          .filter-glass { width: 100%; justify-content: space-between; padding: 0.8rem 1rem; }
          .filter-glass select { min-width: 0; width: 100%; }
          .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.8rem; }
          .card-body { height: auto; padding: 0.8rem; }
          .card-img-wrap { height: 148px; }
          .badge { right: 10px; bottom: 10px; font-size: 0.82rem; padding: 0.22rem 0.65rem; }
          .card-cat { font-size: 0.58rem; letter-spacing: 0.14em; margin-bottom: 0.3rem; }
          .card-title { font-size: 1rem; margin-bottom: 0.45rem; }
          .card-desc {
            font-size: 0.78rem;
            line-height: 1.4;
            margin-bottom: 0.7rem;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .stock-note { font-size: 0.64rem; }
          .btn-add { padding: 0.45rem 0.75rem; font-size: 0.72rem; }
          .card-footer { flex-direction: column; align-items: stretch; }
          .btn-add { width: 100%; }
          .cart-bubble { left: 1rem; right: 1rem; bottom: 5.75rem; text-align: center; }
        }

        @media (max-width: 420px) {
          .page { padding: calc(var(--nav-height) + 1.2rem) 0.7rem 4rem; }
          .grid { gap: 0.65rem; }
          .card-img-wrap { height: 132px; }
          .card-body { padding: 0.72rem; }
          .card-title { font-size: 0.92rem; }
          .card-desc { font-size: 0.74rem; }
          .badge { font-size: 0.74rem; padding: 0.2rem 0.55rem; }
        }
      `}</style>

      <div className="petals-layer">
        {petals.map((style, index) => <FloatingPetal key={index} style={style} />)}
      </div>

      <div className="page">
        <motion.div
          className="header"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <p className="header-eyebrow">Fresh from the catalog</p>
          <h2>Our <span>Shop</span> Collection</h2>
          <div className="deco-line" />
        </motion.div>

        <motion.div
          className="filter-bar"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="search-glass">
            <input
              type="search"
              className="search-input"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search flowers, category, or product name"
              aria-label="Search products"
            />
          </div>
          <div className="filter-glass">
            <span>Category</span>
            <select
              aria-label="Filter products by category"
              value={categoryFilter}
              onChange={(event) => {
                const nextCategory = event.target.value;
                setCategoryFilter(nextCategory);
                recordCategoryInterest(nextCategory, 2);
              }}
            >
              <option value="">All Categories</option>
              {rankedCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        <motion.div
          className="chip-row"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <button
            type="button"
            className={`chip ${categoryFilter === "" ? "active" : ""}`}
            onClick={() => setCategoryFilter("")}
          >
            All
          </button>
          {visibleCategories.map((category) => (
            <button
              type="button"
              key={category}
              className={`chip ${categoryFilter === category ? "active" : ""}`}
              onClick={() => {
                setCategoryFilter(category);
                recordCategoryInterest(category, 2);
              }}
            >
              {category}
            </button>
          ))}
        </motion.div>

        {error && products.length > 0 && (
          <div className="sync-banner">{error}</div>
        )}

        {error && products.length === 0 ? (
          <div className="center-msg">{error}</div>
        ) : (
          <>
            <motion.div
              className="grid"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.08 } },
              }}
            >
              {filtered.map((product) => (
                <motion.div
                  key={product.id}
                  onClick={() => recordCategoryInterest(product.category, 1)}
                  variants={{
                    hidden: { opacity: 0, y: 35, scale: 0.95 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
                    },
                  }}
                >
                  <ProductCard product={product} addToCart={addToCart} />
                </motion.div>
              ))}
            </motion.div>

            {filtered.length === 0 && (
              <p className="empty">
                {normalizedSearchTerm
                  ? "No products match your search."
                  : "No products found in this category."}
              </p>
            )}
          </>
        )}
      </div>

      {cart.length > 0 && showCartBubble && (
        <MotionLink
          className="cart-bubble"
          to="/cart"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
          whileTap={{ scale: 0.97 }}
          aria-label={`Go to cart with ${cart.reduce((sum, item) => sum + (item.qty || 1), 0)} items`}
        >
          Cart: {cart.reduce((sum, item) => sum + (item.qty || 1), 0)} item
          {cart.reduce((sum, item) => sum + (item.qty || 1), 0) !== 1 ? "s" : ""}
        </MotionLink>
      )}
    </>
  );
}
