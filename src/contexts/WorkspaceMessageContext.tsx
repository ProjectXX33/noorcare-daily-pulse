import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';

interface WorkspaceMessageContextType {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  markAllAsRead: () => void;
  lastReadMessageId: string;
  setLastReadMessageId: (id: string) => void;
}

const WorkspaceMessageContext = createContext<WorkspaceMessageContextType | undefined>(undefined);

export const useWorkspaceMessages = () => {
  const context = useContext(WorkspaceMessageContext);
  if (!context) {
    throw new Error('useWorkspaceMessages must be used within a WorkspaceMessageProvider');
  }
  return context;
};

interface WorkspaceMessageProviderProps {
  children: React.ReactNode;
}

export const WorkspaceMessageProvider = ({ children }: WorkspaceMessageProviderProps) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadMessageId, setLastReadMessageId] = useState('');

  // Initialize lastReadMessageId when user is available
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`lastReadMessageId_${user.id}`);
      if (stored) {
        setLastReadMessageId(stored);
      }
    }
  }, [user]);

  // Listen for new messages and update count
  useEffect(() => {
    if (!user) return;

    const messagesChannel = supabase
      .channel('workspace_messages_count')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'workspace_messages' }, 
        (payload) => {
          const newMessage = payload.new;
          
          // Only count messages from other users
          if (newMessage.user_id !== user.id) {
            setUnreadCount(prev => prev + 1);
            
            // Update document title
            updateDocumentTitle(unreadCount + 1);
          }
        }
      )
      .subscribe();

    return () => {
      messagesChannel.unsubscribe();
    };
  }, [user, unreadCount]);

  // Load initial unread count
  useEffect(() => {
    if (!user || !lastReadMessageId) return;

    const loadUnreadCount = async () => {
      try {
        const { data, error } = await supabase
          .from('workspace_messages')
          .select('id, user_id, created_at')
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Calculate unread count
        const messages = data || [];
        const lastReadIndex = messages.findIndex(msg => msg.id === lastReadMessageId);
        
        if (lastReadIndex === -1 && messages.length > 0) {
          // If we can't find the last read message, consider all messages from others as unread
          const unread = messages.filter(msg => msg.user_id !== user.id).length;
          setUnreadCount(unread);
          updateDocumentTitle(unread);
        } else if (lastReadIndex !== -1) {
          // Count messages after the last read message from other users
          const unreadMessages = messages.slice(lastReadIndex + 1);
          const unread = unreadMessages.filter(msg => msg.user_id !== user.id).length;
          setUnreadCount(unread);
          updateDocumentTitle(unread);
        }
      } catch (error) {
        console.error('Error loading unread count:', error);
      }
    };

    loadUnreadCount();
  }, [user, lastReadMessageId]);

  const updateDocumentTitle = (count: number) => {
    if (count > 0) {
              document.title = `(${count}) NoorHub`;
      } else {
        document.title = 'NoorHub';
    }
  };

  const markAllAsRead = () => {
    setUnreadCount(0);
    updateDocumentTitle(0);
  };

  const handleSetLastReadMessageId = (id: string) => {
    setLastReadMessageId(id);
    localStorage.setItem(`lastReadMessageId_${user?.id}`, id);
  };

  return (
    <WorkspaceMessageContext.Provider value={{
      unreadCount,
      setUnreadCount,
      markAllAsRead,
      lastReadMessageId,
      setLastReadMessageId: handleSetLastReadMessageId
    }}>
      {children}
    </WorkspaceMessageContext.Provider>
  );
}; 