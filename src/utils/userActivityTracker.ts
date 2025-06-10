import { supabase } from '@/lib/supabase';

interface UserActivity {
  userId: string;
  lastSeen: Date;
  lastSeenToday: boolean;
}

class UserActivityTracker {
  private static instance: UserActivityTracker;
  private userId: string | null = null;
  private lastUpdateTime: number = 0;
  private readonly UPDATE_INTERVAL = 5 * 60 * 1000; // Update every 5 minutes

  private constructor() {}

  static getInstance(): UserActivityTracker {
    if (!UserActivityTracker.instance) {
      UserActivityTracker.instance = new UserActivityTracker();
    }
    return UserActivityTracker.instance;
  }

  // Initialize tracking for a user
  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    await this.updateActivity();
    this.startPeriodicUpdates();
  }

  // Update user's last seen timestamp
  async updateActivity(): Promise<boolean> {
    if (!this.userId) return false;

    const now = Date.now();
    
    // Don't update too frequently
    if (now - this.lastUpdateTime < this.UPDATE_INTERVAL) {
      return true;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', this.userId);

      if (error) {
        console.error('Error updating user activity:', error);
        return false;
      }

      this.lastUpdateTime = now;
      console.log('User activity updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating user activity:', error);
      return false;
    }
  }

  // Start periodic updates while user is active
  private startPeriodicUpdates(): void {
    // Update on visibility change (when user comes back to tab)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.updateActivity();
      }
    });

    // Update on window focus
    window.addEventListener('focus', () => {
      this.updateActivity();
    });

    // Update periodically while page is active
    setInterval(() => {
      if (!document.hidden) {
        this.updateActivity();
      }
    }, this.UPDATE_INTERVAL);
  }

  // Get user activity data for admin dashboard
  static async getUsersActivity(): Promise<UserActivity[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, last_seen, role')
        .neq('role', 'admin') // Exclude admin users
        .order('last_seen', { ascending: false });

      if (error) {
        console.error('Error fetching user activity:', error);
        return [];
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return data.map(user => ({
        userId: user.id,
        userName: user.name,
        lastSeen: user.last_seen ? new Date(user.last_seen) : new Date(0),
        lastSeenToday: user.last_seen ? new Date(user.last_seen) >= today : false
      }));
    } catch (error) {
      console.error('Error fetching user activity:', error);
      return [];
    }
  }

  // Check if user opened app today
  static isActiveToday(lastSeen: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return lastSeen >= today;
  }

  // Format last seen time for display
  static formatLastSeen(lastSeen: Date): string {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) { // Less than 24 hours
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      if (days === 1) {
        return 'Yesterday';
      } else if (days < 7) {
        return `${days} days ago`;
      } else {
        return lastSeen.toLocaleDateString();
      }
    }
  }

  // Stop tracking
  stop(): void {
    this.userId = null;
    this.lastUpdateTime = 0;
  }
}

export default UserActivityTracker;
export { UserActivityTracker, type UserActivity }; 