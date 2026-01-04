import { motion } from "framer-motion";

const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden -z-10 bg-[#FFF5E6] dark:bg-boxdark-2">
      {/* Base Layer */}
      <div className="absolute inset-0 bg-[#FFF5E6] dark:opacity-0" />

      {/* Animated Orb 1 - Warm Orange */}
      <motion.div
        animate={{
          x: [0, 100, -80, 0],
          y: [0, -80, 80, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ willChange: "transform" }}
        className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-primary/30 rounded-full blur-[80px] mix-blend-multiply dark:mix-blend-soft-light"
      />

      {/* Animated Orb 2 - Peach/Coral */}
      <motion.div
        animate={{
          x: [0, -100, 80, 0],
          y: [0, 90, -90, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
        style={{ willChange: "transform" }}
        className="absolute top-1/4 -right-20 w-[650px] h-[650px] bg-[#FFB380]/30 rounded-full blur-[90px] mix-blend-multiply dark:mix-blend-soft-light"
      />

      {/* Animated Orb 3 - Warm Gold */}
      <motion.div
        animate={{
          x: [30, -80, 50, 30],
          y: [80, -50, 40, 80],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        style={{ willChange: "transform" }}
        className="absolute -bottom-40 left-1/4 w-[700px] h-[700px] bg-[#FFD700]/20 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-soft-light"
      />

      {/* Grain/Noise Texture for Premium Feel */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </div>
  );
};

export default AnimatedBackground;
