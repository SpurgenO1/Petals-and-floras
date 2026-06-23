import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import FrameAnimation from "../components/FrameAnimation";
import { getFeedback } from "../services/api";
import buggatiRose from "../assets/flowers/buggati_rose.png";
import tajmahalRose from "../assets/flowers/tajmahal_rose.png";
import emmaRose from "../assets/flowers/emma_rose.png";
import purpleRose from "../assets/flowers/purple_rose.png";
import goldStrikeRose from "../assets/flowers/gold_strike_rose.png";
import corvetteRose from "../assets/flowers/corvette_rose.png";
import noblesseRose from "../assets/flowers/noblesse_rose.png";
import hydrangea from "../assets/flowers/Hydrangea.png";

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

const staggerContainer = {
  visible: { transition: { staggerChildren: 0.2 } }
};

const galleryItems = [
  { name: "Buggati Rose", image: buggatiRose },
  { name: "Tajmahal Rose", image: tajmahalRose },
  { name: "Emma Rose", image: emmaRose },
  { name: "Purple Rose", image: purpleRose },
  { name: "Gold Strike Rose", image: goldStrikeRose },
  { name: "Corvette Rose", image: corvetteRose },
  { name: "Noblesse Rose", image: noblesseRose },
  { name: "Hydrangea", image: hydrangea }
];

const sanitizeText = (value) =>
  DOMPurify.sanitize(String(value || ""), {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

function Home() {
  const [recentFeedback, setRecentFeedback] = useState([]);

  useEffect(() => {
    let mounted = true;

    getFeedback()
      .then((response) => {
        if (mounted) {
          setRecentFeedback(Array.isArray(response.data) ? response.data.slice(0, 6) : []);
        }
      })
      .catch(() => {
        if (mounted) {
          setRecentFeedback([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="home-overhaul">
      <FrameAnimation />

      <section className="hero-cta-section">
        <motion.div
          className="hero-cta-card"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true }}
        >
          <p className="hero-cta-eyebrow">Ready to explore?</p>
          <h1 className="hero-cta-title">Discover Our Floral Collection</h1>
          <Link to="/products" className="btn btn-primary">Shop Collection</Link>
        </motion.div>
      </section>

      <section id="about" className="section-padding">
        <motion.div
          className="section-title"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <h2>Our Philosophy</h2>
          <p>
            Flowers brighten lives, express emotions, and create memories. At Petals and Flora,
            we focus on fresh blossoms, unique arrangements, and reliable delivery.
          </p>
        </motion.div>

        <div className="about-grid">
          <motion.div
            className="premium-card"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h3>Freshness Guaranteed</h3>
            <p>Every bouquet is handcrafted with the freshest flowers sourced directly from the best growers.</p>
          </motion.div>
          <motion.div
            className="premium-card"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h3>Unique Designs</h3>
            <p>Our experienced florists create bespoke arrangements that tell a story and leave a lasting impression.</p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding" style={{ background: "rgba(214, 74, 110, 0.03)" }}>
        <div className="section-title">
          <h2>Our Services</h2>
          <p>Explore our actual offerings, verified for quality and reliability.</p>
        </div>
        <motion.div
          className="grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {[
            { title: "Floral Arrangements", desc: "Weddings,All Kind of Events", icon: "💐" },
            { title: "Daily Delivery", desc: "Reliable and fresh flower delivery to your doorstep.", icon: "🚚" },
            { title: "Custom Orders", desc: "Custom bouquets and unique gift baskets.", icon: "🎨" }
          ].map((service, i) => (
            <motion.div key={i} className="premium-card text-center" variants={fadeInUp}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{service.icon}</div>
              <h3>{service.title}</h3>
              <p>{service.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="section-padding">
        <div className="section-title">
          <h2>Visual Inspiration</h2>
          <p>Take a look at some of our favorite arrangements.</p>
        </div>
        <div className="gallery-grid">
          {galleryItems.map((item, i) => (
            <motion.div
              key={i}
              className="gallery-item"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <div className="gallery-image-shell">
                <img src={item.image} alt={item.name} loading="lazy" />
              </div>
              <p className="gallery-caption">{item.name}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section
        className="section-padding"
        style={{
          paddingTop: "2.5rem",
          background:
            "linear-gradient(180deg, rgba(214, 74, 110, 0.05) 0%, rgba(255,255,255,0.95) 100%)",
        }}
      >
        <motion.div
          className="section-title"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <h2>What Our Customers Say</h2>
          <p>Real feedback from people who ordered from Petals and Flora.</p>
        </motion.div>

        {recentFeedback.length === 0 ? (
          <motion.div
            className="premium-card text-center"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h3 style={{ marginBottom: "0.75rem" }}>No feedback yet</h3>
            <p>Be the first to share your experience with our flowers, service, and delivery.</p>
          </motion.div>
        ) : (
          <div
            className="grid"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              alignItems: "stretch",
            }}
          >
            {recentFeedback.map((entry, index) => (
              <motion.div
                key={entry.id}
                className="premium-card"
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                viewport={{ once: true }}
                style={{ height: "100%" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", marginBottom: "0.75rem" }}>
                  <div>
                    <p style={{ fontWeight: 700, marginBottom: "0.25rem" }}>{sanitizeText(entry.user_name)}</p>
                    <p style={{ opacity: 0.6, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {entry.target_type === "flower" && entry.product_name ? `Flower - ${sanitizeText(entry.product_name)}` : "Shop"}
                    </p>
                  </div>
                  <div style={{ color: "#d64a6e", fontWeight: 700, whiteSpace: "nowrap" }}>
                    {"★".repeat(Number(entry.rating || 0))}
                  </div>
                </div>
                <h3 style={{ marginBottom: "0.65rem", color: "#d64a6e" }}>{sanitizeText(entry.title)}</h3>
                <p style={{ opacity: 0.8, lineHeight: 1.7 }}>{sanitizeText(entry.message)}</p>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <section id="contact" className="section-padding" style={{ background: "#1a1a1e", color: "#fff" }}>
        <div className="about-grid">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 style={{ color: "var(--primary)", fontSize: "2.5rem", marginBottom: "1.5rem" }}>Get in Touch</h2>
            <p style={{ fontSize: "1.1rem", opacity: 0.8, marginBottom: "2rem" }}>
              We stay in constant communication with customers until the job is done.
              For quotes, questions, or special requests — contact anytime.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <p>📍 No.27, VOC Street, West Tambaram, Chennai</p>
              <p>📞 +91 80558 95353</p>
              <p>✉️ sales@petalsandfloras.com</p>
            </div>
          </motion.div>
          <motion.div
            className="premium-card"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h3>Visit Our Shop</h3>
            <p style={{ opacity: 0.7, marginBottom: "2rem" }}>Come experience the fragrance and beauty of fresh flowers in person.</p>
            <a href={process.env.REACT_APP_WHATSAPP_URL || "https://wa.me/918055895353"} className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
              WhatsApp Us Now
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

export default Home;
