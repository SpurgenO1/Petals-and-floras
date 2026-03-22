import { useEffect, useMemo, useState, useRef } from "react";

const TOTAL_FRAMES = 192;

// Helper to pre-calculate paths
const framePaths = Array.from({ length: TOTAL_FRAMES }, (_, i) => {
  const frameNum = String(i + 1).padStart(3, "0");
  try {
    return require(`../assets/3d-images/ezgif-frame-${frameNum}.jpg`);
  } catch (e) {
    return null;
  }
}).filter(Boolean);

function FrameAnimation() {
  const [frameIndex, setFrameIndex] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    if (framePaths.length <= 1) return;

    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const scrollProgress = Math.max(0, Math.min(1, -rect.top / (rect.height - window.innerHeight)));
      
      const nextFrame = Math.floor(scrollProgress * (framePaths.length - 1));
      if (nextFrame !== frameIndex) {
        setFrameIndex(nextFrame);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [frameIndex]);

  if (framePaths.length === 0) {
    return (
      <section className="frame-fallback">
        <h2>Premium 3D Floral Experience</h2>
        <p>Pre-loading breathtaking animations...</p>
      </section>
    );
  }

  return (
    <div className="hero-wrapper" ref={containerRef}>
      <div className="sticky-container">
        <img
          src={framePaths[frameIndex]}
          alt="3D Floral Animation"
          className="frame-image"
          loading="eager"
        />
        <div className="hero-overlay">
          <div className="hero-content">
            <h1>Nature's Beauty in Every Petal</h1>
            <p>Experience fresh flowers and unique floral arrangements delivered with love in Chennai.</p>
            <div className="hero-buttons">
              <a href="#products" className="btn btn-primary">Shop Collection</a>
              <a href="#about" className="btn btn-secondary">Learn More</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FrameAnimation;
