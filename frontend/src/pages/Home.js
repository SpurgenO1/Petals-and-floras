import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import FrameAnimation from "../components/FrameAnimation";

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

const staggerContainer = {
  visible: { transition: { staggerChildren: 0.2 } }
};

function Home() {
  return (
    <div className="home-overhaul">
      {/* 3D Hero Section */}
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

      {/* About Section */}
      <section id="about" className="section-padding">
        <motion.div 
          className="section-title"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <h2>Our Philosophy</h2>
          <p>Flowers brighten lives, express emotions, and create memories. At Petals and Flora, we focus on fresh blossoms, unique arrangements, and reliable delivery.</p>
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

      {/* Services Section */}
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
            { title: "Floral Arrangements", desc: "Weddings, Events, Sympathy arrangements.", icon: "💐" },
            { title: "Daily Delivery", desc: "Reliable and fresh flower delivery to your doorstep.", icon: "🚚" },
            { title: "Custom Orders", desc: "Custom bouquets and unique gift baskets.", icon: "🎨" },
            { title: "Plant Care", desc: "Expert tips and support to keep your greenery thriving.", icon: "🌿" }
          ].map((service, i) => (
            <motion.div key={i} className="premium-card text-center" variants={fadeInUp}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{service.icon}</div>
              <h3>{service.title}</h3>
              <p>{service.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Gallery Section */}
      <section className="section-padding">
        <div className="section-title">
          <h2>Visual Inspiration</h2>
          <p>Take a look at some of our favorite arrangements.</p>
        </div>
        <div className="gallery-grid">
          {[
            "Red rose bouquet in white box",
            "Pink roses with baby's breath",
            "Red carnations bouquet",
            "Mixed floral basket",
            "Multi-color bouquet",
            "Blue background collection"
          ].map((item, i) => (
            <motion.div 
              key={i} 
              className="gallery-item"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <div style={{ width: "100%", height: "100%", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontStyle: "italic", color: "#999", padding: "1rem", textAlign: "center" }}>
                {item}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
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
              <p>📧 sales@petalsandfloras.com</p>
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
            <a href="https://wa.me/918055895353" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
              WhatsApp Us Now
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

export default Home;
