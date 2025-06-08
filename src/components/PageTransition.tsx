import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
  type?: 'slide' | 'fade' | 'scale' | 'slideUp';
}

// Different animation variants
const slideVariants = {
  initial: { opacity: 0, x: 30 },
  in: { opacity: 1, x: 0 },
  out: { opacity: 0, x: -30 },
};

const fadeVariants = {
  initial: { opacity: 0 },
  in: { opacity: 1 },
  out: { opacity: 0 },
};

const scaleVariants = {
  initial: { opacity: 0, scale: 0.95 },
  in: { opacity: 1, scale: 1 },
  out: { opacity: 0, scale: 1.05 },
};

const slideUpVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const pageTransition = {
  type: 'tween',
  ease: [0.25, 0.46, 0.45, 0.94], // Custom cubic-bezier
  duration: 0.3,
};

const PageTransition: React.FC<PageTransitionProps> = ({ 
  children, 
  type = 'slide' 
}) => {
  const location = useLocation();

  const getVariants = () => {
    switch (type) {
      case 'fade': return fadeVariants;
      case 'scale': return scaleVariants;
      case 'slideUp': return slideUpVariants;
      default: return slideVariants;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={getVariants()}
        transition={pageTransition}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition; 