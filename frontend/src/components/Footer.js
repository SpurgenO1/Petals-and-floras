function Footer() {
  return (
    <footer className="footer" style={{ padding: "4rem 5%", background: "#1a1a1e", color: "#fff" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "2rem", textAlign: "left" }}>
        <div>
          <h3 style={{ color: "#d64a6e", marginBottom: "1rem" }}>Petals and Flora</h3>
          <p style={{ opacity: 0.7 }}>Fresh flowers and unique floral arrangements for all your special moments.</p>
        </div>
        <div>
          <h4 style={{ marginBottom: "1rem" }}>Contact Us</h4>
          <p style={{ opacity: 0.7 }}>📍 No.27, VOC Street, West Tambaram, Chennai</p>
          <p style={{ opacity: 0.7 }}>📞 +91 80558 95353</p>
          <p style={{ opacity: 0.7 }}>📧 petalsandflora@gmail.com</p>
        </div>
        <div>
          <h4 style={{ marginBottom: "1rem" }}>Working Hours</h4>
          <p style={{ opacity: 0.7 }}>Mon - Sun: 9:00 AM – 8:30 PM</p>
        </div>
      </div>
      <div style={{ marginTop: "3rem", paddingTop: "2rem", borderTop: "1px solid rgba(255,255,255,0.1)", opacity: 0.5, fontSize: "0.9rem" }}>
        &copy; {new Date().getFullYear()} Petals and Flora. All rights reserved.
      </div>
    </footer>
  );
}

export default Footer;
