import { useEffect, useRef, useState } from "react";

const framesContext = require.context(
  "../assets/3d-images",
  false,
  /ezgif-frame-\d+\.jpg$/
);

const framePaths = framesContext
  .keys()
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  .map((path) => framesContext(path));

function FrameAnimation() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const scrollRafRef = useRef(null);
  const imagesRef = useRef([]);
  const targetFrameRef = useRef(0);
  const currentFrameRef = useRef(0);
  const readyCountRef = useRef(0);
  const hasVisibleFrameRef = useRef(false);
  const [hasVisibleFrame, setHasVisibleFrame] = useState(false);

  useEffect(() => {
    if (!framePaths.length || !canvasRef.current) {
      return undefined;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { alpha: false });

    if (!context) {
      return undefined;
    }

    let isMounted = true;

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const resizeCanvas = () => {
      const canvasWidth = canvas.clientWidth || window.innerWidth;
      const canvasHeight = canvas.clientHeight || window.innerHeight;
      const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const nextWidth = Math.round(canvasWidth * devicePixelRatio);
      const nextHeight = Math.round(canvasHeight * devicePixelRatio);

      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }

      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
    };

    const drawFrame = (frameIndex) => {
      const image = imagesRef.current[frameIndex];

      if (!image || !image.complete || !image.naturalWidth) {
        return false;
      }

      const canvasWidth = canvas.clientWidth || window.innerWidth;
      const canvasHeight = canvas.clientHeight || window.innerHeight;
      const scale = Math.max(canvasWidth / image.naturalWidth, canvasHeight / image.naturalHeight);
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      const offsetX = (canvasWidth - drawWidth) / 2;
      const offsetY = (canvasHeight - drawHeight) / 2;

      context.clearRect(0, 0, canvasWidth, canvasHeight);
      context.fillStyle = "#050203";
      context.fillRect(0, 0, canvasWidth, canvasHeight);
      context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

      return true;
    };

    const drawNearestAvailableFrame = (desiredFrame) => {
      const roundedFrame = Math.round(desiredFrame);
      const maxOffset = framePaths.length - 1;

      for (let offset = 0; offset <= maxOffset; offset += 1) {
        const nextIndex = roundedFrame + offset;
        if (nextIndex < framePaths.length && drawFrame(nextIndex)) {
          return true;
        }

        const previousIndex = roundedFrame - offset;
        if (previousIndex >= 0 && drawFrame(previousIndex)) {
          return true;
        }
      }

      return false;
    };

    const updateTargetFrame = () => {
      if (!containerRef.current) {
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const distance = Math.max(rect.height - window.innerHeight, 1);
      const progress = clamp(-rect.top / distance, 0, 1);
      targetFrameRef.current = progress * (framePaths.length - 1);
    };

    const requestTargetRefresh = () => {
      if (scrollRafRef.current) {
        return;
      }

      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = null;
        updateTargetFrame();
      });
    };

    const animate = () => {
      const delta = targetFrameRef.current - currentFrameRef.current;
      currentFrameRef.current += delta * 0.12;

      const didDraw = drawNearestAvailableFrame(currentFrameRef.current);
      if (didDraw && !hasVisibleFrameRef.current && isMounted) {
        hasVisibleFrameRef.current = true;
        setHasVisibleFrame(true);
      }

      rafRef.current = window.requestAnimationFrame(animate);
    };

    const handleFrameLoad = () => {
      readyCountRef.current += 1;
      if (!hasVisibleFrameRef.current && isMounted) {
        const threshold = Math.min(6, framePaths.length);
        if (readyCountRef.current >= threshold) {
          hasVisibleFrameRef.current = true;
          setHasVisibleFrame(true);
        }
      }
    };

    resizeCanvas();
    updateTargetFrame();

    imagesRef.current = framePaths.map((src, index) => {
      const image = new Image();
      image.decoding = "async";
      image.loading = "eager";
      image.src = src;

      if (index === 0) {
        image.onload = () => {
          handleFrameLoad();
          resizeCanvas();
          if (isMounted) {
            hasVisibleFrameRef.current = true;
            setHasVisibleFrame(true);
          }
          drawFrame(0);
        };

        if (image.complete) {
          image.onload();
        }
      } else if (image.complete) {
        handleFrameLoad();
      } else {
        image.onload = handleFrameLoad;
      }

      return image;
    });

    resizeObserverRef.current = new ResizeObserver(() => {
      resizeCanvas();
      drawNearestAvailableFrame(currentFrameRef.current);
    });
    resizeObserverRef.current.observe(canvas);

    rafRef.current = window.requestAnimationFrame(animate);
    window.addEventListener("scroll", requestTargetRefresh, { passive: true });
    window.addEventListener("resize", requestTargetRefresh, { passive: true });

    return () => {
      isMounted = false;

      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }

      if (scrollRafRef.current) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }

      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }

      window.removeEventListener("scroll", requestTargetRefresh);
      window.removeEventListener("resize", requestTargetRefresh);
    };
  }, []);

  return (
    <div className="hero-wrapper" ref={containerRef}>
      <div className="sticky-container">
        <canvas
          ref={canvasRef}
          className={`hero-canvas ${hasVisibleFrame ? "hero-canvas-ready" : ""}`}
          aria-hidden="true"
        />
        {!hasVisibleFrame ? (
          <div className="hero-fallback" aria-hidden="true">
            <div className="hero-fallback-glow" />
          </div>
        ) : null}

        <div className="hero-overlay">
          <div className="hero-content">
            <h1>
              <span>Nature's Beauty in</span>
              <em>Every Petal</em>
            </h1>
            <p>Experience fresh flowers and unique floral arrangements delivered with love in Chennai.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FrameAnimation;
