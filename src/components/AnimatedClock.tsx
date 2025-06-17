import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import Lottie from 'lottie-react';

// Animated Clock Component
export const AnimatedClock: React.FC<{ 
  className?: string; 
  isActive?: boolean;
  animationType?: 'normal' | 'warning' | 'urgent';
}> = ({ className = "h-4 w-4", isActive = false, animationType = 'normal' }) => {
  const [animationData, setAnimationData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Determine which animation file to load based on type
    let animationFile = '/animation/system-solid-67-clock-loop-clock.json'; // Default
    
    if (isActive) {
      switch (animationType) {
        case 'warning': // Yellow - 50-30 minutes remaining
          animationFile = '/animation/system-solid-67-clock-loop-clock-1hour.json';
          console.log('🟡 Loading WARNING animation (1hour)');
          break;
        case 'urgent': // Orange - ≤30 minutes remaining  
          animationFile = '/animation/system-solid-67-clock-loop-clock-3minuts.json';
          console.log('🟠 Loading URGENT animation (3minuts)');
          break;
        default: // Normal active
          animationFile = '/animation/system-solid-67-clock-loop-clock.json';
          console.log('🎬 Loading NORMAL animation');
          break;
      }
    }

    console.log('🎬 AnimatedClock: Loading animation:', animationFile);
    setIsLoading(true);
    setError(false);
    
    fetch(animationFile)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('✅ Animation loaded successfully:', animationFile);
        setAnimationData(data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('❌ Failed to load clock animation:', animationFile, error);
        setError(true);
        setIsLoading(false);
      });
  }, [isActive, animationType]);

  if (isLoading) {
    console.log('⏳ Still loading animation...');
    return <Clock className={className} />;
  }

  if (error || !animationData) {
    console.log('⚠️ Error or no data, showing static clock');
    return <Clock className={className} />;
  }

  console.log('🎯 Rendering Lottie animation!');
  return (
    <div 
      className={className}
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        justifyContent: 'center'
      }}
    >
      <Lottie 
        animationData={animationData}
        loop={true}
        autoplay={true}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default AnimatedClock; 