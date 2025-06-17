import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import Lottie from 'lottie-react';

// Animated Clock Component
export const AnimatedClock: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => {
  const [animationData, setAnimationData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    console.log('🎬 AnimatedClock: Component mounted!');
    fetch('/animation/system-solid-67-clock-loop-clock.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('✅ Animation loaded successfully!');
        setAnimationData(data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('❌ Failed to load clock animation:', error);
        setError(true);
        setIsLoading(false);
      });
  }, []);

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
    <div className={className} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
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