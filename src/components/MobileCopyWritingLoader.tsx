import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCopyWritingProducts } from '@/contexts/CopyWritingProductsContext';
import { useAuth } from '@/contexts/AuthContext';

const CopyWritingLoader = () => {
  const { loading, progress, products, stage, details } = useCopyWritingProducts();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/copy-writing-products');
  };

  // Only show for Media Buyer and Admin users
  if (!user || (user.position !== 'Media Buyer' && user.role !== 'admin')) {
    return null;
  }

  // Show on both mobile and desktop when loading and no products loaded yet
  if (!loading || products.length > 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0, x: -20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0, x: -20 }}
        className="fixed left-6 bottom-6 md:left-auto md:right-6 md:bottom-24 z-50" // Mobile: left side, Desktop: above chatbot with smaller gap
      >
        <div className="relative">
          {/* Floating Circle with Progress */}
          <div 
            className="w-14 h-14 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform duration-200"
            onClick={handleClick}
          >
            {/* Progress Ring */}
            <svg className="absolute inset-0 w-14 h-14 transform -rotate-90">
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth="2"
              />
              <motion.circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 24}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 24 }}
                animate={{ 
                  strokeDashoffset: 2 * Math.PI * 24 * (1 - progress / 100)
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </svg>
            
            {/* Icon - static without rotation */}
            <Edit3 className="w-6 h-6 text-white" />
          </div>

          {/* Pulse Animation */}
          <motion.div
            className="absolute inset-0 w-14 h-14 bg-blue-400 rounded-full opacity-20 pointer-events-none"
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Progress Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -top-2 -left-2 md:-right-2 md:left-auto bg-white rounded-full px-2 py-1 shadow-md min-w-[36px] text-center"
          >
            <span className="text-xs font-bold text-blue-700">
              {Math.round(progress)}%
            </span>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CopyWritingLoader; 