import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, Package, Sparkles, Zap, Star, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCopyWritingProducts } from '@/contexts/CopyWritingProductsContext';
import { useAuth } from '@/contexts/AuthContext';
import Lottie from 'lottie-react';

const CopyWritingLoader = () => {
  const { loading, progress, products, stage, details } = useCopyWritingProducts();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Import the pencil animation dynamically
  const [pencilAnimation, setPencilAnimation] = React.useState(null);

  React.useEffect(() => {
    fetch('/animation/copywrite.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => setPencilAnimation(data))
      .catch(error => {
        console.error('Failed to load copywrite animation:', error);
        // Fallback - don't set animation data, component will show fallback icon
      });
  }, []);

  const handleClick = () => {
    navigate('/copy-writing-products');
  };

  // Only show for Media Buyer and Admin users
  if (!user || (user.position !== 'Media Buyer' && user.role !== 'admin')) {
    return null;
  }

  // Temporarily disabled - animation not showing properly
  // Show on both mobile and desktop when loading and no products loaded yet
  // if (!loading || products.length > 0) {
  //   return null;
  // }
  
  // Return null to hide the loader completely
  return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0, y: 100, rotate: -180 }}
        animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
        exit={{ opacity: 0, scale: 0, y: 100, rotate: 180 }}
        transition={{ 
          duration: 0.8, 
          ease: [0.25, 0.46, 0.45, 0.94],
          type: "spring",
          stiffness: 100,
          damping: 15
        }}
        className="fixed left-6 bottom-6 md:left-auto md:right-6 md:bottom-24 z-50"
      >
        <div className="relative group">
          {/* Outer Glow Ring */}
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
              rotate: [0, 360]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              ease: "linear"
            }}
            className="absolute inset-0 w-20 h-20 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 rounded-full blur-md"
          />

          {/* Main Container with Glass Effect */}
          <motion.div 
            className="relative w-20 h-20 bg-gradient-to-br from-slate-900/90 via-purple-900/90 to-indigo-900/90 backdrop-blur-xl rounded-full shadow-2xl flex items-center justify-center cursor-pointer border border-white/20 overflow-hidden"
            onClick={handleClick}
            whileHover={{ 
              scale: 1.15,
              rotate: 5,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
            }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
          >
            {/* Animated Background Gradient */}
            <motion.div
              animate={{ 
                background: [
                  "linear-gradient(45deg, #667eea 0%, #764ba2 100%)",
                  "linear-gradient(45deg, #f093fb 0%, #f5576c 100%)",
                  "linear-gradient(45deg, #4facfe 0%, #00f2fe 100%)",
                  "linear-gradient(45deg, #43e97b 0%, #38f9d7 100%)",
                  "linear-gradient(45deg, #667eea 0%, #764ba2 100%)"
                ]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full opacity-20"
            />

            {/* Pencil Lottie Animation */}
            <div className="relative z-10 w-12 h-12 flex items-center justify-center">
              {pencilAnimation ? (
                <Lottie 
                  animationData={pencilAnimation}
                  loop={true}
                  autoplay={true}
                  style={{ 
                    width: 48, 
                    height: 48,
                    filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))'
                  }}
                />
              ) : (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Edit3 className="w-8 h-8 text-white drop-shadow-lg" />
                </motion.div>
              )}
            </div>

            {/* Animated Progress Ring */}
            <svg className="absolute inset-0 w-20 h-20 transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="2"
              />
              <motion.circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 36}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 36 }}
                animate={{ 
                  strokeDashoffset: 2 * Math.PI * 36 * (1 - progress / 100)
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00f2fe" />
                  <stop offset="50%" stopColor="#4facfe" />
                  <stop offset="100%" stopColor="#667eea" />
                </linearGradient>
              </defs>
            </svg>

            {/* Floating Particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full"
                animate={{
                  x: [0, Math.cos(i * 60 * Math.PI / 180) * 30],
                  y: [0, Math.sin(i * 60 * Math.PI / 180) * 30],
                  opacity: [1, 0, 1],
                  scale: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeInOut"
                }}
                style={{
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
              />
            ))}
          </motion.div>

          {/* Enhanced Progress Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="absolute -top-3 -right-3 bg-gradient-to-r from-green-400 to-blue-500 rounded-full px-3 py-1.5 shadow-lg border border-white/30 backdrop-blur-sm"
          >
            <div className="flex items-center gap-1.5">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-3 h-3 text-white" />
              </motion.div>
              <span className="text-xs font-bold text-white">
                {Math.round(progress)}%
              </span>
            </div>
          </motion.div>

          {/* Dynamic Status Indicator */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="absolute -left-2 top-1/2 transform -translate-y-1/2"
          >
            <div className="flex items-center gap-1">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 bg-green-400 rounded-full shadow-lg"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                className="w-1.5 h-1.5 bg-blue-400 rounded-full shadow-lg"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                className="w-1 h-1 bg-purple-400 rounded-full shadow-lg"
              />
            </div>
          </motion.div>

          {/* Enhanced Tooltip with Animation */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8, rotateX: -90 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
            className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-gray-900 to-slate-800 backdrop-blur-xl text-white px-4 py-3 rounded-2xl text-xs whitespace-nowrap shadow-2xl border border-white/20 max-w-xs"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Edit3 className="w-4 h-4 text-blue-400" />
                </motion.div>
                <span className="font-semibold text-white">{stage}</span>
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <TrendingUp className="w-3 h-3 text-green-400" />
                </motion.div>
              </div>
              
              {details && (
                <div className="text-gray-300 text-[10px] leading-relaxed max-w-48 break-words">
                  {details}
                </div>
              )}
              
              <div className="flex items-center justify-between pt-1 border-t border-white/10">
                <div className="flex items-center gap-1">
                  <Package className="w-3 h-3 text-purple-400" />
                  <span className="text-purple-200 text-[10px]">
                    {products.length} loaded
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400" />
                  <span className="text-yellow-200 text-[10px]">
                    Live Stream
                  </span>
                </div>
              </div>
            </div>
            
            {/* Enhanced Tooltip Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-6 border-transparent border-t-gray-900"></div>
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-5 border-transparent border-t-white/20"></div>
            </div>
          </motion.div>

          {/* Pulsing Background Effects */}
          <motion.div
            className="absolute inset-0 w-20 h-20 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full"
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.3, 0, 0.3],
              rotate: [0, 180, 360]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          
          <motion.div
            className="absolute inset-0 w-20 h-20 bg-gradient-to-br from-pink-400/20 to-indigo-400/20 rounded-full"
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.4, 0, 0.4],
              rotate: [360, 180, 0]
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CopyWritingLoader; 