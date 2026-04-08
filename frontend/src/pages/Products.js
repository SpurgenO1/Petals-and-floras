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
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CATEGORY_INTEREST_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeCategoryInterest(nextInterest) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CATEGORY_INTEREST_STORAGE_KEY, JSON.stringify(nextInterest));
  } catch {}
}

function rankCategories(categories, products, interestMap, searchTerm) {
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  return [...categories].sort((leftCategory, rightCategory) => {
    const leftProducts = products.filter((p) => p.category === leftCategory);
    const rightProducts = products.filter((p) => p.category === rightCategory);
    const leftInterest = Number(interestMap[leftCategory] || 0);
    const rightInterest = Number(interestMap[rightCategory] || 0);

    if (normalizedSearchTerm) {
      const leftNameMatch = leftCategory.toLowerCase().includes(normalizedSearchTerm) ? 1 : 0;
      const rightNameMatch = rightCategory.toLowerCase().includes(normalizedSearchTerm) ? 1 : 0;
      if (leftNameMatch !== rightNameMatch) return rightNameMatch - leftNameMatch;
    }
    if (leftInterest !== rightInterest) return rightInterest - leftInterest;
    if (leftProducts.length !== rightProducts.length) return rightProducts.length - leftProducts.length;
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
  const allowTilt =
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function onMove(event) {
    if (!allowTilt) return;
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
      onMouseMove={allowTilt ? onMove : undefined}
      onMouseLeave={allowTilt ? onLeave : undefined}
      style={{
        rotateX: allowTilt ? rotateX : 0,
        rotateY: allowTilt ? rotateY : 0,
        transformStyle: "preserve-3d",
        perspective: 800,
      }}
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
              {added ? "Added ✓" : "Add to cart"}
            </motion.button>
          </div>
        </div>
      </div>
    </TiltCard>
  );
}

// ─── Price Range Slider ───────────────────────────────────────────────────────
function PriceRangeDropdown({ minPrice, maxPrice, minVal, maxVal, onMinChange, onMaxChange, onClose }) {
  const MAX = maxPrice || 5000;
  const MIN = minPrice || 0;

  return (
    <div className="dropdown-panel price-panel">
      <div className="price-histogram-mock" />
      <div className="price-slider-row">
        <span className="price-label">₹ {Number(minVal) || MIN}</span>
        <span className="price-label">₹ {Number(maxVal) || MAX}+</span>
      </div>
      <div className="price-inputs-row">
        <div className="price-field">
          <span className="price-field-label">Minimum</span>
          <input
            type="number"
            min={MIN}
            max={MAX}
            className="price-input"
            placeholder={String(MIN)}
            value={minVal}
            onChange={(e) => onMinChange(e.target.value)}
          />
        </div>
        <div className="price-field">
          <span className="price-field-label">Maximum</span>
          <input
            type="number"
            min={MIN}
            max={MAX}
            className="price-input"
            placeholder={String(MAX)}
            value={maxVal}
            onChange={(e) => onMaxChange(e.target.value)}
          />
        </div>
      </div>
      <button className="apply-btn" onClick={onClose}>Apply</button>
    </div>
  );
}

export default function Products({ cart = [], setCart = () => {} }) {
  const [products, setProducts] = useState(() =>
    catalogProducts.map((product) => normalizeProduct({ ...product, isFromAdmin: false }))
  );
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortOption, setSortOption] = useState("recommended");
  const [minPriceFilter, setMinPriceFilter] = useState("");
  const [maxPriceFilter, setMaxPriceFilter] = useState("");
  const [showCartBubble, setShowCartBubble] = useState(false);
  const [categoryInterest, setCategoryInterest] = useState(() => readCategoryInterest());
  const [isCompactView, setIsCompactView] = useState(false);
  // Dropdown states
  const [openDropdown, setOpenDropdown] = useState(null); // 'price' | 'category' | 'sort' | null
  const hasProductsRef = useRef(products.length > 0);
  const productsSignatureRef = useRef("");
  const lastFetchTimeRef = useRef(0);
  const fetchInFlightRef = useRef(false);
  const filterBarRef = useRef(null);
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

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const compactQuery = window.matchMedia("(max-width: 640px), (prefers-reduced-motion: reduce)");
    const syncCompactView = () => setIsCompactView(compactQuery.matches);
    syncCompactView();
    compactQuery.addEventListener("change", syncCompactView);
    return () => compactQuery.removeEventListener("change", syncCompactView);
  }, []);

  useEffect(() => {
    hasProductsRef.current = products.length > 0;
    productsSignatureRef.current = JSON.stringify(
      products.map((p) => ({ id: p.id, name: p.name, category: p.category, price: p.price, description: p.description, isFromAdmin: p.isFromAdmin }))
    );
  }, [products]);

  useEffect(() => {
    if (cart.length === 0) { setShowCartBubble(false); return undefined; }
    setShowCartBubble(true);
    const timer = window.setTimeout(() => setShowCartBubble(false), 5000);
    return () => window.clearTimeout(timer);
  }, [cart]);

  const recordCategoryInterest = (category, amount = 1) => {
    if (!category) return;
    setCategoryInterest((current) => {
      const nextInterest = { ...current, [category]: Number(current[category] || 0) + amount };
      writeCategoryInterest(nextInterest);
      return nextInterest;
    });
  };

  useEffect(() => {
    let ignore = false;
    async function loadProducts({ force = false } = {}) {
      const now = Date.now();
      const isInitialLoad = !hasProductsRef.current;
      if (fetchInFlightRef.current) return;
      if (!force && !isInitialLoad && now - lastFetchTimeRef.current < 60000) return;
      fetchInFlightRef.current = true;
      try {
        const response = await getProducts();
        if (!ignore) {
          const nextProducts = Array.isArray(response.data)
            ? response.data.map((p) => normalizeProduct({ ...p, isFromAdmin: true }))
            : [];
          const nextSignature = JSON.stringify(nextProducts.map((p) => ({ id: p.id, name: p.name, category: p.category, price: p.price, description: p.description, isFromAdmin: p.isFromAdmin })));
          if (nextSignature !== productsSignatureRef.current) setProducts(nextProducts);
          setError(nextProducts.length > 0 ? "" : "No products found in MongoDB or Django admin.");
          lastFetchTimeRef.current = now;
        }
      } catch {
        if (!ignore) {
          if (!hasProductsRef.current) setProducts(catalogProducts.map((p) => normalizeProduct({ ...p, isFromAdmin: false })));
          setError(hasProductsRef.current
            ? "Live sync is temporarily unavailable. Current products will refresh when the backend reconnects."
            : "Showing catalog fallback. Start the backend server to load live products from MongoDB or Django admin."
          );
        }
      } finally {
        fetchInFlightRef.current = false;
      }
    }
    loadProducts({ force: true });
    function handleFocus() { loadProducts({ background: true }); }
    window.addEventListener("focus", handleFocus);
    return () => { ignore = true; window.removeEventListener("focus", handleFocus); };
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
  const normalizedMinPrice = Number(minPriceFilter || 0);
  const normalizedMaxPrice = Number(maxPriceFilter || 0);

  const searchMatchedProducts = products.filter((product) => {
    if (!normalizedSearchTerm) return true;
    const searchableText = [product.name, product.category, product.description].filter(Boolean).join(" ").toLowerCase();
    return searchableText.includes(normalizedSearchTerm);
  });

  const categories = Array.from(new Set(searchMatchedProducts.map((p) => p.category).filter(Boolean)));
  const rankedCategories = rankCategories(categories, searchMatchedProducts, categoryInterest, searchTerm);

  const filtered = searchMatchedProducts
    .filter((p) => !categoryFilter || p.category === categoryFilter)
    .filter((p) => Number(p.price || 0) >= normalizedMinPrice)
    .filter((p) => !normalizedMaxPrice || Number(p.price || 0) <= normalizedMaxPrice)
    .sort((left, right) => {
      if (sortOption === "price-low-high") return Number(left.price || 0) - Number(right.price || 0);
      if (sortOption === "price-high-low") return Number(right.price || 0) - Number(left.price || 0);
      if (sortOption === "name-a-z") return String(left.name || "").localeCompare(String(right.name || ""));
      if (sortOption === "newest") return Number(right.id || 0) - Number(left.id || 0);
      const ri = Number(categoryInterest[right.category] || 0);
      const li = Number(categoryInterest[left.category] || 0);
      if (ri !== li) return ri - li;
      return String(left.name || "").localeCompare(String(right.name || ""));
    });

  const petals = isCompactView ? petalsRef.current.slice(0, 5) : petalsRef.current;

  const hasActiveFilters = categoryFilter || minPriceFilter || maxPriceFilter || searchTerm;
  const sortLabel = {
    recommended: "Recommended",
    newest: "Newest",
    "name-a-z": "Name A–Z",
    "price-low-high": "Price ↑",
    "price-high-low": "Price ↓",
  }[sortOption];

  useEffect(() => {
    if (categoryFilter && !categories.includes(categoryFilter)) setCategoryFilter("");
  }, [categories, categoryFilter]);

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

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
          padding: calc(var(--nav-height) + 2rem) 2rem 5rem;
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

        /* ── Header ── */
        .header { position: relative; z-index: 10; text-align: center; margin-bottom: 2rem; }
        .header-eyebrow {
          font-weight: 300; letter-spacing: 0.35em; font-size: 0.72rem;
          color: var(--rose-light); text-transform: uppercase; margin-bottom: 0.75rem;
        }
        .header h2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(2.4rem, 5vw, 4rem);
          font-weight: 700; color: #fff; line-height: 1.1;
          text-shadow: 0 2px 30px rgba(192,53,78,0.5);
        }
        .header h2 span { color: var(--rose-petal); }
        .deco-line {
          display: flex; align-items: center; gap: 1rem; justify-content: center; margin-top: 1.5rem;
        }
        .deco-line::before, .deco-line::after {
          content: ""; flex: 0 0 80px; height: 1px;
          background: linear-gradient(90deg, transparent, var(--rose-mid));
        }
        .deco-line::after { background: linear-gradient(90deg, var(--rose-mid), transparent); }

        /* ── Catalog shell — now full width, no sidebar ── */
        .catalog-shell {
          max-width: 1360px;
          margin: 0 auto;
          position: relative;
          z-index: 10;
        }

        /* ── Top filter bar (inspired by the reference screenshot) ── */
        .filter-bar-wrap {
          position: relative;
          z-index: 20;
          margin-bottom: 1.5rem;
        }
        .filter-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          padding: 0.85rem 1.25rem;
          border-radius: 20px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.14);
          backdrop-filter: blur(22px) saturate(1.8);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }

        /* Results count */
        .results-count {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.05rem;
          color: rgba(255,255,255,0.9);
          white-space: nowrap;
          margin-right: 0.25rem;
        }
        .results-count strong { color: var(--rose-petal); font-weight: 600; }

        .filter-divider {
          width: 1px; height: 24px;
          background: rgba(255,255,255,0.15);
          flex-shrink: 0;
        }

        /* Search pill */
        .search-pill {
          display: flex; align-items: center; gap: 0.5rem;
          flex: 1; min-width: 160px; max-width: 280px;
          padding: 0.52rem 1rem;
          background: rgba(60, 5, 20, 0.5);
          border: 1px solid rgba(255,255,255,0.16);
          border-radius: 999px;
          backdrop-filter: blur(10px);
        }
        .search-pill svg { flex-shrink: 0; opacity: 0.6; }
        .search-pill input {
          border: none; outline: none; background: transparent;
          color: rgba(255,255,255,0.92); font-family: 'Jost', sans-serif;
          font-size: 0.875rem; width: 100%;
        }
        .search-pill input::placeholder { color: rgba(255,255,255,0.5); }

        /* Filter buttons */
        .filter-btn {
          display: flex; align-items: center; gap: 0.45rem;
          padding: 0.52rem 1rem;
          background: rgba(60, 5, 20, 0.5);
          border: 1px solid rgba(255,255,255,0.16);
          border-radius: 999px;
          color: rgba(255,255,255,0.85);
          font-family: 'Jost', sans-serif; font-size: 0.875rem;
          cursor: pointer; white-space: nowrap;
          backdrop-filter: blur(10px);
          transition: all 0.2s;
          position: relative;
        }
        .filter-btn:hover {
          border-color: var(--rose-petal);
          color: #fff;
          background: rgba(192,53,78,0.2);
        }
        .filter-btn.active-filter {
          background: linear-gradient(135deg, rgba(192,53,78,0.5), rgba(123,26,46,0.6));
          border-color: var(--rose-petal);
          color: #fff;
        }
        .filter-btn .chevron {
          font-size: 0.7rem; opacity: 0.7; margin-left: 2px;
          transition: transform 0.2s;
        }
        .filter-btn.open .chevron { transform: rotate(180deg); }

        /* Active dot indicator */
        .active-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--rose-petal);
          flex-shrink: 0;
        }

        /* Sort select — styled as pill */
        .sort-pill {
          display: flex; align-items: center; gap: 0.45rem;
          padding: 0.52rem 1rem;
          background: rgba(60, 5, 20, 0.5);
          border: 1px solid rgba(255,255,255,0.16);
          border-radius: 999px;
          backdrop-filter: blur(10px);
          position: relative;
        }
        .sort-pill label { color: rgba(255,255,255,0.55); font-size: 0.8rem; white-space: nowrap; }
        .sort-pill select {
          background: transparent; border: none; outline: none;
          color: rgba(255,255,255,0.9); font-family: 'Jost', sans-serif;
          font-size: 0.875rem; cursor: pointer; padding-right: 0.25rem;
        }
        .sort-pill select option { background: #2d0616; color: #fff; }

        /* Clear all */
        .clear-btn {
          display: flex; align-items: center; gap: 0.35rem;
          padding: 0.52rem 0.9rem;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 999px;
          color: rgba(255,255,255,0.5);
          font-family: 'Jost', sans-serif; font-size: 0.8rem;
          cursor: pointer; white-space: nowrap;
          transition: all 0.2s;
        }
        .clear-btn:hover { border-color: var(--rose-petal); color: var(--rose-light); }

        /* ── Dropdowns ── */
        .dropdown-panel {
          position: absolute;
          top: calc(100% + 0.5rem);
          left: 0;
          min-width: 240px;
          padding: 1.25rem;
          background: rgba(20, 2, 10, 0.92);
          border: 1px solid rgba(255,255,255,0.16);
          border-radius: 18px;
          backdrop-filter: blur(28px) saturate(2);
          box-shadow: 0 20px 60px rgba(0,0,0,0.6);
          z-index: 100;
        }

        /* Category dropdown */
        .cat-list {
          display: flex; flex-direction: column; gap: 0.15rem;
          max-height: 320px; overflow-y: auto;
        }
        .cat-list::-webkit-scrollbar { width: 4px; }
        .cat-list::-webkit-scrollbar-track { background: transparent; }
        .cat-list::-webkit-scrollbar-thumb { background: rgba(192,53,78,0.4); border-radius: 4px; }
        .cat-option {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.55rem 0.75rem;
          border-radius: 10px;
          color: rgba(255,255,255,0.8);
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.15s;
          border: none; background: transparent; width: 100%; text-align: left;
          font-family: 'Jost', sans-serif;
        }
        .cat-option:hover { background: rgba(255,255,255,0.07); color: #fff; }
        .cat-option.selected {
          background: linear-gradient(135deg, rgba(192,53,78,0.4), rgba(123,26,46,0.5));
          color: #fff;
        }
        .cat-count {
          font-size: 0.75rem; color: rgba(255,255,255,0.4);
          background: rgba(255,255,255,0.08);
          padding: 0.1rem 0.5rem; border-radius: 999px;
        }

        /* Price panel */
        .price-panel { min-width: 280px; }
        .price-slider-row {
          display: flex; justify-content: space-between;
          margin-bottom: 1rem;
        }
        .price-label { font-size: 0.85rem; color: rgba(255,255,255,0.7); }
        .price-inputs-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem; }
        .price-field { display: flex; flex-direction: column; gap: 0.3rem; }
        .price-field-label { font-size: 0.72rem; color: rgba(255,255,255,0.5); letter-spacing: 0.05em; text-transform: uppercase; }
        .price-input {
          width: 100%; padding: 0.6rem 0.75rem;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 12px; color: #fff;
          font-family: 'Jost', sans-serif; font-size: 0.9rem; outline: none;
          transition: border-color 0.2s;
        }
        .price-input:focus { border-color: var(--rose-petal); }
        .apply-btn {
          width: 100%; padding: 0.65rem;
          background: linear-gradient(135deg, var(--rose-mid), var(--rose-deep));
          border: none; border-radius: 12px; color: #fff;
          font-family: 'Jost', sans-serif; font-size: 0.9rem;
          cursor: pointer; transition: opacity 0.2s;
        }
        .apply-btn:hover { opacity: 0.88; }

        /* ── Active filter chips (below bar) ── */
        .active-chips {
          display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.25rem;
        }
        .active-chip {
          display: flex; align-items: center; gap: 0.4rem;
          padding: 0.3rem 0.75rem;
          background: rgba(192,53,78,0.25);
          border: 1px solid rgba(232,83,109,0.4);
          border-radius: 999px;
          color: var(--rose-light);
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .active-chip:hover { background: rgba(192,53,78,0.4); color: #fff; }
        .active-chip .x { font-size: 0.9rem; opacity: 0.7; }

        /* ── Grid ── */
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 2rem;
        }

        /* ── Cards (unchanged) ── */
        .tilt-wrapper { position: relative; border-radius: 20px; transform-style: preserve-3d; }
        .glare { position: absolute; inset: 0; border-radius: 20px; pointer-events: none; z-index: 5; transition: background 0.05s; }
        .card {
          height: 100%;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.15);
          backdrop-filter: blur(20px) saturate(1.8);
          border-radius: 20px; overflow: hidden;
          box-shadow: 0 2px 0 rgba(255,255,255,0.08) inset, 0 20px 60px rgba(0,0,0,0.45), 0 4px 20px rgba(192,53,78,0.2);
          transition: box-shadow 0.3s, transform 0.2s, border-color 0.2s;
        }
        .card-clickable { cursor: pointer; outline: none; }
        .tilt-wrapper:hover .card {
          box-shadow: 0 2px 0 rgba(255,255,255,0.12) inset, 0 30px 70px rgba(0,0,0,0.55), 0 8px 35px rgba(192,53,78,0.45);
        }
        .card-clickable:focus-visible {
          border-color: rgba(255, 183, 204, 0.95);
          box-shadow: 0 0 0 3px rgba(255, 183, 204, 0.25), 0 20px 60px rgba(0,0,0,0.45), 0 4px 20px rgba(192,53,78,0.2);
        }
        .card-img-wrap { position: relative; overflow: hidden; height: 220px; }
        .card-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
        .tilt-wrapper:hover .card-img { transform: scale(1.08); }
        .img-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 35%, rgba(20,0,8,0.65) 100%); }
        .badge {
          position: absolute; bottom: 12px; right: 14px;
          background: linear-gradient(135deg, var(--rose-mid), var(--rose-deep));
          color: #fff; font-family: 'Cormorant Garamond', serif; font-weight: 700; font-size: 1.05rem;
          padding: 0.25rem 0.85rem; border-radius: 999px; box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        }
        .card-body {
          display: flex; flex-direction: column; height: calc(100% - 220px);
          padding: 1.2rem 1.4rem 1.4rem; transform: translateZ(30px);
        }
        .card-cat { font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--rose-light); margin-bottom: 0.45rem; }
        .card-title { font-family: 'Cormorant Garamond', serif; font-size: 1.35rem; font-weight: 600; color: #fff; line-height: 1.25; margin-bottom: 0.8rem; }
        .card-desc { color: rgba(255,255,255,0.72); font-size: 0.92rem; line-height: 1.55; margin-bottom: 1rem; flex: 1; }
        .card-footer { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
        .stock-note { color: rgba(255,255,255,0.74); font-size: 0.8rem; letter-spacing: 0.05em; text-transform: uppercase; }
        .btn-add {
          padding: 0.48rem 1.15rem; border-radius: 999px;
          border: 1px solid var(--rose-petal); background: transparent; color: var(--rose-light);
          font-family: 'Jost', sans-serif; font-size: 0.84rem; letter-spacing: 0.06em; cursor: pointer; transition: all 0.25s;
        }
        .btn-add:hover { background: linear-gradient(135deg, var(--rose-mid), var(--rose-deep)); color: #fff; box-shadow: 0 4px 18px rgba(192,53,78,0.5); border-color: transparent; }
        .btn-added { background: linear-gradient(135deg, #2d7a4f, #1f5c39); border-color: transparent; color: #fff; }
        .btn-add:focus-visible, .search-pill input:focus-visible, .price-input:focus-visible { outline: 3px solid rgba(255, 183, 204, 0.78); outline-offset: 2px; }

        .center-msg { display: flex; align-items: center; justify-content: center; min-height: 60vh; color: rgba(255,255,255,0.65); font-family: 'Cormorant Garamond', serif; font-size: 1.45rem; letter-spacing: 0.06em; position: relative; z-index: 10; }
        .sync-banner { padding: 0.85rem 1rem; border-radius: 16px; position: relative; z-index: 10; color: #fff0d9; background: rgba(128, 73, 15, 0.28); border: 1px solid rgba(255, 193, 94, 0.24); backdrop-filter: blur(12px); font-size: 0.92rem; line-height: 1.5; margin-bottom: 1.25rem; }
        .empty { text-align: center; color: rgba(255,255,255,0.4); padding: 3rem 0; font-size: 1rem; letter-spacing: 0.08em; }
        .cart-bubble {
          position: fixed; bottom: 6.75rem; right: 2rem; z-index: 100;
          background: linear-gradient(135deg, var(--rose-mid), var(--rose-deep));
          color: #fff; border-radius: 999px; padding: 0.7rem 1.4rem; font-size: 0.92rem; font-weight: 500;
          box-shadow: 0 8px 30px rgba(192,53,78,0.55); border: 1px solid rgba(255,255,255,0.15);
          backdrop-filter: blur(10px); text-decoration: none; cursor: pointer;
        }
        .cart-bubble:hover { transform: translateY(-1px); box-shadow: 0 12px 34px rgba(192,53,78,0.6); }

        @media (max-width: 768px) {
          .page { padding: calc(var(--nav-height) + 1.5rem) 1rem 4rem; }
          .filter-bar { gap: 0.5rem; padding: 0.7rem 1rem; }
          .results-count, .filter-divider { display: none; }
          .search-pill { max-width: none; flex: 1; }
          .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem; }
        }
        @media (max-width: 640px) {
          .page { padding: calc(var(--nav-height) + 1.2rem) 0.75rem 4rem; }
          .grid { grid-template-columns: 1fr; gap: 0.95rem; }
          .card-body { height: auto; padding: 1rem; }
          .card-img-wrap { height: 180px; }
          .card-cat { font-size: 0.62rem; }
          .card-title { font-size: 1.08rem; }
          .card-desc { font-size: 0.82rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
          .card-footer { flex-direction: column; align-items: stretch; }
          .btn-add { width: 100%; }
          .cart-bubble { left: 1rem; right: 1rem; bottom: 5.75rem; text-align: center; }
          .dropdown-panel { position: fixed; left: 0.75rem; right: 0.75rem; top: auto; min-width: unset; }
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

        <div className="catalog-shell">
          {/* ── Horizontal Filter Bar ── */}
          <div className="filter-bar-wrap" ref={filterBarRef}>
            <div className="filter-bar">
              {/* Results count */}
              <span className="results-count">
                <strong>{filtered.length}</strong> of {products.length} gifts
              </span>
              <div className="filter-divider" />

              {/* Search */}
              <div className="search-pill">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <circle cx="9" cy="9" r="6" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5"/>
                  <path d="M13.5 13.5L17 17" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search flowers, categories…"
                  aria-label="Search products"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", padding: "0", lineHeight: 1 }}
                  >✕</button>
                )}
              </div>

              {/* Price filter */}
              <div 
                style={{ position: "relative" }}
                onMouseEnter={() => setOpenDropdown("price")}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button
                  className={`filter-btn ${openDropdown === "price" ? "open" : ""} ${(minPriceFilter || maxPriceFilter) ? "active-filter" : ""}`}
                  onClick={() => setOpenDropdown(openDropdown === "price" ? null : "price")}
                >
                  {(minPriceFilter || maxPriceFilter) && <span className="active-dot" />}
                  Price
                  {minPriceFilter || maxPriceFilter
                    ? `: ₹${minPriceFilter || 0}–${maxPriceFilter || "any"}`
                    : ""}
                  <span className="chevron">▼</span>
                </button>
                {openDropdown === "price" && (
                  <PriceRangeDropdown
                    minPrice={0}
                    maxPrice={5000}
                    minVal={minPriceFilter}
                    maxVal={maxPriceFilter}
                    onMinChange={setMinPriceFilter}
                    onMaxChange={setMaxPriceFilter}
                    onClose={() => setOpenDropdown(null)}
                  />
                )}
              </div>

              {/* Category filter */}
              <div 
                style={{ position: "relative" }}
                onMouseEnter={() => setOpenDropdown("category")}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button
                  className={`filter-btn ${openDropdown === "category" ? "open" : ""} ${categoryFilter ? "active-filter" : ""}`}
                  onClick={() => setOpenDropdown(openDropdown === "category" ? null : "category")}
                >
                  {categoryFilter && <span className="active-dot" />}
                  {categoryFilter || "Category"}
                  <span className="chevron">▼</span>
                </button>
                {openDropdown === "category" && (
                  <div className="dropdown-panel" style={{ minWidth: "260px" }}>
                    <div className="cat-list">
                      <button
                        className={`cat-option ${categoryFilter === "" ? "selected" : ""}`}
                        onClick={() => { setCategoryFilter(""); setOpenDropdown(null); }}
                      >
                        All Categories
                        <span className="cat-count">{searchMatchedProducts.length}</span>
                      </button>
                      {rankedCategories.map((cat) => {
                        const count = searchMatchedProducts.filter((p) => p.category === cat).length;
                        return (
                          <button
                            key={cat}
                            className={`cat-option ${categoryFilter === cat ? "selected" : ""}`}
                            onClick={() => {
                              setCategoryFilter(cat);
                              recordCategoryInterest(cat, 2);
                              setOpenDropdown(null);
                            }}
                          >
                            {cat}
                            <span className="cat-count">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Sort */}
              <div 
                className="sort-pill" 
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setOpenDropdown("sort")}
                onMouseLeave={() => setOpenDropdown(null)}
                onClick={() => setOpenDropdown(openDropdown === "sort" ? null : "sort")}
              >
                <label style={{ cursor: "pointer", pointerEvents: "none" }}>Sort:</label>
                <div style={{
                  color: "rgba(255,255,255,0.9)",
                  fontFamily: "'Jost', sans-serif",
                  fontSize: "0.875rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  pointerEvents: "none"
                }}>
                  {sortLabel}
                  <span className="chevron" style={{ transform: openDropdown === "sort" ? "rotate(180deg)" : "none", transition: "transform 0.2s", fontSize: "0.7rem", opacity: 0.7 }}>▼</span>
                </div>
                {openDropdown === "sort" && (
                  <div className="dropdown-panel" style={{ minWidth: "180px", right: 0, left: "auto" }}>
                    <div className="cat-list">
                      {[
                        { value: "recommended", label: "Recommended" },
                        { value: "newest", label: "Newest" },
                        { value: "name-a-z", label: "Name A–Z" },
                        { value: "price-low-high", label: "Price ↑" },
                        { value: "price-high-low", label: "Price ↓" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          className={`cat-option ${sortOption === opt.value ? "selected" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSortOption(opt.value);
                            setOpenDropdown(null);
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Clear all */}
              {hasActiveFilters && (
                <button
                  className="clear-btn"
                  onClick={() => {
                    setSearchTerm("");
                    setCategoryFilter("");
                    setSortOption("recommended");
                    setMinPriceFilter("");
                    setMaxPriceFilter("");
                  }}
                >
                  ✕ Clear all
                </button>
              )}
            </div>

            {/* Active filter chips */}
            {(categoryFilter || minPriceFilter || maxPriceFilter) && (
              <div className="active-chips" style={{ marginTop: "0.6rem" }}>
                {categoryFilter && (
                  <button className="active-chip" onClick={() => setCategoryFilter("")}>
                    {categoryFilter} <span className="x">✕</span>
                  </button>
                )}
                {(minPriceFilter || maxPriceFilter) && (
                  <button className="active-chip" onClick={() => { setMinPriceFilter(""); setMaxPriceFilter(""); }}>
                    ₹{minPriceFilter || 0}–{maxPriceFilter || "any"} <span className="x">✕</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Product Grid ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
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
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
                >
                  {filtered.map((product) => (
                    <motion.div
                      key={product.id}
                      onClick={() => recordCategoryInterest(product.category, 1)}
                      variants={{
                        hidden: { opacity: 0, y: 35, scale: 0.95 },
                        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
                      }}
                    >
                      <ProductCard product={product} addToCart={addToCart} />
                    </motion.div>
                  ))}
                </motion.div>

                {filtered.length === 0 && (
                  <p className="empty">
                    {normalizedSearchTerm || minPriceFilter || maxPriceFilter
                      ? "No products match your current filters."
                      : "No products found in this category."}
                  </p>
                )}
              </>
            )}
          </motion.div>
        </div>
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