import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ProductCard from "../components/ProductCard";
import { getProducts } from "../services/api";

function Products({ cart, setCart }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("Tambaram");

  useEffect(() => {
    getProducts()
      .then((res) => {
        setProducts(res.data);
        setError("");
      })
      .catch(() => {
        setError("Failed to load products. Please try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const addToCart = (product) => {
    const exists = cart.find((item) => item.id === product.id);
    if (exists) {
      const updated = cart.map((item) =>
        item.id === product.id ? { ...item, qty: (item.qty || 1) + 1 } : item
      );
      setCart(updated);
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory = categoryFilter === "" || p.category === categoryFilter;
    // For now, location filter is UI only, but we can mock it
    return matchesCategory;
  });

  const categories = ["Roses", "Gerbera", "Bouquet", "Asiatic Lily"];

  if (loading) return <div className="section-padding text-center"><p>Gathering fresh petals...</p></div>;
  if (error) return <div className="section-padding text-center"><p>{error}</p></div>;

  return (
    <div className="section-padding">
      <div className="section-title">
        <h2>Our Premium Collection</h2>
        <p>Explore our wide range of fresh flowers, bouquets, and exotic arrangements.</p>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <span>📍</span>
          <select 
            className="filter-select"
            value={locationFilter} 
            onChange={(e) => setLocationFilter(e.target.value)}
          >
            <option value="Chennai">All Chennai</option>
            <option value="Tambaram">West Tambaram</option>
            <option value="Nearby">Nearby Shops</option>
          </select>
        </div>

        <div className="filter-group">
          <span>💐</span>
          <select 
            className="filter-select"
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      <motion.div 
        className="grid"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.1 } }
        }}
      >
        {filteredProducts.map((product) => (
          <motion.div 
            key={product.id}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 }
            }}
          >
            <ProductCard product={product} addToCart={addToCart} />
          </motion.div>
        ))}
      </motion.div>

      {filteredProducts.length === 0 && (
        <div className="text-center mt-4">
          <p>No products found in this category.</p>
        </div>
      )}
    </div>
  );
}

export default Products;
