import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onRatingChange,
  readonly = false,
  size = 'md',
  showValue = false,
  className
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
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
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleStarClick(star)}
            disabled={readonly}
            className={cn(
              sizeClasses[size],
              'transition-colors',
              !readonly && 'hover:scale-110 cursor-pointer',
              readonly && 'cursor-default'
            )}
          >
            <Star
              className={cn(
                'transition-all duration-200',
                sizeClasses[size],
                getStarColor(star)
              )}
            />
          </button>
        ))}
      </div>
      {showValue && (
        <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
          ({rating}/5)
        </span>
      )}
    </div>
  );
};

export default StarRating; 