import { supabase } from './supabase';

export interface UpdateBroadcast {
  message: string;
  version: string;
  timestamp: string;
  type: 'system_update' | 'maintenance' | 'feature_release';
}

export const updateBroadcastService = {
  // Broadcast update notification to all connected clients
  async broadcastUpdate(message: string, version: string, type: UpdateBroadcast['type'] = 'system_update') {
    try {
      const broadcast: UpdateBroadcast = {
        message,
        version,
        timestamp: new Date().toISOString(),
        type
      };

      // Send via Supabase realtime to all connected clients
      const channel = supabase.channel('system-updates');
      
      await channel.send({
        type: 'broadcast',
        event: 'system_update',
        payload: broadcast
      });

      console.log('[UpdateBroadcast] Update notification sent:', broadcast);
      return { success: true, broadcast };
    } catch (error) {
      console.error('[UpdateBroadcast] Error sending update notification:', error);
      return { success: false, error };
    }
  },

  // Subscribe to update broadcasts
  subscribeToUpdates(callback: (broadcast: UpdateBroadcast) => void) {
    const channel = supabase.channel('system-updates');
    
    channel.on('broadcast', { event: 'system_update' }, (payload) => {
      console.log('[UpdateBroadcast] Received update notification:', payload);
      callback(payload.payload as UpdateBroadcast);
    });

    channel.subscribe();

    // Return unsubscribe function
    return () => {
      channel.unsubscribe();
    };
  },

  // Create a system notification for database storage
  async createSystemNotification(message: string, version: string) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          title: 'System Update',
          message: `${message} (Version ${version})`,
          type: 'system',
          is_system_wide: true,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('[UpdateBroadcast] Error creating system notification:', error);
      return { success: false, error };
    }
  }
}; 