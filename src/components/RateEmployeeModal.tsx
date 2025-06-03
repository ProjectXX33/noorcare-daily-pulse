import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, EmployeeRating } from '@/types';
import { rateEmployee, updateEmployeeRating, getLatestEmployeeRating } from '@/lib/ratingsApi';
import StarRating from './StarRating';
import { Loader2, Star, Clock } from 'lucide-react';

interface RateEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: User | null;
  onRatingSubmitted?: () => void;
}

const RateEmployeeModal: React.FC<RateEmployeeModalProps> = ({
  isOpen,
  onClose,
  employee,
  onRatingSubmitted
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
  const [previousRating, setPreviousRating] = useState<EmployeeRating | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Reset form when modal opens/closes or employee changes
  useEffect(() => {
    if (isOpen && employee) {
      setRating(0);
      setComment('');
      setIsUpdating(false);
      loadPreviousRating();
    } else {
      setRating(0);
      setComment('');
      setPreviousRating(null);
      setIsUpdating(false);
    }
  }, [isOpen, employee]);

  const loadPreviousRating = async () => {
    if (!employee) return;
    
    setIsLoadingPrevious(true);
    try {
      const latest = await getLatestEmployeeRating(employee.id);
      setPreviousRating(latest);
    } catch (error) {
      console.error('Error loading previous rating:', error);
    } finally {
      setIsLoadingPrevious(false);
    }
  };

  const handleSubmit = async () => {
    if (!employee || rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setIsLoading(true);
    try {
      if (isUpdating && previousRating) {
        await updateEmployeeRating(previousRating.id, rating, comment);
        toast.success('Employee rating updated successfully!');
      } else {
        await rateEmployee(employee.id, rating, comment);
        toast.success('Employee rated successfully!');
      }
      
      onRatingSubmitted?.();
      onClose();
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePrevious = () => {
    if (previousRating) {
      setRating(previousRating.rating);
      setComment(previousRating.comment || '');
      setIsUpdating(true);
    }
  };

  const handleCreateNew = () => {
    setRating(0);
    setComment('');
    setIsUpdating(false);
  };

  if (!employee) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Rate Employee
          </DialogTitle>
          <DialogDescription>
            Rate {employee.name} and optionally add a comment about their performance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Employee Info */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{employee.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {employee.position} • {employee.department}
                </p>
              </div>
              <div className="text-right">
                {employee.averageRating && employee.averageRating > 0 ? (
                  <div className="flex items-center gap-1">
                    <StarRating rating={employee.averageRating} readonly size="sm" />
                    <span className="text-xs text-gray-500">
                      Avg: {employee.averageRating.toFixed(1)}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-500">No ratings yet</span>
                )}
              </div>
            </div>
          </div>

          {/* Previous Rating Section */}
          {isLoadingPrevious ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="ml-2 text-sm">Loading previous rating...</span>
            </div>
          ) : previousRating ? (
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Latest Rating</h4>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUpdatePrevious}
                    disabled={isUpdating}
                  >
                    Update
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCreateNew}
                    disabled={!isUpdating}
                  >
                    New Rating
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <StarRating rating={previousRating.rating} readonly size="sm" />
                  <span className="text-sm text-gray-600">
                    by {previousRating.ratedByName}
                  </span>
                </div>
                {previousRating.comment && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    "{previousRating.comment}"
                  </p>
                )}
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  {previousRating.ratedAt.toLocaleDateString()}
                </div>
              </div>
            </div>
          ) : null}

          {/* Rating Form */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">
                {isUpdating ? 'Update Rating' : 'Select Rating'}
              </Label>
              <div className="mt-2">
                <StarRating
                  rating={rating}
                  onRatingChange={setRating}
                  size="lg"
                  showValue
                />
              </div>
            </div>

            <div>
              <Label htmlFor="comment">Comment (Optional)</Label>
              <Textarea
                id="comment"
                placeholder="Add a comment about their performance..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={rating === 0 || isLoading}
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUpdating ? 'Update Rating' : 'Submit Rating'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RateEmployeeModal; 