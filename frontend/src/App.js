import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Products from "./pages/Products";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import WhatsAppButton from "./components/WhatsAppButton";

function App() {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("pf_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("pf_cart", JSON.stringify(cart));
  }, [cart]);

  const removeFromCart = (idToRemove) => {
    setCart(cart.filter((item) => item.id !== idToRemove));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = cart.reduce((sum, item) => sum + Number(item.qty || 1), 0);

  return (
    <Router>
      <Navbar cartCount={cartCount} />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products cart={cart} setCart={setCart} />} />
          <Route
            path="/cart"
            element={<Cart cart={cart} removeFromCart={removeFromCart} />}
          />
          <Route
            path="/checkout"
            element={<Checkout cart={cart} clearCart={clearCart} />}
          />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </main>
      <WhatsAppButton />
      <Footer />
    </Router>
  );
}

export default App;
