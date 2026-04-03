import { motion } from "framer-motion";

function AnimatedSection({ children, className = "" }) {
  return (
    <motion.section
      className={className}
      style={{
        minHeight: "100vh",
        padding: "calc(var(--nav-height) + 3rem) 10% 4rem",
        background: "linear-gradient(180deg, #fff8fa 0%, #fffdfd 100%)",
      }}
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true, amount: 0.2 }}
    >
      {children}
    </motion.section>
  );
}


export default AnimatedSection;
