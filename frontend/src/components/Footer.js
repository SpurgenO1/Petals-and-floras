import logoMark from "../assets/petals-floras-logo.png";

function Footer() {
  return (
    <footer className="footer" style={{ padding: "4rem 5%", background: "#1a1a1e", color: "#fff" }}>
      <style>{`
        @media (max-width: 640px) {
          .footer {
            padding: 2.5rem 1rem calc(2rem + env(safe-area-inset-bottom)) !important;
          }

          .footer-grid {
            gap: 1.5rem !important;
            text-align: center !important;
          }

          .footer-brand {
            justify-content: center;
          }

          .footer-brand-title {
            font-size: 1.45rem !important;
          }
        }
      `}</style>
      <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "2rem", textAlign: "left" }}>
        <div>
          <div className="footer-brand" style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "1rem" }}>
            <span
              style={{
                width: "48px",
                height: "64px",
                flexShrink: 0,
              }}
            >
              <img
                src={logoMark}
                alt="Petals and Flora logo"
                style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center", display: "block" }}
              />
            </span>
            <h3
              className="footer-brand-title"
              style={{
                color: "#fff",
                marginBottom: 0,
                fontFamily: "'Bodoni Moda', serif",
                fontWeight: 500,
                fontSize: "1.8rem",
                letterSpacing: "-0.04em",
                lineHeight: 1,
              }}
            >
              Petals <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", color: "rgba(255,255,255,0.72)" }}>&amp;</span> Flora
            </h3>
          </div>
          <p style={{ opacity: 0.7 }}>Fresh flowers and unique floral arrangements for all your special moments.</p>
        </div>
        <div>
          <h4 style={{ marginBottom: "1rem" }}>Contact Us</h4>
          <p style={{ opacity: 0.7 }}>No.27, VOC Street, West Tambaram, Chennai</p>
          <p style={{ opacity: 0.7 }}>+91 80558 95353</p>
          <p style={{ opacity: 0.7 }}>petalsandflora@gmail.com</p>
        </div>
        <div>
          <h4 style={{ marginBottom: "1rem" }}>Working Hours</h4>
          <p style={{ opacity: 0.7 }}>Mon - Sun: 9:00 AM - 8:30 PM</p>
        </div>
      </div>
      <div style={{ marginTop: "3rem", paddingTop: "2rem", borderTop: "1px solid rgba(255,255,255,0.1)", opacity: 0.5, fontSize: "0.9rem" }}>
        &copy; {new Date().getFullYear()} Designed and Developed by Narean Raj D & Spurgen A.
      </div>
    </footer>
  );
}

export default Footer;
