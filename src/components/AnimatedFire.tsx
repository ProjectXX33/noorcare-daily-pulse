import React, { useState, useEffect } from 'react';
import { Flame } from 'lucide-react';
import Lottie from 'lottie-react';

// Animated Fire Component
export const AnimatedFire: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => {
  const [animationData, setAnimationData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/animation/Animation - 1750158564011.json')
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
        console.error('Failed to load fire animation:', error);
        setError(true);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return <Flame className={className} />;
  }

  if (error || !animationData) {
    return <Flame className={className} />;
  }

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

export default AnimatedFire; 