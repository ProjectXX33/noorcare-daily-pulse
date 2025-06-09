import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  spacing?: 'tight' | 'normal';
  showValue?: boolean;
  className?: string;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onRatingChange,
  readonly = false,
  size = 'md',
  spacing = 'normal',
  showValue = false,
  className
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-7 w-7'
  };

  const spacingClasses = {
    tight: 'gap-0',
    normal: 'gap-1'
  };

  const starSpacingClasses = {
    tight: 'gap-0',
    normal: 'gap-1'
  };

  const handleStarClick = (starRating: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(starRating);
    }
  };

  const getStarColor = (starIndex: number) => {
    if (starIndex <= rating) {
      if (rating >= 4) return 'text-yellow-500 fill-yellow-500';
      if (rating >= 3) return 'text-yellow-400 fill-yellow-400';
      if (rating >= 2) return 'text-orange-400 fill-orange-400';
      return 'text-red-400 fill-red-400';
    }
    return 'text-gray-300 dark:text-gray-600';
  };

  return (
    <div className={cn('flex items-center', spacingClasses[spacing], className)}>
      <div className={cn('flex items-center star-rating-container', starSpacingClasses[spacing], spacing === 'tight' && 'tight')}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleStarClick(star)}
            disabled={readonly}
            style={{
              margin: 0,
              padding: 0,
              border: 'none',
              background: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            className={cn(
              'transition-colors flex items-center justify-center',
              !readonly && 'hover:scale-110 cursor-pointer touch-manipulation active:scale-95',
              readonly && 'cursor-default',
              // Force zero spacing with important styles
              spacing === 'tight' && '!m-0 !p-0'
            )}
          >
            <Star
              style={{
                margin: 0,
                padding: 0,
                display: 'block'
              }}
              className={cn(
                'transition-all duration-200',
                sizeClasses[size],
                getStarColor(star),
                // Force tight spacing with negative margins if tight
                spacing === 'tight' && '!m-0 !p-0'
              )}
            />
          </button>
        ))}
      </div>
      {showValue && (
        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 ml-1 sm:ml-2">
          ({rating}/5)
        </span>
      )}
    </div>
  );
};

export default StarRating; 