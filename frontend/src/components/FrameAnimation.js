import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

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
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const fallbackImageRef = useRef(null);
  const frameIndexRef = useRef(0);
  const animationFrameRef = useRef(null);
  const imagesRef = useRef([]);
  const loadedRef = useRef([]);
  const loadingRef = useRef([]);
  const lastDrawnFrameRef = useRef(-1);

  useEffect(() => {
    if (framePaths.length <= 1) {
      return undefined;
    }

    const getCanvasContext = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return null;
      }

      return canvas.getContext("2d", { alpha: false });
    };

    const clampIndex = (index) => Math.max(0, Math.min(index, framePaths.length - 1));

    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) {
        return;
      }

      const bounds = container.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      const targetWidth = Math.max(1, Math.floor(bounds.width * ratio));
      const targetHeight = Math.max(1, Math.floor(window.innerHeight * ratio));

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }
    };

    const warmFrameWindow = (centerIndex) => {
      for (let offset = -3; offset <= 3; offset += 1) {
        const index = clampIndex(centerIndex + offset);
        if (imagesRef.current[index] || loadingRef.current[index]) {
          continue;
        }

        const image = new Image();
        loadingRef.current[index] = true;
        image.decoding = "async";
        image.src = framePaths[index];
        image.onload = () => {
          imagesRef.current[index] = image;
          loadedRef.current[index] = true;
          loadingRef.current[index] = false;

          if (
            index === 0 ||
            index === frameIndexRef.current ||
            lastDrawnFrameRef.current === -1
          ) {
            drawFrame(frameIndexRef.current);
          }
        };
        image.onerror = () => {
          loadingRef.current[index] = false;
        };
      }
    };

    const drawFrame = (index) => {
      const canvas = canvasRef.current;
      const context = getCanvasContext();
      if (!canvas || !context) {
        return;
      }

      const clampedIndex = clampIndex(index);
      let image = imagesRef.current[clampedIndex];

      if (!image || !loadedRef.current[clampedIndex]) {
        for (let fallback = clampedIndex; fallback >= 0; fallback -= 1) {
          if (loadedRef.current[fallback]) {
            image = imagesRef.current[fallback];
            break;
          }
        }
      }

      if (!image || !image.naturalWidth || !image.naturalHeight) {
        return;
      }

      resizeCanvas();

      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#050203";
      context.fillRect(0, 0, canvas.width, canvas.height);

      const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      const offsetX = (canvas.width - drawWidth) / 2;
      const offsetY = (canvas.height - drawHeight) / 2;

      context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
      lastDrawnFrameRef.current = clampedIndex;

      if (fallbackImageRef.current) {
        fallbackImageRef.current.style.opacity = "0";
      }
    };

    const updateFrame = () => {
      animationFrameRef.current = null;
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const scrollDistance = Math.max(rect.height - window.innerHeight, 1);
      const scrollProgress = Math.max(0, Math.min(1, -rect.top / scrollDistance));
      const nextFrame = Math.floor(scrollProgress * (framePaths.length - 1));
      warmFrameWindow(nextFrame);
      if (nextFrame !== frameIndexRef.current) {
        frameIndexRef.current = nextFrame;
        drawFrame(nextFrame);
      }
    };

    const handleScroll = () => {
      if (animationFrameRef.current !== null) return;
      animationFrameRef.current = window.requestAnimationFrame(updateFrame);
    };

    resizeCanvas();
    warmFrameWindow(0);
    drawFrame(0);
    updateFrame();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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
          ref={fallbackImageRef}
          src={framePaths[0]}
          alt="3D Floral Animation"
          className="frame-fallback-image"
          loading="eager"
          decoding="async"
        />
        <canvas ref={canvasRef} className="frame-canvas" aria-label="3D Floral Animation" />
        <div className="hero-overlay">
          <div className="hero-content">
            <h1>Nature's Beauty in Every Petal</h1>
            <p>Experience fresh flowers and unique floral arrangements delivered with love in Chennai.</p>
            <div className="hero-buttons">
              <Link to="/products" className="btn btn-primary">Shop Collection</Link>
              <a href="#about" className="btn btn-secondary">Learn More</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FrameAnimation;
