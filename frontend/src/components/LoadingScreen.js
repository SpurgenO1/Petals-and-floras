import { lazy, Suspense, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const LegacyLoadingScreen = lazy(() => import("./LegacyLoadingScreen"));

export default function LoadingScreen({ visible }) {
  const [legacyReady, setLegacyReady] = useState(false);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    let active = true;
    import("./LegacyLoadingScreen").then(() => {
      if (active) {
        setLegacyReady(true);
      }
    });

    return () => {
      active = false;
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 5000,
            display: "grid",
            placeItems: "center",
            overflow: "hidden",
            background: "#080e08",
            fontFamily: "'Jost', sans-serif",
          }}
        >
          <Suspense fallback={null}>
            {legacyReady ? <LegacyLoadingScreen visible={visible} enabled /> : null}
          </Suspense>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            style={{
              position: "absolute",
              bottom: "7%",
              left: 0,
              right: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.65rem",
              zIndex: 10,
              pointerEvents: "none",
            }}
          >
            <motion.div
              style={{
                color: "#f6e7b1",
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(1.7rem, 4vw, 2.5rem)",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textAlign: "center",
              }}
              animate={{
                textShadow: [
                  "0 0 20px rgba(212,168,75,0.35), 0 0 55px rgba(192,53,78,0.18)",
                  "0 0 40px rgba(212,168,75,0.8),  0 0 90px rgba(192,53,78,0.42)",
                  "0 0 20px rgba(212,168,75,0.35), 0 0 55px rgba(192,53,78,0.18)",
                ],
              }}
              transition={{ duration: 3.2, repeat: Infinity }}
            >
              Petals and Flora
            </motion.div>

            <motion.div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.8rem",
              }}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.9 }}
            >
              <div style={{ width: 55, height: 1, background: "linear-gradient(90deg,transparent,rgba(212,168,75,0.7))" }} />
              <motion.span
                style={{ fontSize: "0.9rem" }}
                animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.3, 1] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                🌹
              </motion.span>
              <div style={{ width: 55, height: 1, background: "linear-gradient(90deg,rgba(212,168,75,0.7),transparent)" }} />
            </motion.div>

            <motion.div
              style={{
                color: "rgba(255,255,255,0.38)",
                fontSize: "0.68rem",
                letterSpacing: "0.44em",
                textTransform: "uppercase",
                fontWeight: 300,
              }}
              animate={{ opacity: [0.3, 0.68, 0.3] }}
              transition={{ duration: 3.5, repeat: Infinity }}
            >
              Blooming your moments
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              style={{
                width: 200,
                height: 2,
                background: "rgba(255,255,255,0.07)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <motion.div
                style={{
                  height: "100%",
                  background: "linear-gradient(90deg,#2d6a2d,#7b1a2e,#c0354e,#d4a84b,#f6e7b1)",
                  borderRadius: 2,
                  boxShadow: "0 0 12px 3px rgba(212,168,75,0.6)",
                }}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2.8, ease: [0.4, 0, 0.2, 1], delay: 0.8 }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
