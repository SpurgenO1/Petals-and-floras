import { useEffect, useRef, useState } from "react";

const framesContext = require.context(
  "../assets/3d-images",
  false,
  /ezgif-frame-\d+\.jpg$/
);

const TOTAL_FRAMES = 192;

const framePaths = Array.from({ length: TOTAL_FRAMES }, (_, index) => {
  const frameNumber = String(index + 1).padStart(3, "0");
  return framesContext(`./ezgif-frame-${frameNumber}.jpg`);
});

function FrameAnimation() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const scrollRafRef = useRef(null);
  const imagesRef = useRef([]);
  const scrollFrameRef = useRef(0);
  const autoplayFrameRef = useRef(0);
  const currentFrameRef = useRef(0);
  const lastTimestampRef = useRef(0);
  const isScrollDrivingRef = useRef(false);
  const readyCountRef = useRef(0);
  const hasVisibleFrameRef = useRef(false);
  const [hasVisibleFrame, setHasVisibleFrame] = useState(false);
  const [useStaticHero, setUseStaticHero] = useState(false);

  const addMediaQueryListener = (query, listener) => {
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", listener);
      return () => query.removeEventListener("change", listener);
    }

    query.addListener(listener);
    return () => query.removeListener(listener);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncHeroMode = () => {
      setUseStaticHero(reducedMotionQuery.matches);
    };

    syncHeroMode();
    return addMediaQueryListener(reducedMotionQuery, syncHeroMode);
  }, []);

  useEffect(() => {
    if (useStaticHero || framePaths.length !== TOTAL_FRAMES || !canvasRef.current) {
      setHasVisibleFrame(false);
      hasVisibleFrameRef.current = false;
      scrollFrameRef.current = 0;
      autoplayFrameRef.current = 0;
      currentFrameRef.current = 0;
      lastTimestampRef.current = 0;
      isScrollDrivingRef.current = false;
      return undefined;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { alpha: false });

    if (!context) {
      return undefined;
    }

    let isMounted = true;
    let loadedFrameCount = 0;

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const resizeCanvas = () => {
      const canvasWidth = canvas.clientWidth || window.innerWidth;
      const canvasHeight = canvas.clientHeight || window.innerHeight;
      const isCompactViewport = window.innerWidth <= 768;
      const devicePixelRatio = Math.min(window.devicePixelRatio || 1, isCompactViewport ? 1.25 : 2);
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
      const maxOffset = TOTAL_FRAMES - 1;

      for (let offset = 0; offset <= maxOffset; offset += 1) {
        const nextIndex = roundedFrame + offset;
        if (nextIndex < TOTAL_FRAMES && drawFrame(nextIndex)) {
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
      scrollFrameRef.current = progress * (TOTAL_FRAMES - 1);
      isScrollDrivingRef.current = progress > 0.01;
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

    const animate = (timestamp) => {
      const elapsed = lastTimestampRef.current ? timestamp - lastTimestampRef.current : 16.67;
      lastTimestampRef.current = timestamp;

      if (!isScrollDrivingRef.current) {
        const autoplayFps = window.innerWidth <= 768 ? 18 : 24;
        autoplayFrameRef.current =
          (autoplayFrameRef.current + (elapsed / 1000) * autoplayFps) % TOTAL_FRAMES;
      }

      const targetFrame = isScrollDrivingRef.current
        ? scrollFrameRef.current
        : autoplayFrameRef.current;
      const delta = targetFrame - currentFrameRef.current;
      currentFrameRef.current += delta * 0.12;

      const didDraw = drawNearestAvailableFrame(currentFrameRef.current);
      if (didDraw && !hasVisibleFrameRef.current && isMounted) {
        hasVisibleFrameRef.current = true;
        setHasVisibleFrame(true);
      }

      rafRef.current = window.requestAnimationFrame(animate);
    };

    const handleFrameReady = (frameIndex, image) => {
      if (image && image.dataset?.heroReady === "true") {
        return;
      }

      if (image) {
        image.dataset.heroReady = "true";
      }

      loadedFrameCount += 1;
      readyCountRef.current = loadedFrameCount;

      if (frameIndex === 0) {
        resizeCanvas();
        const didDraw = drawFrame(0);
        if (didDraw && isMounted) {
          hasVisibleFrameRef.current = true;
          setHasVisibleFrame(true);
        }
      }

      if (!hasVisibleFrameRef.current && isMounted) {
        const threshold = Math.min(10, TOTAL_FRAMES);
        if (readyCountRef.current >= threshold) {
          drawNearestAvailableFrame(currentFrameRef.current);
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
      image.onload = () => handleFrameReady(index, image);
      image.onerror = () => handleFrameReady(index, image);
      image.src = src;

      if (image.complete) {
        window.setTimeout(() => handleFrameReady(index, image), 0);
      }

      return image;
    });

    const handleResize = () => {
      resizeCanvas();
      drawNearestAvailableFrame(currentFrameRef.current);
      requestTargetRefresh();
    };

    if (typeof ResizeObserver === "function") {
      resizeObserverRef.current = new ResizeObserver(handleResize);
      resizeObserverRef.current.observe(canvas);
    } else {
      window.addEventListener("resize", handleResize, { passive: true });
    }

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

      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", requestTargetRefresh);
      window.removeEventListener("resize", requestTargetRefresh);
    };
  }, [useStaticHero]);

  return (
    <div
      className={useStaticHero ? "hero-static-shell" : "hero-wrapper"}
      ref={useStaticHero ? undefined : containerRef}
    >
      <div className="sticky-container">
        {!useStaticHero ? (
          <canvas
            ref={canvasRef}
            className={`hero-canvas ${hasVisibleFrame ? "hero-canvas-ready" : ""}`}
            aria-hidden="true"
          />
        ) : null}
        {useStaticHero || !hasVisibleFrame ? (
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
