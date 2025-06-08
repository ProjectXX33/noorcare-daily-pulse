import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedNavItemProps {
  children: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

const AnimatedNavItem: React.FC<AnimatedNavItemProps> = ({ 
  children, 
  isActive = false, 
  onClick, 
  className = '' 
}) => {
  return (
    <motion.div
      className={className}
      onClick={onClick}
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      whileTap={{ 
        scale: 0.98,
        transition: { duration: 0.1 }
      }}
      animate={{
        backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
        transition: { duration: 0.2 }
      }}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedNavItem; 