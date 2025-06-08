import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedLoaderProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

const AnimatedLoader: React.FC<AnimatedLoaderProps> = ({ 
  text = 'Loading...', 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  const containerVariants = {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: { duration: 0.3 }
    }
  };

  const spinnerVariants = {
    animate: {
      rotate: 360,
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }
    }
  };

  const textVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { delay: 0.2, duration: 0.4 }
    }
  };

  return (
    <motion.div 
      className="flex flex-col items-center justify-center min-h-[50vh]"
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      <motion.div
        className={`${sizeClasses[size]} border-4 border-gray-200 border-t-primary rounded-full`}
        variants={spinnerVariants}
        animate="animate"
      />
      <motion.p 
        className="mt-4 text-gray-600 text-sm sm:text-base"
        variants={textVariants}
        initial="initial"
        animate="animate"
      >
        {text}
      </motion.p>
    </motion.div>
  );
};

export default AnimatedLoader; 