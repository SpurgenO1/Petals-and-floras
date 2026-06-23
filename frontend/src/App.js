import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import LoadingScreen from "./components/LoadingScreen";
import { getCurrentUser, logoutUser, setRuntimeAuthUser } from "./services/api";

const Home = lazy(() => import("./pages/Home"));
const Products = lazy(() => import("./pages/Products"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Login = lazy(() => import("./pages/Login"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const AdminPortal = lazy(() => import("./pages/AdminPortal"));
const Orders = lazy(() => import("./pages/Orders"));

function RouteFallback() {
  return <div className="route-loading" aria-hidden="true" />;
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

function AppLayout({
  authUser,
  cart,
  setCart,
  removeFromCart,
  updateCartQuantity,
  clearCart,
  cartCount,
  handleAuthSuccess,
  handleLogout,
}) {
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <>
      <ScrollToTop />
      <Navbar cartCount={cartCount} authUser={authUser} onLogout={handleLogout} />
      <main className={`app-content ${isHomePage ? "app-content-home" : "app-content-inner"}`}>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products cart={cart} setCart={setCart} />} />
            <Route
              path="/cart"
              element={<Cart cart={cart} removeFromCart={removeFromCart} updateCartQuantity={updateCartQuantity} authUser={authUser} />}
            />
            <Route
              path="/checkout"
              element={<Checkout cart={cart} clearCart={clearCart} authUser={authUser} />}
            />
            <Route path="/orders" element={<Orders authUser={authUser} />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact authUser={authUser} />} />
            <Route
              path="/login"
              element={<Login authUser={authUser} onAuthSuccess={handleAuthSuccess} />}
            />
            <Route
              path="/auth/callback"
              element={<AuthCallback onAuthSuccess={handleAuthSuccess} />}
            />
            <Route path="/admin" element={<AdminPortal authUser={authUser} onAuthSuccess={handleAuthSuccess} />} />
            <Route path="/admin/*" element={<AdminPortal authUser={authUser} onAuthSuccess={handleAuthSuccess} />} />
            {/* Redirect any unmatched paths to home instead of rendering a blank React error */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />
    </>
  );
}

function App() {
  const [authUser, setAuthUser] = useState(null);
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("pf_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    localStorage.setItem("pf_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    setRuntimeAuthUser(authUser);
  }, [authUser]);

  useEffect(() => {
    let mounted = true;

    getCurrentUser()
      .then((response) => {
        if (mounted) {
          setAuthUser(response.data);
        }
      })
      .catch(() => {
        if (mounted) {
          setAuthUser(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowLoader(false);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, []);

  const removeFromCart = (cartKeyToRemove) => {
    setCart((current) =>
      current.filter((item) => (item.cartKey || `${item.id}-${item.purchaseType || "flower"}`) !== cartKeyToRemove)
    );
  };

  const updateCartQuantity = (cartKeyToUpdate, nextQty) => {
    const safeQty = Number(nextQty || 0);
    setCart((current) =>
      safeQty <= 0
        ? current.filter((item) => (item.cartKey || `${item.id}-${item.purchaseType || "flower"}`) !== cartKeyToUpdate)
        : current.map((item) =>
            (item.cartKey || `${item.id}-${item.purchaseType || "flower"}`) === cartKeyToUpdate
              ? { ...item, qty: safeQty }
              : item
          )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const handleAuthSuccess = (user) => {
    setAuthUser(user);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      // Keep local auth state in sync even if the session already expired.
    } finally {
      setAuthUser(null);
    }
  };

  const cartCount = cart.reduce((sum, item) => sum + Number(item.qty || 1), 0);

  return (
    <>
      <LoadingScreen visible={showLoader} />
      <Router>
        <AppLayout
          authUser={authUser}
          cart={cart}
          setCart={setCart}
          removeFromCart={removeFromCart}
          updateCartQuantity={updateCartQuantity}
          clearCart={clearCart}
          cartCount={cartCount}
          handleAuthSuccess={handleAuthSuccess}
          handleLogout={handleLogout}
        />
      </Router>
    </>
  );
}

export default App;
