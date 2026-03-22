import { motion } from "framer-motion";

const flowers = [
  { emoji: "🌸", size: 40, duration: 15, delay: 0 },
  { emoji: "🌺", size: 30, duration: 18, delay: 5 },
  { emoji: "🌷", size: 35, duration: 20, delay: 2 },
  { emoji: "🌹", size: 45, duration: 25, delay: 10 },
  { emoji: "🌼", size: 25, duration: 12, delay: 7 },
  { emoji: "🏵️", size: 50, duration: 30, delay: 0 },
];

function FloatingFlowers() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 5, overflow: "hidden" }}>
      {Array.from({ length: 12 }).map((_, i) => {
        const flower = flowers[i % flowers.length];
        return (
          <motion.div
            key={i}
            initial={{ 
              x: `${Math.random() * 100}vw`, 
              y: "110vh", 
              rotate: 0,
              opacity: 0.3
            }}
            animate={{ 
              y: "-10vh", 
              rotate: 360,
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ 
              duration: flower.duration + Math.random() * 5, 
              repeat: Infinity, 
              delay: flower.delay + Math.random() * 10,
              ease: "linear"
            }}
            style={{ 
              position: "absolute", 
              fontSize: `${flower.size}px`,
              filter: "blur(1px)"
            }}
          >
            {flower.emoji}
          </motion.div>
        );
      })}
    </div>
  );
}

export default FloatingFlowers;
