import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import WhatsAppButton from "./components/WhatsAppButton";
import LoadingScreen from "./components/LoadingScreen";
import { getCurrentUser, logoutUser, setRuntimeAuthUser } from "./services/api";

const Home = lazy(() => import("./pages/Home"));
const Products = lazy(() => import("./pages/Products"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Login = lazy(() => import("./pages/Login"));
const AdminPortal = lazy(() => import("./pages/AdminPortal"));

function RouteFallback() {
  return <div className="route-loading" aria-hidden="true" />;
}

function AppLayout({
  authUser,
  cart,
  setCart,
  removeFromCart,
  clearCart,
  cartCount,
  handleAuthSuccess,
  handleLogout,
}) {
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <>
      <Navbar cartCount={cartCount} authUser={authUser} onLogout={handleLogout} />
      <main className={`app-content ${isHomePage ? "app-content-home" : "app-content-inner"}`}>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products cart={cart} setCart={setCart} />} />
            <Route
              path="/cart"
              element={<Cart cart={cart} removeFromCart={removeFromCart} authUser={authUser} />}
            />
            <Route
              path="/checkout"
              element={<Checkout cart={cart} clearCart={clearCart} authUser={authUser} />}
            />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact authUser={authUser} />} />
            <Route
              path="/login"
              element={<Login authUser={authUser} onAuthSuccess={handleAuthSuccess} />}
            />
            <Route path="/admin" element={<AdminPortal authUser={authUser} />} />
            <Route path="/admin/*" element={<AdminPortal authUser={authUser} />} />
          </Routes>
        </Suspense>
      </main>
      <WhatsAppButton />
      <Footer />
    </>
  );
}

function App() {
  const [authUser, setAuthUser] = useState(() => {
    try {
      const saved = localStorage.getItem("pf_auth_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("pf_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const initialAuthUserRef = useRef(authUser);
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    localStorage.setItem("pf_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    setRuntimeAuthUser(authUser);

    try {
      if (authUser) {
        localStorage.setItem("pf_auth_user", JSON.stringify(authUser));
      } else {
        localStorage.removeItem("pf_auth_user");
      }
    } catch {
      // Ignore storage failures and keep the in-memory auth state.
    }
  }, [authUser]);

  useEffect(() => {
    if (!initialAuthUserRef.current) {
      return undefined;
    }

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

  const removeFromCart = (idToRemove) => {
    setCart(cart.filter((item) => item.id !== idToRemove));
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
