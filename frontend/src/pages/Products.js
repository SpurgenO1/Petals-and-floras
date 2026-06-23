import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { getProducts } from "../services/api";
import { catalogProducts, getCatalogPrices, PRODUCT_SPECIFIC_IMAGES } from "../data/catalogProducts";

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
  "Real Flower Bouquets": { start: "#ffd6e0", end: "#c2185b", label: "Bouquet" },
  "Artificial Flower Bouquets": { start: "#efe0ff", end: "#8e44ad", label: "Craft" },
  "Chocolate Bouquets": { start: "#f5d3b3", end: "#6d4c41", label: "Choco" },
  "Jewelry Bouquets": { start: "#f8e6a0", end: "#b8860b", label: "Jewels" },
  "Gift Bouquets": { start: "#ffe0b2", end: "#ef6c00", label: "Gift" },
  "Handmade Bouquets": { start: "#d7f0ff", end: "#1976d2", label: "Handmade" },
  "Occasion Bouquets": { start: "#ffd1dc", end: "#ad1457", label: "Occasion" },
  "Innovative Bouquets": { start: "#d0f4de", end: "#00897b", label: "Creative" },
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

function buildProductDescription(product) {
  const category = product.category || "Floral";
  const name = product.name || "Unknown";
  const baseDescription = String(product.description || "").trim();
  const defaultCatalogDescription = `${name} from the ${category} collection.`;
  const normalizedName = name.toLowerCase();

  const categoryHighlights = {
    Roses: "Known for their layered petals and timeless romantic appeal, these roses bring warmth, elegance, and a rich visual presence to bouquets and floral styling.",
    Carnations: "Carnations offer soft texture, long-lasting freshness, and a beautifully full bloom that works well for everyday gifting, events, and graceful arrangements.",
    "Asiatic Lilies": "These lilies stand out with bold petals, clean lines, and a lively shape that adds brightness and refined movement to floral designs.",
    "Oriental Lilies": "Oriental lilies create a luxurious look with larger blooms, graceful form, and a dramatic finish that feels premium in any arrangement.",
    "Exotic & Novelties": "This variety brings a distinctive personality, unusual shape, and standout charm for designs that need something more expressive and memorable.",
    Gerberas: "Gerberas add cheerful color, a fresh open face, and a playful energy that instantly lifts bouquets, celebrations, and display work.",
    Orchids: "Orchids deliver a polished, premium look with smooth petals and an elegant silhouette that feels modern, graceful, and refined.",
    Fillers: "These stems add softness, volume, and balance around focal blooms, helping bouquets feel fuller, more natural, and beautifully finished.",
    "Cut Foliages": "These greens bring structure, texture, and depth to arrangements, giving every bouquet a fresh, layered, and professionally styled look.",
    "Hybrid Chrysanthamums": "These blooms offer rich petal detail, fullness, and dependable freshness, making them ideal for generous and eye-catching floral work.",
    "Bouquet & Car Deco Materials": "This product supports bouquet wrapping or floral presentation with useful finishing detail, structure, and decorative support.",
    "Real Flower Bouquets": "These bouquets highlight the natural beauty of fresh blooms with elegant shaping, layered textures, and a graceful hand-tied presentation.",
    "Artificial Flower Bouquets": "These bouquets offer long-lasting beauty with crafted petals, decorative styling, and a polished look that stays lovely over time.",
    "Chocolate Bouquets": "These bouquets combine gifting charm with sweet treats, creating a playful and impressive presentation that feels festive and indulgent.",
    "Jewelry Bouquets": "These bouquets turn accessories into a beautifully arranged gift presentation, making the surprise feel more premium, thoughtful, and memorable.",
    "Gift Bouquets": "These bouquets blend flowers with keepsakes or playful extras, making them feel more personal, expressive, and celebration-ready.",
    "Handmade Bouquets": "These bouquets stand out through crafted details, creative materials, and a thoughtful handmade finish that feels warm and unique.",
    "Occasion Bouquets": "These bouquets are designed around life moments and celebrations, helping the gift feel more meaningful, timely, and emotionally special.",
    "Innovative Bouquets": "These bouquets bring creative gifting ideas together in a standout format that feels modern, surprising, and highly memorable."
  };

  const usageHighlights = {
    Roses: "A lovely choice for gifting, bouquet work, and romantic floral styling.",
    Carnations: "A versatile option for bouquets, event decor, and heartfelt gifting.",
    "Asiatic Lilies": "Ideal for statement bouquets, premium gifts, and elegant event arrangements.",
    "Oriental Lilies": "Perfect for luxurious bouquets, premium occasions, and graceful floral displays.",
    "Exotic & Novelties": "Best for standout bouquets, creative styling, and modern floral combinations.",
    Gerberas: "Perfect for cheerful gifting, celebrations, and bright everyday arrangements.",
    Orchids: "Well suited for premium gifts, elegant bouquets, and sophisticated floral styling.",
    Fillers: "Best used to add flow, softness, and fullness around focal flowers in bouquets.",
    "Cut Foliages": "Great for bouquet styling, floral layering, and adding depth around fresh flowers.",
    "Hybrid Chrysanthamums": "A dependable pick for fuller bouquets, gifting, and vibrant arrangement work.",
    "Bouquet & Car Deco Materials": "Useful for finishing bouquets, presentation styling, and decorative setup.",
    "Real Flower Bouquets": "Perfect for heartfelt gifting, celebrations, home decor, and premium floral presentation.",
    "Artificial Flower Bouquets": "A lovely choice for keepsake gifting, decor styling, and moments where lasting beauty matters.",
    "Chocolate Bouquets": "Ideal for birthdays, surprises, festive gifting, and sweet celebration moments.",
    "Jewelry Bouquets": "A refined choice for romantic gifting, milestone surprises, and elegant special occasions.",
    "Gift Bouquets": "Great for surprise gifting, fun celebrations, and personal present combinations.",
    "Handmade Bouquets": "Best for custom gifting, sentimental moments, and handcrafted presentation.",
    "Occasion Bouquets": "Perfect for birthdays, weddings, anniversaries, graduations, and family celebrations.",
    "Innovative Bouquets": "Well suited for creative gifting, themed surprises, and standout personalized presents."
  };

  const categoryMood = {
    Roses: "It carries the classic beauty and soft fullness that make rose varieties so admired for gifting and premium bouquet work.",
    Carnations: "It brings a ruffled texture and generous bloom shape that helps arrangements feel fuller, softer, and more expressive.",
    "Asiatic Lilies": "It offers a clean petal shape and bright floral presence that instantly adds freshness and elegant movement.",
    "Oriental Lilies": "It gives arrangements a luxurious look with broader petals, graceful form, and a naturally premium feel.",
    "Exotic & Novelties": "It stands out through its unusual structure and tropical personality, making designs feel more artistic and memorable.",
    Gerberas: "It adds an open cheerful face and lively color energy that works beautifully in happy, welcoming floral designs.",
    Orchids: "It has a polished silhouette and graceful petal finish that gives bouquets a refined and modern character.",
    Fillers: "It helps soften transitions between focal flowers while adding light texture and a finished garden-style feel.",
    "Cut Foliages": "It adds freshness, structure, and layered greenery that makes bouquets look richer and more professionally styled.",
    "Hybrid Chrysanthamums": "It brings dense petal detail and lasting body that supports fuller, more eye-catching bouquet work.",
    "Bouquet & Car Deco Materials": "It supports floral presentation with practical structure and decorative value for polished finishing.",
    "Real Flower Bouquets": "It carries the freshness, fragrance, and organic beauty that make real flower gifting feel timeless and heartfelt.",
    "Artificial Flower Bouquets": "It offers decorative charm with easy care, making it a practical yet stylish gifting option.",
    "Chocolate Bouquets": "It feels cheerful and indulgent, blending the look of a bouquet with the delight of favorite chocolates.",
    "Jewelry Bouquets": "It creates a more luxurious impression by combining beautiful presentation with a lasting wearable gift.",
    "Gift Bouquets": "It adds personality and surprise by combining bouquet styling with thoughtful non-floral elements.",
    "Handmade Bouquets": "It feels personal and artistic, with crafted details that make the bouquet more expressive and memorable.",
    "Occasion Bouquets": "It brings the right tone for celebration, helping the bouquet match the mood of the special day.",
    "Innovative Bouquets": "It stands out through creativity and novelty, making the gift feel fresh, modern, and conversation-worthy."
  };

  const colorNotes = [
    { keywords: ["white", "half white"], text: "Its clean white tone gives arrangements a calm, fresh, and polished finish that pairs beautifully with almost any accent flower." },
    { keywords: ["red"], text: "Its rich red character creates a bold focal point and adds warmth, romance, and dramatic depth to bouquet styling." },
    { keywords: ["pink", "dark pink", "light pink", "sexy pink"], text: "Its pink tones bring a soft, charming, and graceful mood that feels both expressive and easy to gift." },
    { keywords: ["yellow", "gold", "golden"], text: "Its sunny yellow-gold tone brightens arrangements with cheerful energy and a naturally uplifting look." },
    { keywords: ["purple", "blue", "violet"], text: "Its cooler violet-blue tone gives designs a more distinctive, premium, and slightly dramatic personality." },
    { keywords: ["orange", "peach"], text: "Its warm orange-peach tone adds friendly brightness and a lively seasonal feel to floral work." },
    { keywords: ["green"], text: "Its green character adds freshness and a modern botanical feel that works especially well in textured bouquet designs." },
  ];

  const nameSpecificNotes = [
    { keywords: ["spray"], text: "Because it grows in a spray style, it brings multiple smaller blooms on a stem and creates a naturally fuller look in bunches and arrangements." },
    { keywords: ["button"], text: "Its button-like bloom form gives a neat, compact texture that works well for detail work and layered bouquet composition." },
    { keywords: ["double"], text: "Its double-layered bloom appearance gives it extra fullness and a richer visual texture in bouquet styling." },
    { keywords: ["mokara"], text: "Its mokara-style form gives it a sleek tropical elegance that feels vibrant, structured, and premium." },
    { keywords: ["dyed"], text: "Its dyed finish gives it a more striking decorative look when you want something unusual and visually standout." },
    { keywords: ["leaves", "leaf", "fern", "grass", "palm", "plant", "rod", "ivy", "monstera", "xanadu", "dracena", "kamini", "carpus", "cypres"], text: "Its leafy texture helps frame focal blooms beautifully and adds depth, movement, and a natural green balance to the finished design." },
    { keywords: ["ginger", "heliconia", "bird of paradise", "anthurium", "pineapple", "banana flower", "brassica", "hydrangea", "agapanthus", "callalily"], text: "Its distinctive botanical form makes it especially useful when you want arrangements to feel more exotic, sculptural, and memorable." },
    { keywords: ["wrapper", "sheet", "foam box", "bridal handle", "deco", "petite"], text: "Its practical design helps support bouquet making, presentation styling, and decorative floral finishing with a cleaner professional result." },
    { keywords: ["bouquet"], text: "Its bouquet presentation makes the gift feel fuller, more celebratory, and ready for a beautiful handover the moment it arrives." },
    { keywords: ["chocolate", "ferrero", "dairy milk", "kinder"], text: "Its sweet gifting concept adds playful charm and makes the bouquet feel festive, generous, and instantly enjoyable." },
    { keywords: ["earring", "bracelet", "ring", "jewelry"], text: "Its accessory-based design gives it a premium keepsake quality, so the bouquet feels elegant even after the celebration." },
    { keywords: ["teddy", "money", "snack", "cosmetic", "stationery"], text: "Its themed gift combination makes it feel personal and fun, with a presentation that goes beyond a standard bouquet." },
    { keywords: ["origami", "photo", "message", "fabric", "crochet", "paper", "wooden"], text: "Its crafted character gives it a handmade personality that feels thoughtful, creative, and especially meaningful as a gift." },
    { keywords: ["birthday", "wedding", "anniversary", "graduation", "baby shower"], text: "Its occasion-focused style helps the bouquet match the celebration beautifully and makes the gift feel more intentional." },
    { keywords: ["led", "balloon", "perfume", "cupcake", "fruit", "book", "personalized"], text: "Its inventive concept gives the bouquet a surprise factor that feels modern, playful, and wonderfully different from ordinary gifting." },
  ];

  const foundColorNote =
    colorNotes.find((entry) => entry.keywords.some((keyword) => normalizedName.includes(keyword)))?.text ||
    "Its natural tone and texture make it easy to blend with other flowers while still holding its own presence in the arrangement.";

  const foundSpecificNote =
    nameSpecificNotes.find((entry) => entry.keywords.some((keyword) => normalizedName.includes(keyword)))?.text ||
    "Its individual character gives designers flexibility when creating bouquets that feel balanced, fresh, and a little different from standard mixes.";

  if (baseDescription && baseDescription !== defaultCatalogDescription && baseDescription.length > 90) {
    return baseDescription;
  }

  const intro =
    baseDescription && baseDescription !== defaultCatalogDescription
      ? `${baseDescription.replace(/[. ]+$/, "")}.`
      : `${name} is a beautiful choice from our ${category} collection.`;

  return [
    intro,
    categoryHighlights[category] || "This item adds natural beauty, texture, and freshness to floral styling and thoughtful gifting.",
    categoryMood[category] || foundColorNote,
    foundSpecificNote,
    usageHighlights[category] || "A versatile option for bouquets, decorative styling, and fresh floral presentation."
  ].join(" ");
}

function formatPrice(value) {
  const amount = Number(value || 0);
  return amount > 0 ? `Rs ${amount.toLocaleString()}` : "Price on request";
}

function getProductPricing(product) {
  const explicitFlowerPrice = Number(product.flowerPrice ?? product.flower_price ?? 0);
  const explicitBouquetPrice = Number(product.bouquetPrice ?? product.bouquet_price ?? 0);
  const basePrice = Number(product.price || 0);
  const catalogPrices = getCatalogPrices(product.category, Number(String(product.id || "").split("-").pop()) || 0);
  const isBouquetCategory = String(product.category || "").toLowerCase().includes("bouquet");
  const flowerPrice = explicitFlowerPrice || basePrice || catalogPrices.flowerPrice;
  const bouquetPrice = explicitBouquetPrice || (isBouquetCategory ? flowerPrice : Math.max(catalogPrices.bouquetPrice, flowerPrice + 350));

  return {
    flowerPrice,
    bouquetPrice,
    displayPrice: flowerPrice,
    priceRangeLabel: flowerPrice === bouquetPrice
      ? formatPrice(flowerPrice)
      : `${formatPrice(flowerPrice)} / ${formatPrice(bouquetPrice)}`,
  };
}

function normalizeProduct(product) {
  const category = product.category || "Floral";
  const name = product.name || "Unknown";
  const pricing = getProductPricing({ ...product, category, name });
  
  // Use high-quality generated images if available
  // Try category-qualified name first (e.g., "Roses:Tajmahal"), then fall back to plain name
  let imageUrl = PRODUCT_SPECIFIC_IMAGES[`${category}:${name}`] || 
                 PRODUCT_SPECIFIC_IMAGES[name] || 
                 product.professional_image || 
                 product.image || 
                 buildProductImage(product);
  
  return {
    ...product,
    price: pricing.displayPrice,
    flowerPrice: pricing.flowerPrice,
    bouquetPrice: pricing.bouquetPrice,
    priceRangeLabel: pricing.priceRangeLabel,
    category: category,
    description: buildProductDescription({ ...product, category, name }),
    image: imageUrl,
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

function ProductCard({ product, onOpenDetails }) {
  return (
    <TiltCard>
      <div className="card">
        <div className="card-img-wrap">
          <img src={product.image} alt={product.name} className="card-img" loading="lazy" decoding="async" />
          <div className="img-overlay" />
          <span className="badge">{product.priceRangeLabel}</span>
        </div>
        <div className="card-body">
          <p className="card-cat">{product.category}</p>
          <button type="button" className="card-title-btn" onClick={() => onOpenDetails(product)}>
            <h3 className="card-title">{product.name}</h3>
          </button>
          <p className="card-desc">{product.description}</p>
          <div className="card-price-options">
            <span>Flower: {formatPrice(product.flowerPrice)}</span>
            <span>Bouquet: {formatPrice(product.bouquetPrice)}</span>
          </div>
          <div className="card-footer">
            <span className="stock-note">Catalog item</span>
            <motion.button
              type="button"
              className="btn-add"
              whileTap={{ scale: 0.92 }}
              onClick={() => onOpenDetails(product)}
            >
              Choose type
            </motion.button>
          </div>
        </div>
      </div>
    </TiltCard>
  );
}

// ─── Price Range Slider ───────────────────────────────────────────────────────
function ProductDetailsModal({ product, onClose, onSelectType }) {
  if (!product) return null;

  return (
    <motion.div
      className="product-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="product-modal"
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="product-modal-close" onClick={onClose} aria-label="Close product details">
          x
        </button>
        <div className="product-modal-media">
          <img src={product.image} alt={product.name} className="product-modal-image" />
        </div>
        <div className="product-modal-content">
          <p className="product-modal-category">{product.category}</p>
          <h3 className="product-modal-title">{product.name}</h3>
          <p className="product-modal-description">{product.description}</p>
          <div className="product-modal-price-grid">
            <div>
              <span>Flower</span>
              <strong>{formatPrice(product.flowerPrice)}</strong>
            </div>
            <div>
              <span>Bouquet</span>
              <strong>{formatPrice(product.bouquetPrice)}</strong>
            </div>
          </div>
          <div className="product-modal-actions">
            <button type="button" className="product-type-btn primary" onClick={() => onSelectType("flower")}>
              Flower - {formatPrice(product.flowerPrice)}
            </button>
            <button type="button" className="product-type-btn secondary" onClick={() => onSelectType("bouquet")}>
              Bouquet - {formatPrice(product.bouquetPrice)}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

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
  const fallbackCatalogProducts = useMemo(
    () => catalogProducts.map((product) => normalizeProduct({ ...product, isFromAdmin: false })),
    []
  );
  const [products, setProducts] = useState(() =>
    fallbackCatalogProducts
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
  const [selectedProduct, setSelectedProduct] = useState(null);
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
  }, [fallbackCatalogProducts]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const compactQuery = window.matchMedia("(max-width: 640px), (prefers-reduced-motion: reduce)");
    const syncCompactView = () => setIsCompactView(compactQuery.matches);
    syncCompactView();
    compactQuery.addEventListener("change", syncCompactView);
    return () => compactQuery.removeEventListener("change", syncCompactView);
  }, [fallbackCatalogProducts]);

  useEffect(() => {
    hasProductsRef.current = products.length > 0;
    productsSignatureRef.current = JSON.stringify(
      products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        flowerPrice: p.flowerPrice,
        bouquetPrice: p.bouquetPrice,
        description: p.description,
        isFromAdmin: p.isFromAdmin,
      }))
    );
  }, [products]);

  useEffect(() => {
    if (cart.length === 0) { setShowCartBubble(false); return undefined; }
    setShowCartBubble(true);
    const timer = window.setTimeout(() => setShowCartBubble(false), 5000);
    return () => window.clearTimeout(timer);
  }, [cart]);

  useEffect(() => {
    if (!selectedProduct) return undefined;
    function handleEscape(event) {
      if (event.key === "Escape") setSelectedProduct(null);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [selectedProduct]);

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
          const liveProducts = Array.isArray(response.data)
            ? response.data.map((p) => normalizeProduct({ ...p, isFromAdmin: true }))
            : [];
          const mergedProducts = [...liveProducts];
          const existingKeys = new Set(
            liveProducts.map((product) => `${String(product.category || "").toLowerCase()}::${String(product.name || "").toLowerCase()}`)
          );

          fallbackCatalogProducts.forEach((product) => {
            const productKey = `${String(product.category || "").toLowerCase()}::${String(product.name || "").toLowerCase()}`;
            if (!existingKeys.has(productKey)) {
              mergedProducts.push(product);
            }
          });

          const nextSignature = JSON.stringify(mergedProducts.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            price: p.price,
            flowerPrice: p.flowerPrice,
            bouquetPrice: p.bouquetPrice,
            description: p.description,
            isFromAdmin: p.isFromAdmin,
          })));
          if (nextSignature !== productsSignatureRef.current) setProducts(mergedProducts);
          setError(mergedProducts.length > 0 ? "" : "No products found in the store catalog.");
          lastFetchTimeRef.current = now;
        }
      } catch {
        if (!ignore) {
          if (!hasProductsRef.current) setProducts(fallbackCatalogProducts);
          setError(hasProductsRef.current
            ? "Live sync is temporarily unavailable. Current products will refresh when the backend reconnects."
            : "Showing catalog fallback. Start the backend server to load live products from the store catalog."
          );
        }
      } finally {
        fetchInFlightRef.current = false;
      }
    }
    const loadTimer = window.setTimeout(() => loadProducts({ force: true }), 120);
    function handleFocus() { loadProducts({ background: true }); }
    window.addEventListener("focus", handleFocus);
    return () => {
      ignore = true;
      window.clearTimeout(loadTimer);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fallbackCatalogProducts]);

  const addToCart = (product, purchaseType) => {
    recordCategoryInterest(product.category, 3);
    const cartKey = `${product.id}-${purchaseType}`;
    const selectedPrice = purchaseType === "bouquet" ? product.bouquetPrice : product.flowerPrice;
    setCart((prev) => {
      const exists = prev.find((item) => (item.cartKey || `${item.id}-${item.purchaseType || "flower"}`) === cartKey);
      return exists
        ? prev.map((item) =>
            (item.cartKey || `${item.id}-${item.purchaseType || "flower"}`) === cartKey
              ? { ...item, qty: (item.qty || 1) + 1, purchaseType, price: selectedPrice, cartKey }
              : item
          )
        : [...prev, { ...product, price: selectedPrice, qty: 1, purchaseType, cartKey }];
    });
  };

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const normalizedMinPrice = Number(minPriceFilter || 0);
  const normalizedMaxPrice = Number(maxPriceFilter || 0);

  const searchMatchedProducts = useMemo(
    () => products.filter((product) => {
      if (!normalizedSearchTerm) return true;
      const searchableText = [product.name, product.category, product.description].filter(Boolean).join(" ").toLowerCase();
      return searchableText.includes(normalizedSearchTerm);
    }),
    [normalizedSearchTerm, products]
  );

  const categoryCounts = useMemo(
    () => searchMatchedProducts.reduce((counts, product) => {
      if (product.category) {
        counts[product.category] = (counts[product.category] || 0) + 1;
      }
      return counts;
    }, {}),
    [searchMatchedProducts]
  );

  const categories = useMemo(
    () => Object.keys(categoryCounts),
    [categoryCounts]
  );

  const rankedCategories = useMemo(
    () => rankCategories(categories, searchMatchedProducts, categoryInterest, searchTerm),
    [categories, categoryInterest, searchMatchedProducts, searchTerm]
  );

  const filtered = useMemo(
    () => searchMatchedProducts
      .filter((p) => !categoryFilter || p.category === categoryFilter)
      .filter((p) => Number(p.flowerPrice || p.price || 0) >= normalizedMinPrice || Number(p.bouquetPrice || p.price || 0) >= normalizedMinPrice)
      .filter((p) => !normalizedMaxPrice || Number(p.flowerPrice || p.price || 0) <= normalizedMaxPrice || Number(p.bouquetPrice || p.price || 0) <= normalizedMaxPrice)
      .sort((left, right) => {
        if (sortOption === "price-low-high") return Number(left.flowerPrice || left.price || 0) - Number(right.flowerPrice || right.price || 0);
        if (sortOption === "price-high-low") return Number(right.bouquetPrice || right.price || 0) - Number(left.bouquetPrice || left.price || 0);
        if (sortOption === "name-a-z") return String(left.name || "").localeCompare(String(right.name || ""));
        if (sortOption === "newest") return Number(right.id || 0) - Number(left.id || 0);
        const ri = Number(categoryInterest[right.category] || 0);
        const li = Number(categoryInterest[left.category] || 0);
        if (ri !== li) return ri - li;
        return String(left.name || "").localeCompare(String(right.name || ""));
      }),
    [categoryFilter, categoryInterest, normalizedMaxPrice, normalizedMinPrice, searchMatchedProducts, sortOption]
  );

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
            radial-gradient(ellipse 80% 60% at 20% 10%, rgba(192,53,78,0.25) 0%, transparent 55%),
            radial-gradient(ellipse 60% 50% at 80% 85%, rgba(123,26,46,0.3) 0%, transparent 55%),
            radial-gradient(ellipse 100% 100% at 50% 50%, #0f0208 0%, #050002 100%);
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

        /* ── Header ── */
        .header { position: relative; z-index: 10; text-align: center; margin-bottom: 2rem; }
        .header-eyebrow {
          font-weight: 300; letter-spacing: 0.35em; font-size: 0.72rem;
          color: var(--rose-light); text-transform: uppercase; margin-bottom: 0.75rem;
        }
        .header h2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(2.8rem, 6vw, 4.5rem);
          font-weight: 700; color: #fff; line-height: 1.1;
          letter-spacing: -0.02em;
          text-shadow: 0 2px 30px rgba(192,53,78,0.4);
        }
        .header h2 span { color: var(--rose-petal); font-style: italic; }
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
          align-items: stretch;
        }
        .grid-item { display: flex; height: 100%; }

        /* ── Cards (unchanged) ── */
        .tilt-wrapper { position: relative; border-radius: 20px; transform-style: preserve-3d; width: 100%; height: 100%; }
        .glare { position: absolute; inset: 0; border-radius: 20px; pointer-events: none; z-index: 5; transition: background 0.05s; }
        .card {
          height: 100%;
          width: 100%;
          display: flex;
          flex-direction: column;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.15);
          backdrop-filter: blur(20px) saturate(1.8);
          border-radius: 20px; overflow: hidden;
          box-shadow: 0 2px 0 rgba(255,255,255,0.08) inset, 0 20px 60px rgba(0,0,0,0.45), 0 4px 20px rgba(192,53,78,0.2);
          transition: box-shadow 0.3s, transform 0.2s, border-color 0.2s;
        }
        .tilt-wrapper:hover .card {
          box-shadow: 0 2px 0 rgba(255,255,255,0.12) inset, 0 30px 70px rgba(0,0,0,0.55), 0 8px 35px rgba(192,53,78,0.45);
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
          max-width: calc(100% - 28px);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .card-body {
          display: flex; flex-direction: column; flex: 1; min-height: 0;
          padding: 1.2rem 1.4rem 1.4rem; transform: translateZ(30px);
        }
        .card-cat { font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--rose-light); margin-bottom: 0.45rem; }
        .card-title-btn {
          background: none;
          border: none;
          padding: 0;
          text-align: left;
          cursor: pointer;
        }
        .card-title { font-family: 'Cormorant Garamond', serif; font-size: 1.35rem; font-weight: 600; color: #fff; line-height: 1.25; margin-bottom: 0.8rem; min-height: 3.4rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .card-title-btn:hover .card-title, .card-title-btn:focus-visible .card-title { color: var(--rose-light); }
        .card-desc { color: rgba(255,255,255,0.72); font-size: 0.92rem; line-height: 1.55; margin-bottom: 0.85rem; flex: 1; min-height: 4.3rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .card-price-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.55rem;
          margin-bottom: 1rem;
        }
        .card-price-options span {
          min-width: 0;
          padding: 0.46rem 0.55rem;
          border-radius: 12px;
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.84);
          font-size: 0.76rem;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .card-footer { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-top: auto; }
        .stock-note { color: rgba(255,255,255,0.74); font-size: 0.8rem; letter-spacing: 0.05em; text-transform: uppercase; }
        .btn-add {
          min-width: 132px;
          padding: 0.48rem 1.15rem; border-radius: 999px;
          border: 1px solid var(--rose-petal); background: transparent; color: var(--rose-light);
          font-family: 'Jost', sans-serif; font-size: 0.84rem; letter-spacing: 0.06em; cursor: pointer; transition: all 0.25s;
        }
        .btn-add:hover { background: linear-gradient(135deg, var(--rose-mid), var(--rose-deep)); color: #fff; box-shadow: 0 4px 18px rgba(192,53,78,0.5); border-color: transparent; }
        .btn-add:focus-visible, .search-pill input:focus-visible, .price-input:focus-visible, .card-title-btn:focus-visible, .product-modal-close:focus-visible, .product-type-btn:focus-visible { outline: 3px solid rgba(255, 183, 204, 0.78); outline-offset: 2px; }

        .product-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          background: rgba(8, 0, 4, 0.72);
          backdrop-filter: blur(10px);
        }
        .product-modal {
          position: relative;
          width: min(760px, 100%);
          display: grid;
          grid-template-columns: minmax(220px, 300px) minmax(0, 1fr);
          background: linear-gradient(145deg, rgba(51, 5, 20, 0.96), rgba(20, 2, 10, 0.98));
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 28px;
          overflow: hidden;
          box-shadow: 0 26px 90px rgba(0,0,0,0.55);
        }
        .product-modal-media { min-height: 100%; background: rgba(255,255,255,0.04); }
        .product-modal-image { width: 100%; height: 100%; object-fit: cover; display: block; }
        .product-modal-content { padding: 2rem; display: flex; flex-direction: column; gap: 0.9rem; }
        .product-modal-category { font-size: 0.75rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--rose-light); }
        .product-modal-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.9rem, 3vw, 2.5rem); color: #fff; line-height: 1.1; }
        .product-modal-description { color: rgba(255,255,255,0.78); line-height: 1.7; font-size: 0.98rem; }
        .product-modal-price-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.8rem;
        }
        .product-modal-price-grid div {
          padding: 0.9rem 1rem;
          border-radius: 16px;
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(255,255,255,0.12);
        }
        .product-modal-price-grid span {
          display: block;
          margin-bottom: 0.18rem;
          font-size: 0.72rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.54);
        }
        .product-modal-price-grid strong {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.55rem;
          color: #fff;
        }
        .product-modal-actions { display: flex; gap: 0.85rem; flex-wrap: wrap; margin-top: 0.4rem; }
        .product-type-btn {
          min-width: 140px;
          padding: 0.85rem 1.2rem;
          border-radius: 999px;
          border: 1px solid transparent;
          font-family: 'Jost', sans-serif;
          font-size: 0.95rem;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .product-type-btn:hover { transform: translateY(-1px); }
        .product-type-btn.primary {
          background: linear-gradient(135deg, var(--rose-mid), var(--rose-deep));
          color: #fff;
          box-shadow: 0 10px 28px rgba(192,53,78,0.34);
        }
        .product-type-btn.secondary {
          background: rgba(255,255,255,0.05);
          color: var(--rose-light);
          border-color: rgba(255,255,255,0.18);
        }
        .product-modal-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(10, 0, 4, 0.42);
          color: #fff;
          font-size: 1.1rem;
          cursor: pointer;
        }

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
          .header { margin-bottom: 1.6rem; }
          .header h2 { font-size: clamp(2rem, 12vw, 3rem); line-height: 1.05; }
          .deco-line::before, .deco-line::after { flex-basis: 44px; }
          .filter-bar-wrap { margin-bottom: 1rem; }
          .filter-bar {
            display: grid;
            grid-template-columns: 1fr 1fr;
            align-items: stretch;
            border-radius: 18px;
          }
          .search-pill {
            grid-column: 1 / -1;
            min-width: 0;
            width: 100%;
            border-radius: 14px;
          }
          .filter-btn,
          .sort-pill,
          .clear-btn {
            width: 100%;
            min-width: 0;
            justify-content: center;
            border-radius: 14px;
          }
          .sort-pill {
            grid-column: 1 / -1;
          }
          .sort-pill select {
            min-width: 0;
            width: 100%;
          }
          .clear-btn {
            grid-column: 1 / -1;
          }
          .active-chips { gap: 0.4rem; margin-bottom: 0.9rem; }
          .active-chip { max-width: 100%; }
          .grid { grid-template-columns: 1fr; gap: 0.95rem; }
          .card-body { height: auto; padding: 1rem; }
          .card-img-wrap { height: 180px; }
          .card-cat { font-size: 0.62rem; }
          .card-title { font-size: 1.08rem; min-height: auto; }
          .card-desc { font-size: 0.82rem; min-height: auto; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
          .card-price-options { grid-template-columns: 1fr; }
          .card-footer { flex-direction: column; align-items: stretch; }
          .btn-add { width: 100%; }
          .cart-bubble { left: 1rem; right: 1rem; bottom: 5.75rem; text-align: center; }
          .dropdown-panel {
            position: fixed;
            left: 0.75rem !important;
            right: 0.75rem !important;
            top: auto;
            min-width: 0 !important;
            max-width: calc(100vw - 1.5rem);
            padding: 1rem;
          }
          .price-panel { min-width: 0; }
          .product-modal-overlay {
            align-items: flex-end;
            padding: 0.75rem;
          }
          .product-modal { grid-template-columns: 1fr; max-height: calc(100dvh - 1.5rem); overflow-y: auto; border-radius: 22px; }
          .product-modal-media { max-height: 220px; }
          .product-modal-content { padding: 1.2rem; }
          .product-modal-price-grid { grid-template-columns: 1fr; }
          .product-type-btn { width: 100%; }
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
                <strong>{filtered.length}</strong> of {products.length} Flowers
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
                        const count = categoryCounts[cat] || 0;
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
                      className="grid-item"
                      key={product.id}
                      onClick={() => recordCategoryInterest(product.category, 1)}
                      variants={{
                        hidden: { opacity: 0, y: 35, scale: 0.95 },
                        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
                      }}
                    >
                      <ProductCard product={product} onOpenDetails={setSelectedProduct} />
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

      <AnimatePresence>
        {selectedProduct ? (
          <ProductDetailsModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onSelectType={(purchaseType) => {
              addToCart(selectedProduct, purchaseType);
              setSelectedProduct(null);
            }}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
