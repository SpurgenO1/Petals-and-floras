import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoMark from "../assets/petals-floras-logo.png";

export default function Navbar({ cartCount = 0 }) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      if (y <= 8) setHidden(false);
      else if (y > lastY && y > 96) setHidden(true);
      else if (y < lastY) setHidden(false);
      lastY = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [location]);

  const links = [
    { to: "/", label: "Home" },
    { to: "/products", label: "Products" },
    { to: "/about", label: "About" },
    { to: "/contact", label: "Contact" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Jost:wght@300;400;500&display=swap');

        :root {
          --rose-deep:  #7b1a2e;
          --rose-mid:   #c0354e;
          --rose-light: #f1a0b0;
          --rose-petal: #e8536d;
          --gold-logo:  #d7b56d;
        }

        .nb-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
          padding: 0 2rem;
          height: 64px;
          display: flex; align-items: center; justify-content: space-between;
          transition: transform 0.4s cubic-bezier(0.4,0,0.2,1),
                      background 0.35s ease,
                      box-shadow 0.35s ease,
                      border-color 0.35s ease;
          background: rgba(18, 2, 9, 0.72);
          backdrop-filter: blur(22px) saturate(1.8);
          -webkit-backdrop-filter: blur(22px) saturate(1.8);
          border-bottom: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 4px 30px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset;
          font-family: 'Jost', sans-serif;
          will-change: transform;
        }

        .nb-nav.nb-scrolled {
          background: rgba(18, 2, 9, 0.88);
          backdrop-filter: blur(22px) saturate(1.8);
          -webkit-backdrop-filter: blur(22px) saturate(1.8);
          border-bottom: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 4px 30px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset;
        }

        .nb-nav.nb-hidden { transform: translateY(-110%); }

        .nb-brand {
          display: flex; align-items: center; gap: 0.65rem;
          text-decoration: none;
          color: #fff;
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.25rem; font-weight: 600;
          letter-spacing: 0.02em;
          flex-shrink: 0;
          position: relative;
        }
        .nb-brand-badge {
          width: 42px;
          height: 54px;
          flex-shrink: 0;
        }
        .nb-brand-mark {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center;
          display: block;
        }
        .nb-brand-name { color: #fff; }
        .nb-brand-name em {
          font-style: normal;
          color: var(--gold-logo);
        }

        .nb-links {
          display: flex; align-items: center; gap: 0.25rem;
        }
        .nb-link {
          position: relative;
          padding: 0.4rem 0.85rem;
          border-radius: 50px;
          text-decoration: none;
          color: rgba(255,255,255,0.62);
          font-size: 0.82rem; font-weight: 400;
          letter-spacing: 0.06em;
          transition: color 0.22s;
          white-space: nowrap;
        }
        .nb-link:hover { color: #fff; }
        .nb-link.nb-active { color: #fff; }
        .nb-link.nb-active::before {
          content: "";
          position: absolute; inset: 0;
          border-radius: 50px;
          background: rgba(192,53,78,0.22);
          border: 1px solid rgba(232,83,109,0.3);
        }
        .nb-link::after {
          content: "";
          position: absolute; bottom: 4px; left: 50%; right: 50%;
          height: 1.5px; border-radius: 2px;
          background: var(--rose-petal);
          transition: left 0.25s ease, right 0.25s ease;
        }
        .nb-link:hover::after, .nb-link.nb-active::after {
          left: 18%; right: 18%;
        }
        .nb-link.nb-active::after { opacity: 0; }

        .nb-cart {
          position: relative;
          display: flex; align-items: center; gap: 0.45rem;
          padding: 0.42rem 1.1rem;
          border-radius: 50px;
          text-decoration: none;
          background: rgba(60,5,20,0.55);
          border: 1px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.85);
          font-size: 0.82rem; font-weight: 400;
          letter-spacing: 0.06em;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          transition: all 0.25s;
          white-space: nowrap;
          margin-left: 0.5rem;
        }
        .nb-cart:hover {
          background: rgba(192,53,78,0.3);
          border-color: var(--rose-petal);
          color: #fff;
          box-shadow: 0 4px 18px rgba(192,53,78,0.35);
        }
        .nb-cart-badge {
          min-width: 18px; height: 18px;
          background: linear-gradient(135deg, var(--rose-mid), var(--rose-deep));
          border-radius: 50px;
          font-size: 0.68rem; font-weight: 500;
          display: flex; align-items: center; justify-content: center;
          padding: 0 5px;
          box-shadow: 0 2px 8px rgba(192,53,78,0.5);
          color: #fff;
        }

        .nb-burger {
          display: none;
          flex-direction: column; gap: 5px;
          width: 36px; height: 36px;
          align-items: center; justify-content: center;
          background: rgba(60,5,20,0.55);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 10px;
          cursor: pointer;
          backdrop-filter: blur(10px);
        }
        .nb-burger span {
          display: block; width: 18px; height: 1.5px;
          background: rgba(255,255,255,0.8);
          border-radius: 2px;
          transition: all 0.3s;
        }
        .nb-burger.open span:nth-child(1) { transform: translateY(6.5px) rotate(45deg); }
        .nb-burger.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
        .nb-burger.open span:nth-child(3) { transform: translateY(-6.5px) rotate(-45deg); }

        .nb-drawer {
          position: fixed; top: 64px; left: 0; right: 0; z-index: 999;
          background: rgba(18, 2, 9, 0.92);
          backdrop-filter: blur(24px) saturate(1.8);
          -webkit-backdrop-filter: blur(24px) saturate(1.8);
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding: 1.2rem 1.5rem 1.8rem;
          display: flex; flex-direction: column; gap: 0.25rem;
        }
        .nb-drawer-link {
          padding: 0.75rem 1rem;
          border-radius: 12px;
          text-decoration: none;
          color: rgba(255,255,255,0.7);
          font-size: 0.9rem; letter-spacing: 0.05em;
          transition: all 0.2s;
          display: flex; align-items: center; gap: 0.5rem;
        }
        .nb-drawer-link:hover, .nb-drawer-link.nb-active {
          background: rgba(192,53,78,0.18);
          color: #fff;
          border: 1px solid rgba(232,83,109,0.25);
        }
        .nb-drawer-divider {
          height: 1px; margin: 0.5rem 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        }

        @media (max-width: 900px) {
          .nb-nav { padding: 0 1rem; }
          .nb-brand { gap: 0.5rem; font-size: 1.05rem; }
          .nb-brand-badge { width: 34px; height: 44px; }
          .nb-link { padding: 0.35rem 0.65rem; font-size: 0.76rem; }
          .nb-cart { padding: 0.38rem 0.9rem; font-size: 0.76rem; }
        }

        @media (max-width: 768px) {
          .nb-links { display: none; }
          .nb-burger { display: flex; }
          .nb-cart { display: none; }
          .nb-nav { height: 60px; }
          .nb-drawer { top: 60px; }
          .nb-brand-name { font-size: 0.98rem; }
        }
      `}</style>

      <nav className={`nb-nav ${scrolled ? "nb-scrolled" : ""} ${hidden ? "nb-hidden" : ""}`}>
        <Link to="/" className="nb-brand">
          <span className="nb-brand-badge">
            <img src={logoMark} alt="Petals and Flora logo" className="nb-brand-mark" />
          </span>
          <span className="nb-brand-name">Petals <em>&</em> Flora</span>
        </Link>

        <div className="nb-links">
          {links.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`nb-link ${location.pathname === to ? "nb-active" : ""}`}
            >
              {label}
            </Link>
          ))}

          <Link to="/cart" className={`nb-cart ${location.pathname === "/cart" ? "nb-active" : ""}`}>
            Cart
            <AnimatePresence mode="wait">
              <motion.span
                key={cartCount}
                className="nb-cart-badge"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
              >
                {cartCount}
              </motion.span>
            </AnimatePresence>
          </Link>
        </div>

        <button
          className={`nb-burger ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="nb-drawer"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {links.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`nb-drawer-link ${location.pathname === to ? "nb-active" : ""}`}
              >
                {label}
              </Link>
            ))}
            <div className="nb-drawer-divider" />
            <Link to="/cart" className={`nb-drawer-link ${location.pathname === "/cart" ? "nb-active" : ""}`}>
              Cart
              <span className="nb-cart-badge" style={{ marginLeft: "auto" }}>{cartCount}</span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
