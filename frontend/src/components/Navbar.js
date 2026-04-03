import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoMark from "../assets/petals-floras-logo.png";

export default function Navbar({ cartCount = 0, authUser = null, onLogout = () => {} }) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(true);
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
  useEffect(() => {
    if (authUser) {
      setShowLoginPrompt(false);
    }
  }, [authUser]);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (authUser || !showLoginPrompt || location.pathname === "/login") {
      return undefined;
    }

    const dismissTimer = window.setTimeout(() => {
      setShowLoginPrompt(false);
    }, 5000);

    return () => window.clearTimeout(dismissTimer);
  }, [authUser, showLoginPrompt, location.pathname]);

  const handleLogoutClick = async () => {
    setLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setLoggingOut(false);
    }
  };

  const links = [
    { to: "/", label: "Home" },
    { to: "/products", label: "Products" },
    { to: "/about", label: "About" },
    { to: "/contact", label: "Contact" },
  ];

  return (
    <>
      <style>{`
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
          border-bottom: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 10px 28px rgba(0,0,0,0.32);
          font-family: 'Jost', sans-serif;
          will-change: transform;
        }

        .nb-nav::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          top: 100%;
          height: 18px;
          pointer-events: none;
          background: linear-gradient(180deg, rgba(18, 2, 9, 0.82) 0%, rgba(18, 2, 9, 0.42) 48%, rgba(18, 2, 9, 0) 100%);
        }

        .nb-nav.nb-scrolled {
          background: rgba(18, 2, 9, 0.88);
          backdrop-filter: blur(22px) saturate(1.8);
          -webkit-backdrop-filter: blur(22px) saturate(1.8);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 10px 28px rgba(0,0,0,0.36);
        }

        .nb-nav.nb-hidden { transform: translateY(-110%); }

        .nb-brand {
          display: flex; align-items: center; gap: 0.65rem;
          text-decoration: none;
          color: #fff;
          font-family: 'Bodoni Moda', serif;
          font-size: 1.4rem; font-weight: 500;
          letter-spacing: -0.035em;
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
        .nb-brand-name {
          color: #fff;
          display: inline-flex;
          align-items: baseline;
          gap: 0.16em;
          line-height: 1;
        }
        .nb-brand-name em {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-weight: 500;
          color: rgba(255,255,255,0.74);
          transform: translateY(-0.03em);
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

        .nb-auth {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          margin-left: 0.75rem;
        }

        .nb-auth-chip,
        .nb-auth-link,
        .nb-auth-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          min-height: 36px;
          padding: 0.45rem 0.95rem;
          font-size: 0.76rem;
          letter-spacing: 0.06em;
          text-decoration: none;
          transition: all 0.22s ease;
        }

        .nb-auth-chip {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.82);
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .nb-auth-link {
          background: linear-gradient(135deg, rgba(232,83,109,0.95), rgba(123,26,46,0.95));
          color: #fff;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 10px 24px rgba(192,53,78,0.28);
        }

        .nb-auth-button {
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.82);
          cursor: pointer;
          font-family: inherit;
        }

        .nb-auth-link:hover,
        .nb-auth-button:hover {
          transform: translateY(-1px);
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
          max-height: calc(100dvh - 64px);
          overflow-y: auto;
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

        .nb-login-prompt {
          position: fixed;
          top: 84px;
          right: 1.2rem;
          z-index: 995;
          width: min(320px, calc(100vw - 2rem));
          padding: 0.95rem 1rem;
          border-radius: 18px;
          background: rgba(18, 2, 9, 0.92);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 18px 36px rgba(0,0,0,0.28);
          color: #fff;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .nb-login-prompt-title {
          font-size: 0.86rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--rose-light);
          margin-bottom: 0.3rem;
        }
        .nb-login-prompt-copy {
          font-size: 0.88rem;
          color: rgba(255,255,255,0.74);
          line-height: 1.55;
          margin-bottom: 0.8rem;
        }
        .nb-login-prompt-actions {
          display: flex;
          gap: 0.55rem;
          align-items: center;
        }
        .nb-login-prompt-link,
        .nb-login-prompt-dismiss {
          min-height: 34px;
          border-radius: 999px;
          padding: 0.45rem 0.85rem;
          font-size: 0.76rem;
          letter-spacing: 0.05em;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .nb-login-prompt-link {
          background: linear-gradient(135deg, rgba(232,83,109,0.96), rgba(123,26,46,0.96));
          color: #fff;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .nb-login-prompt-dismiss {
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.76);
          border: 1px solid rgba(255,255,255,0.12);
          cursor: pointer;
          font-family: inherit;
        }

        @media (max-width: 900px) {
          .nb-nav { padding: 0 1rem; }
          .nb-brand { gap: 0.5rem; font-size: 1.16rem; }
          .nb-brand-badge { width: 34px; height: 44px; }
          .nb-link { padding: 0.35rem 0.65rem; font-size: 0.76rem; }
          .nb-cart { padding: 0.38rem 0.9rem; font-size: 0.76rem; }
          .nb-auth-chip { max-width: 130px; }
        }

        @media (max-width: 768px) {
          .nb-links { display: none; }
          .nb-burger { display: flex; }
          .nb-cart, .nb-auth { display: none; }
          .nb-nav { height: 60px; padding: 0 0.85rem; }
          .nb-drawer { top: 60px; }
          .nb-drawer { max-height: calc(100dvh - 60px); }
          .nb-brand { min-width: 0; max-width: calc(100vw - 76px); }
          .nb-brand-badge { width: 31px; height: 40px; }
          .nb-brand-name {
            font-size: 0.96rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .nb-login-prompt {
            top: 72px;
            right: 0.75rem;
            left: 0.75rem;
            width: auto;
          }
          .nb-login-prompt-actions {
            flex-wrap: wrap;
          }
          .nb-login-prompt-link,
          .nb-login-prompt-dismiss {
            flex: 1 1 140px;
          }
        }

        @media (max-width: 420px) {
          .nb-nav { padding: 0 0.7rem; }
          .nb-brand { gap: 0.42rem; max-width: calc(100vw - 68px); }
          .nb-brand-badge { width: 28px; height: 36px; }
          .nb-brand-name { font-size: 0.88rem; letter-spacing: -0.02em; }
          .nb-burger { width: 34px; height: 34px; }
          .nb-drawer { padding: 1rem 0.9rem 1.25rem; }
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

          <div className="nb-auth">
            {authUser ? (
              <>
                <span className="nb-auth-chip">{authUser.name || authUser.email}</span>
                <button
                  type="button"
                  className="nb-auth-button"
                  onClick={handleLogoutClick}
                  disabled={loggingOut}
                >
                  {loggingOut ? "Logging Out..." : "Logout"}
                </button>
              </>
            ) : (
              <Link to="/login" className="nb-auth-link">
                Login
              </Link>
            )}
          </div>
        </div>

        <button
          className={`nb-burger ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
        >
          <span /><span /><span />
        </button>
      </nav>

      <AnimatePresence>
        {!authUser && showLoginPrompt && location.pathname !== "/login" && (
          <motion.div
            className="nb-login-prompt"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <div className="nb-login-prompt-title">Login to Order</div>
            <div className="nb-login-prompt-copy">
              Customers need to login before placing an order or starting checkout.
            </div>
            <div className="nb-login-prompt-actions">
              <Link to="/login" className="nb-login-prompt-link">Login Now</Link>
              <button
                type="button"
                className="nb-login-prompt-dismiss"
                onClick={() => setShowLoginPrompt(false)}
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-navigation"
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
            <div className="nb-drawer-divider" />
            {authUser ? (
              <>
                <div className="nb-drawer-link" style={{ cursor: "default" }}>
                  {authUser.name || authUser.email}
                </div>
                <button
                  type="button"
                  className="nb-drawer-link"
                  onClick={handleLogoutClick}
                  style={{ background: "transparent", border: "none", textAlign: "left" }}
                >
                  {loggingOut ? "Logging Out..." : "Logout"}
                </button>
              </>
            ) : (
              <Link to="/login" className={`nb-drawer-link ${location.pathname === "/login" ? "nb-active" : ""}`}>
                Login
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
