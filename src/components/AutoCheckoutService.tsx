import { useEffect } from 'react';
import { useCheckIn } from '@/contexts/CheckInContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const AutoCheckoutService = () => {
  const { user } = useAuth();
  const { checkIns, checkOutUser, hasCheckedInToday, hasCheckedOutToday } = useCheckIn();

  useEffect(() => {
    if (!user || user.role !== 'employee') {
      return;
    }

    const checkFor4AMAutoCheckout = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Check if it's exactly 4:00 AM
      if (currentHour === 4 && currentMinute === 0) {
        const isCheckedIn = hasCheckedInToday(user.id);
        const isCheckedOut = hasCheckedOutToday(user.id);
        
        // Only auto-checkout if user is checked in but not checked out
        if (isCheckedIn && !isCheckedOut) {
          console.log('🔄 Auto-checkout triggered at 4:00 AM for user:', user.name);
          
          // Perform auto-checkout
          checkOutUser(user.id)
            .then(() => {
              toast.success('⏰ Automatically checked out at 4:00 AM (work day reset)', {
                duration: 8000,
                description: 'Your shift has ended and the work day has reset. Have a good rest!'
              });
            })
            .catch((error) => {
              console.error('Auto-checkout failed:', error);
              toast.error('Failed to auto checkout. Please manually check out.', {
                duration: 6000,
              });
            });
        }
      }
    };

    // Check immediately when component mounts
    checkFor4AMAutoCheckout();
    
    // Check every minute for 4AM auto-checkout
    const interval = setInterval(checkFor4AMAutoCheckout, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, [user, checkOutUser, hasCheckedInToday, hasCheckedOutToday]);

  // This is a background service, so it doesn't render anything
  return null;
};

export default AutoCheckoutService; 