import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Products from "./pages/Products";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Login from "./pages/Login";
import WhatsAppButton from "./components/WhatsAppButton";
import LoadingScreen from "./components/LoadingScreen";
import { getCurrentUser, logoutUser } from "./services/api";

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
        </Routes>
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

  useEffect(() => {
    localStorage.setItem("pf_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
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

  const [showLoader, setShowLoader] = useState(true);

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
