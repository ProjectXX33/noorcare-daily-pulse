import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import Lottie from 'lottie-react';

// Custom SVG Bell Component
const BellSVG: React.FC<{ className?: string; hasNotifications?: boolean }> = ({ 
  className = "h-5 w-5", 
  hasNotifications = false 
}) => {
  return (
    <svg 
      className={`${className} transition-all duration-300 ${
        hasNotifications 
          ? 'text-yellow-500 drop-shadow-lg' 
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
      }`} 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      style={{
        filter: hasNotifications 
          ? 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.5))' 
          : 'none'
      }}
    >
      <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0" />
    </svg>
  );
};

// Animated Bell Component
export const AnimatedNotificationBell: React.FC<{ 
  className?: string; 
  hasNotifications?: boolean;
}> = ({ className = "h-5 w-5", hasNotifications = false }) => {
  const [animationData, setAnimationData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Only load animation if there are notifications
    if (hasNotifications) {
      fetch('/animation/bell.json')
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          setAnimationData(data);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Failed to load bell animation:', error);
          setError(true);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [hasNotifications]);

  // If no notifications, show static SVG bell
  if (!hasNotifications) {
    return <BellSVG className={className} hasNotifications={false} />;
  }

  // If loading animation, show static bell
  if (isLoading) {
    return <Bell className={className} />;
  }

  // If error loading animation, show static bell
  if (error || !animationData) {
    return <Bell className={className} />;
  }

  // Show animated bell when there are notifications
  return (
    <div 
      className={`${className} relative`} 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        filter: 'hue-rotate(40deg) saturate(1.8) brightness(1.3) drop-shadow(0 0 8px rgba(245, 158, 11, 0.6))' // Enhanced gold filter with glow
      }}
    >
      <Lottie 
        animationData={animationData}
        loop={true}
        autoplay={true}
        style={{ width: '100%', height: '100%' }}
      />
      
      {/* Additional glow effect for animated bell */}
      <div 
        className="absolute inset-0 rounded-full opacity-30 animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
};

export default AnimatedNotificationBell; 