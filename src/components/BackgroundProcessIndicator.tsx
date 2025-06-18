import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, TrendingUp, Target, Brain } from 'lucide-react';
import { useStrategy } from '@/contexts/StrategyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate, useLocation } from 'react-router-dom';

// Professional Strategy SVG Icon Component - Using strategy.svg design
const GrowthStrategyIcon = ({ className, animated = false }: { className?: string, animated?: boolean }) => (
  <svg 
    className={`${className} ${animated ? 'animate-pulse' : ''}`}
    viewBox="0 0 256 256" 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <g>
      <g>
        <g>
          <path d="M90.2,15.8c-17.5,1.5-32.7,15.3-36.4,33c-2.9,14.2,1.9,29,12.7,39c14.4,13.3,36.3,14.6,52.4,3.1c3.5-2.5,8.9-8.2,10.9-11.7c4.2-7,6.2-14.1,6.2-22c0-8.6-2.2-16-6.7-22.9C120.8,21.2,106.5,14.5,90.2,15.8z M100.9,37.3c5.2,1.6,10.1,6,12.6,11.4c1.4,3,1.5,3.5,1.5,8.4c0,4.2-0.2,5.7-1.1,7.8c-2.1,5.2-6.7,9.8-11.9,11.9c-2.1,0.9-3.5,1-7.5,1s-5.4-0.2-7.5-1c-5.2-2.1-9.8-6.7-11.9-11.9c-0.9-2.1-1-3.5-1.1-7.8c0-4.9,0.1-5.4,1.5-8.4C80.2,38.8,90.6,34.1,100.9,37.3z"/>
          <path d="M165.4,73.6c-2.9,2.7-26,30.1-26.3,31.1c-0.5,2,0.3,2.3,9.7,2.5c13.1,0.3,13.1,0.3,9.9,16.5c-3.4,17.6-11.7,35.8-22.7,50.4c-22,29-54.6,46.8-91,49.5c-7.5,0.6-8.9,1.9-8.9,8.8c0,3.9,0.7,5.8,2.5,7c2.9,2,22-0.2,36-4.2c19.1-5.4,36.2-14.4,51.6-27c6.3-5.1,16.7-15.8,21.3-21.8c16.1-20.8,26.1-44.8,29.3-70.1c0.7-5.2,1.1-6.5,2.9-8c1.4-1.1,1.6-1.2,9.1-1.2c6.1,0,7.8-0.1,8.7-0.8c0.6-0.4,1-1,1-1.4c0-0.6-23.6-28.5-26.8-31.8C170.1,71.8,167.2,72,165.4,73.6z"/>
          <path d="M15.9,112.7c-4,2-5.9,5.1-5.9,9.7c0,4.3,0.9,5.7,9.5,14.4l8,8l-7.8,7.8c-4.3,4.3-8.3,8.6-8.8,9.6c-1.9,3.7-0.8,9.7,2.3,12.6c3.1,2.9,8.6,3.7,12.3,1.9c1-0.5,5.2-4.4,9.4-8.5c4.2-4.2,7.7-7.6,8-7.6c0.3,0,4.1,3.6,8.5,8c7.5,7.5,8.2,8,10.8,8.8c2.4,0.7,3.2,0.8,5.3,0.3c7-1.6,10.6-8.9,7.5-15.4c-0.8-1.7-3.3-4.5-8.7-9.9l-7.6-7.5l7.8-7.9c8.3-8.4,9.6-10.3,9.7-14.1c0-3.5-0.8-5.6-3.2-8c-3.2-3.2-6.8-4.1-11.1-2.8c-1.6,0.4-3.6,2.2-10.3,8.8l-8.4,8.3l-8.4-8.3c-6.7-6.7-8.8-8.4-10.3-8.8C21.3,111.2,18.6,111.4,15.9,112.7z"/>
          <path d="M187.4,149.5c-4.9,1.8-7.5,5.5-7.5,10.6c0,3.9,1.6,6.2,9.9,14.4l7.6,7.5l-7.8,7.8c-5.2,5.3-8,8.5-8.7,9.9c-2.4,5.3-0.3,11.6,4.8,14.2c2.5,1.4,7.4,1.5,9.8,0.2c0.9-0.5,5.2-4.4,9.5-8.7l7.9-7.9l7.9,7.9c4.4,4.3,8.6,8.2,9.4,8.6c2.3,1.1,5.5,1.5,7.9,0.8c2.7-0.8,5.8-3.4,6.9-5.8c1.1-2.4,1.2-6.7,0.2-9.2c-0.5-1-3.8-4.9-8.7-9.8l-8-8l7.8-7.8c4.7-4.7,8.2-8.5,8.7-9.7c1.1-2.4,1.2-6.7,0.1-9.1c-2.1-5.1-8.1-7.7-13.4-6c-2.3,0.8-3.5,1.8-10.7,8.9l-8.2,8l-7.9-7.8c-4.3-4.3-8.6-8.2-9.5-8.6C193.4,148.9,189.5,148.7,187.4,149.5z"/>
        </g>
      </g>
    </g>
  </svg>
);

const BackgroundProcessIndicator: React.FC = () => {
  const { user } = useAuth();
  const { 
    isBackgroundProcessing, 
    progress, 
    stage, 
    details,
    refreshData 
  } = useStrategy();
  
  const navigate = useNavigate();
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);

  // Only show for Media Buyer and Admin
  const hasAccess = user && (user.role === 'admin' || user.position === 'Media Buyer');
  
  // Show on all pages when processing is active (not just strategy page)
  const shouldShow = hasAccess && isBackgroundProcessing;

  // Manual refresh handler
  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    refreshData();
  };

  if (!shouldShow) return null;

  const handleClick = () => {
    navigate('/strategy');
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className={`
              fixed z-[60]
              left-6 bottom-6 md:right-6 md:bottom-24 md:left-auto
              w-16 h-16 rounded-full
              bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700
              hover:from-purple-700 hover:via-blue-700 hover:to-indigo-800
              shadow-2xl hover:shadow-purple-500/25
              flex items-center justify-center
              cursor-pointer transition-all duration-500 ease-out
              hover:scale-110 active:scale-95
              border-3 border-white/20 backdrop-blur-sm
              ring-2 ring-purple-400/30 hover:ring-purple-400/50
            `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
            whileHover={{ 
              scale: 1.1,
              boxShadow: "0 20px 40px rgba(139, 92, 246, 0.3)"
            }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="relative w-16 h-16 flex items-center justify-center">
              {/* Outer glow ring */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 opacity-20 animate-pulse blur-sm"></div>
              
              {/* Progress ring - enhanced visibility */}
              <svg className="absolute inset-1 w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                {/* Background circle */}
                <path
                  className="text-white/30"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Progress circle */}
                <motion.path
                  className="text-white drop-shadow-lg"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${progress}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  initial={{ strokeDasharray: "0, 100" }}
                  animate={{ strokeDasharray: `${progress}, 100` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{
                    filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.5))'
                  }}
                />
              </svg>
              
              {/* Enhanced Growth Strategy Icon - centered perfectly */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ 
                    scale: isHovered ? 1.1 : 1,
                    rotate: isHovered ? 5 : 0
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <GrowthStrategyIcon 
                    className="h-6 w-6 text-white" 
                    animated 
                  />
                </motion.div>
              </div>
              
              {/* Multi-layer pulse effects */}
              <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 opacity-10 animate-ping"></div>
              <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-purple-300 to-blue-300 opacity-20 animate-pulse"></div>
              <div className="absolute -inset-1 rounded-full bg-white opacity-10 animate-pulse delay-75"></div>
            </div>
            
            {/* Enhanced progress percentage indicator */}
            <motion.div 
              className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-3 border-white flex items-center justify-center shadow-lg"
              animate={{ 
                scale: isHovered ? 1.1 : 1
              }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <motion.span 
                className="text-[10px] font-bold text-white drop-shadow-sm"
                animate={{ 
                  scale: isHovered ? 1.05 : 1
                }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {Math.round(progress)}
              </motion.span>
            </motion.div>



            {/* Sparkle effect */}
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{
                background: [
                  "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 20%)",
                  "radial-gradient(circle at 80% 50%, rgba(255,255,255,0.1) 0%, transparent 20%)",
                  "radial-gradient(circle at 50% 20%, rgba(255,255,255,0.1) 0%, transparent 20%)",
                  "radial-gradient(circle at 50% 80%, rgba(255,255,255,0.1) 0%, transparent 20%)",
                ]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        </TooltipTrigger>
        
        <TooltipContent side={window.innerWidth < 768 ? "right" : "left"} className="max-w-xs bg-gradient-to-r from-purple-900 to-blue-900 border-purple-600">
          <div className="flex items-center gap-3 p-2">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-600 flex items-center justify-center shadow-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <div className="font-semibold text-sm text-white">Strategy Analysis</div>
              <div className="text-xs text-purple-200">{Math.round(progress)}% complete</div>
              <div className="text-xs text-blue-200 mt-1">
                {stage || 'Analyzing your business data...'}
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default BackgroundProcessIndicator; 