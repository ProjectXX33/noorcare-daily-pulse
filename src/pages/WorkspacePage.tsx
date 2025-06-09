import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceMessages } from '@/contexts/WorkspaceMessageContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  MessageSquare,
  Send,
  Users,
  Clock,
  Smile,
  Paperclip,
  MoreVertical,
  Hash,
  UserCircle,
  ChevronDown,
  Volume2,
  VolumeX
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { playNotificationSound } from '@/lib/notifications';
import { 
  cleanupMessages, 
  getMessagesToDelete,
  generateUniqueChannelName, 
  isNearBottom as checkNearBottom,
  processMessageForDisplay,
  validateMessage,
  convertEmojis,
  getUserStatus
} from '@/lib/chatUtils';

interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  user_position: string;
  user_role: string;
  message: string;
  created_at: string;
  updated_at?: string;
}

interface OnlineUser {
  id: string;
  name: string;
  position: string;
  role: string;
  last_seen: string;
}

interface TypingEvent {
  user_id: string;
  user_name: string;
  timestamp: string;
}

const WorkspacePage = () => {
  const { user } = useAuth();
  const { 
    unreadCount, 
    setUnreadCount, 
    markAllAsRead, 
    lastReadMessageId, 
    setLastReadMessageId 
  } = useWorkspaceMessages();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingEvent[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('chatSoundEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingBroadcast = useRef<number>(0);
  const messagesChannelRef = useRef<any>(null);
  const presenceChannelRef = useRef<any>(null);
  const typingChannelRef = useRef<any>(null);
  const isNearBottom = useRef<boolean>(true);
  const lastScrollTop = useRef<number>(0);
  const isAutoScrolling = useRef<boolean>(false);
  const shouldAutoScroll = useRef<boolean>(true);
  const hasUserManuallyScrolled = useRef<boolean>(false);

  // Popular emojis for the menu
  const popularEmojis = [
    '😊', '😃', '😄', '😁', '🙂', '😉', '😌', '😍', '🥰', '😘',
    '😗', '😙', '😚', '🙃', '😜', '🤪', '😝', '🤗', '🤔', '🤐',
    '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😔',
    '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭',
    '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨',
    '😰', '😥', '😓', '🤗', '🤔', '👍', '👎', '👌', '✌️', '🤞',
    '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '��',
    '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '👐', '🤲', '🤝', '🙏',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
    '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️',
    '🔥', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💬', '👁️‍🗨️',
    '🗨️', '🗯️', '💭', '💤', '👋', '🎉', '🎊', '��', '🎁', '🏆'
  ];

  // ============================================
  // 🎯 ADD YOUR CUSTOM JAVASCRIPT FUNCTIONS HERE
  // ============================================
  
  // Sound preference toggle
  const toggleSound = () => {
    const newSoundState = !soundEnabled;
    setSoundEnabled(newSoundState);
    localStorage.setItem('chatSoundEnabled', JSON.stringify(newSoundState));
    toast.info(newSoundState ? 'Sound notifications enabled' : 'Sound notifications muted');
  };
  
  // Example: Custom notification function
  const playCustomNotificationSound = () => {
    // Add your custom sound logic here
    const audio = new Audio('/notification-sound.mp3');
    audio.volume = 0.5;
    audio.play().catch(e => console.log('Sound play failed:', e));
  };

  // Example: Custom message formatting
  const formatCustomMessage = (message: string) => {
    // Add your custom message formatting here
    return message
      .replace(/\n/g, '<br>') // Convert line breaks
      .replace(/@(\w+)/g, '<span class="mention">@$1</span>'); // Highlight mentions
  };

  // Example: Custom emoji handling
  const replaceEmojis = (text: string) => {
    // Add your emoji replacement logic here
    return text
      .replace(':)', '😊')
      .replace(':D', '😃')
      .replace(':(', '😢');
  };

  // Example: Custom keyboard shortcuts
  const handleCustomKeyPress = (e: KeyboardEvent) => {
    // Add your custom keyboard shortcuts here
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      // Custom shortcut logic (e.g., search messages)
      console.log('Custom shortcut triggered!');
    }
  };

  // Example: Custom chat commands
  const handleChatCommand = (message: string) => {
    // Add your custom chat commands here
    if (message.startsWith('/help')) {
      // Show help message
      return 'Available commands: /help, /clear, /status';
    }
    if (message.startsWith('/clear')) {
      // Clear chat logic
      setMessages([]);
      return null;
    }
    return message;
  };

  // Emoji selection function
  const selectEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiMenu(false);
  };

  // Close emoji menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEmojiMenu) {
        setShowEmojiMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showEmojiMenu]);

  // ============================================
  // 🎯 ADD CUSTOM useEffect HOOKS HERE
  // ============================================
  
  // Example: Custom keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleCustomKeyPress);
    return () => document.removeEventListener('keydown', handleCustomKeyPress);
  }, []);

  // Example: Custom window focus/blur detection
  useEffect(() => {
    const handleFocus = () => {
      console.log('Chat window focused');
      // Add your focus logic here
    };
    
    const handleBlur = () => {
      console.log('Chat window blurred');
      // Add your blur logic here
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Mobile detection and responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile sidebar when screen gets larger
  useEffect(() => {
    if (!isMobile) {
      setShowMobileSidebar(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (user) {
      loadMessages();
      loadOnlineUsers();
      setupSubscriptions();
      updateUserPresence();

      // Reset unread counter once when workspace page opens
      resetCounterOnly();

      // Update presence every 30 seconds
      const presenceInterval = setInterval(updateUserPresence, 30000);
      
      // Check and cleanup messages when they exceed 50 (every 30 seconds)
      const cleanupInterval = setInterval(async () => {
        setMessages(prev => {
          if (prev.length > 50) {
            console.log(`📊 Messages exceed limit: ${prev.length}/50 - performing cleanup`);
            performMessageCleanup(prev).then(cleanedMessages => {
              setMessages(cleanedMessages);
            });
          }
          return prev;
        });
      }, 30000); // Check every 30 seconds
      
      // Cleanup on unmount
      return () => {
        clearInterval(presenceInterval);
        clearInterval(cleanupInterval);
        updateUserOfflineStatus();
        cleanupSubscriptions();
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      };
    }
  }, [user]);

  // Clean up typing indicators older than 5 seconds
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => prev.filter(typing => {
        const typingTime = new Date(typing.timestamp).getTime();
        return now - typingTime < 5000;
      }));
    }, 1000);

    return () => clearInterval(cleanupInterval);
  }, []);

  // Simple counter reset function that doesn't affect message storage
  const resetCounterOnly = () => {
    console.log('🔄 Resetting counter only (keeping messages)');
    markAllAsRead(); // This only resets the counter, doesn't touch messages
  };

  // Mark messages as read and update global counter (for user interaction)
  const markMessagesAsRead = () => {
    console.log('📖 Marking messages as read:', { 
      messagesLength: messages.length,
      currentLastRead: lastReadMessageId 
    });
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      console.log('📖 Latest message:', latestMessage.id);
      setLastReadMessageId(latestMessage.id);
      resetCounterOnly(); // Use the simpler reset function
    }
  };

  // Calculate unread messages for current chat
  const calculateUnreadCount = (allMessages: ChatMessage[]) => {
    if (!lastReadMessageId || allMessages.length === 0) {
      return 0;
    }
    
    const lastReadIndex = allMessages.findIndex(msg => msg.id === lastReadMessageId);
    if (lastReadIndex === -1) {
      // If we can't find the last read message, consider all messages as potentially unread
      // But only count messages from others, not our own
      return allMessages.filter(msg => msg.user_id !== user?.id).length;
    }
    
    // Count messages after the last read message from other users
    const unreadMessages = allMessages.slice(lastReadIndex + 1);
    return unreadMessages.filter(msg => msg.user_id !== user?.id).length;
  };

  // Reset counter when workspace page becomes active
  useEffect(() => {
    // Reset counter immediately when workspace page is accessed (but keep messages)
    console.log('🏠 Workspace page mounted - resetting counter immediately');
    markAllAsRead(); // Reset global counter immediately
    
    // Also reset when page becomes visible (tab switching)
    const handleFocus = () => {
      console.log('🏠 Workspace page focused - resetting counter immediately');
      markAllAsRead(); // Reset global counter immediately
    };
    
    const handleVisibilityChange = () => {
      if (!document.hidden && window.location.pathname === '/workspace') {
        console.log('🏠 Workspace page visible - resetting counter immediately');
        markAllAsRead(); // Reset global counter immediately
      }
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Run only on mount

  // Track unread messages and update global context
  useEffect(() => {
    const count = calculateUnreadCount(messages);
    console.log('🔢 Calculating local unread count:', { 
      messages: messages.length, 
      lastReadMessageId, 
      count,
      userId: user?.id,
      pathname: window.location.pathname,
      userScrolledUp
    });
    
    // Always keep counter at 0 when on workspace page
    if (window.location.pathname === '/workspace') {
      console.log('📍 On workspace page - keeping counter at 0');
      markAllAsRead(); // Always reset when on workspace page
    } else {
      // Update counter when NOT on workspace page
      console.log('📍 Not on workspace page - updating counter to:', count);
      setUnreadCount(count);
    }
  }, [messages, lastReadMessageId, user?.id, setUnreadCount]);

  // Mark messages as read when user scrolls to bottom
  useEffect(() => {
    // Auto-mark as read when at bottom of chat
    if (!userScrolledUp && window.location.pathname === '/workspace') {
      markMessagesAsRead();
    }
  }, [messages, userScrolledUp]);

  const cleanupSubscriptions = () => {
    if (messagesChannelRef.current) {
      supabase.removeChannel(messagesChannelRef.current);
      messagesChannelRef.current = null;
    }
    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
      presenceChannelRef.current = null;
    }
    if (typingChannelRef.current) {
      supabase.removeChannel(typingChannelRef.current);
      typingChannelRef.current = null;
    }
  };

  const setupSubscriptions = () => {
    // Clean up existing subscriptions first
    cleanupSubscriptions();
    
    // Set up messages subscription with unique channel name
    const messageChannelName = generateUniqueChannelName('workspace_messages');
    
    messagesChannelRef.current = supabase
      .channel(messageChannelName)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'workspace_messages' }, 
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          
          // Add message and cleanup if over 50 messages
          setMessages(prev => {
            const updatedMessages = [...prev, newMessage];
            
            // If we exceed 50 messages, cleanup immediately
            if (updatedMessages.length > 50) {
              console.log(`📊 New message caused limit exceed: ${updatedMessages.length}/50 - performing immediate cleanup`);
              
              // Perform cleanup asynchronously
              performMessageCleanup(updatedMessages).then(cleanedMessages => {
                setMessages(cleanedMessages);
              });
              
              // Return cleaned messages immediately for UI
              return cleanupMessages(updatedMessages);
            }
            
            return updatedMessages;
          });
          
          // Handle notifications for others' messages
          if (newMessage.user_id !== user?.id) {
            // Only play sound if enabled
            if (soundEnabled) {
              playNotificationSound();
            }
            const preview = newMessage.message.length > 30 
              ? `${newMessage.message.substring(0, 30)}...` 
              : newMessage.message;
            toast.info(`${newMessage.user_name}: ${preview}`, {
              duration: 3000,
            });
            
            // Smart auto-scroll for received messages
            // Check if user is near bottom of chat (within 50px for better UX)
            if (scrollAreaRef.current) {
              const element = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
              if (element) {
                const { scrollTop, scrollHeight, clientHeight } = element;
                const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
                
                console.log('📥 Received message scroll check:', {
                  distanceFromBottom,
                  willAutoScroll: distanceFromBottom < 50
                });
                
                // If user is near bottom (within 50px), auto-scroll to new message
                if (distanceFromBottom < 50) {
                  setTimeout(() => {
                    scrollToBottom();
                    markMessagesAsRead();
                  }, 100);
                } else {
                  // User is scrolled up, show the "New messages" button
                  setUserScrolledUp(true);
                }
              }
            }
          } else {
            // For own messages, always scroll to see the sent message
            setTimeout(() => {
              scrollToBottom();
              markMessagesAsRead();
            }, 100);
          }
        }
      )
      .subscribe();

    // Set up presence subscription
    const presenceChannelName = generateUniqueChannelName('user_presence');
    presenceChannelRef.current = supabase
      .channel(presenceChannelName)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'users' }, 
        () => {
          loadOnlineUsers();
        }
      )
      .subscribe();

    // Set up typing subscription with global channel
    const typingChannelName = 'typing_events_global';
    typingChannelRef.current = supabase
      .channel(typingChannelName)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const typingEvent = payload.payload as TypingEvent;
        
        if (typingEvent.user_id !== user?.id) {
          setTypingUsers(prev => {
            const filtered = prev.filter(t => t.user_id !== typingEvent.user_id);
            return [...filtered, typingEvent];
          });
        }
      })
      .on('broadcast', { event: 'stop_typing' }, (payload) => {
        const { user_id } = payload.payload;
        setTypingUsers(prev => prev.filter(t => t.user_id !== user_id));
      })
      .subscribe();
  };

  const scrollToBottom = () => {
    if (!isAutoScrolling.current && scrollAreaRef.current) {
      isAutoScrolling.current = true;
      
      // Get the ScrollArea viewport element
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      
      if (viewport) {
        // Scroll with extra padding to ensure absolute bottom
        viewport.scrollTo({
          top: viewport.scrollHeight + 1000, // Extra padding to guarantee bottom
          behavior: 'smooth'
        });
        
        // Double-check with direct assignment
        setTimeout(() => {
          viewport.scrollTop = viewport.scrollHeight; // Force to absolute bottom
        }, 300);
      } else {
        // Fallback: try to scroll using messagesEndRef
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'end',
            inline: 'nearest'
          });
        }
      }
      
      // Reset auto-scrolling flag after animation completes
      setTimeout(() => {
        isAutoScrolling.current = false;
      }, 800);
    }
  };

  const handleScroll = (event: any) => {
    // Prevent handling scroll events during auto-scroll
    if (isAutoScrolling.current) return;
    
    const element = event.currentTarget;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    // Calculate distance from bottom more precisely
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    // Within 1px = considered at bottom (very precise)
    const isAtBottom = distanceFromBottom <= 1;
    
    // Detect manual scroll direction
    const scrollDirection = scrollTop - lastScrollTop.current;
    lastScrollTop.current = scrollTop;
    
    console.log('📊 Scroll Info:', {
      scrollTop,
      scrollHeight,
      clientHeight,
      distanceFromBottom,
      isAtBottom,
      scrollDirection
    });
    
    // Mark that user has manually scrolled (any scroll event counts)
    if (Math.abs(scrollDirection) > 0) {
      hasUserManuallyScrolled.current = true;
    }
    
    // If user scrolled up manually, show "New messages" button
    if (scrollDirection < 0) {
      setUserScrolledUp(true);
      shouldAutoScroll.current = false;
      isNearBottom.current = false;
      hasUserManuallyScrolled.current = true;
    }
    // If user is at absolute bottom, mark messages as read
    else if (isAtBottom) {
      setUserScrolledUp(false);
      isNearBottom.current = true;
      // Mark messages as read when user is at absolute bottom
      markMessagesAsRead();
    }
  };

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('workspace_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      
      // Apply cleanup to loaded messages (only 50-message limit, no time expiration)
      const cleanedMessages = cleanupMessages(data || []);
      setMessages(cleanedMessages);
      
      // If we loaded exactly 50 messages, check if there are older ones to delete
      if (data && data.length >= 50) {
        // Check total count in database
        const { count } = await supabase
          .from('workspace_messages')
          .select('*', { count: 'exact', head: true });
          
        if (count && count > 50) {
          console.log(`📊 Database has ${count} messages, keeping only latest 50`);
          
          // Get all messages to determine which ones to delete
          const { data: allMessages } = await supabase
            .from('workspace_messages')
            .select('*')
            .order('created_at', { ascending: true });
            
          if (allMessages) {
            await performMessageCleanup(allMessages);
          }
        }
      }
      
      // Only reset the counter, don't automatically mark all messages as read
      // This preserves the user's actual read position
      resetCounterOnly();
      
      // Reset scroll tracking on initial load WITHOUT auto-scrolling to bottom
      setTimeout(() => {
        shouldAutoScroll.current = false; // Start with auto-scroll disabled
        setUserScrolledUp(false);
        isNearBottom.current = false; // Start at top, not bottom
        hasUserManuallyScrolled.current = false;
        // Don't auto-scroll to bottom on page load - let user see chat history
      }, 200);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load chat messages');
    } finally {
      setIsLoading(false);
    }
  };

  const loadOnlineUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, position, role, last_seen')
        .neq('id', user?.id)
        .order('last_seen', { ascending: false });

      if (error) throw error;
      setOnlineUsers(data || []);
    } catch (error) {
      console.error('Error loading online users:', error);
    }
  };

  const broadcastTyping = () => {
    if (!user || !typingChannelRef.current) return;
    
    const now = Date.now();
    if (now - lastTypingBroadcast.current < 2000) return;
    
    lastTypingBroadcast.current = now;
    
    typingChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: user.id,
        user_name: user.name,
        timestamp: new Date().toISOString()
      }
    });
  };

  const broadcastStopTyping = () => {
    if (!user || !typingChannelRef.current) return;
    
    typingChannelRef.current.send({
      type: 'broadcast',
      event: 'stop_typing',
      payload: {
        user_id: user.id
      }
    });
  };

  const updateUserPresence = async () => {
    if (!user) return;

    try {
      await supabase
        .from('users')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  };

  const updateUserOfflineStatus = async () => {
    if (!user) return;

    try {
      await supabase
        .from('users')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error updating offline status:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || isSending) return;

    // Validate message using utility function
    const validation = validateMessage(newMessage);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    try {
      setIsSending(true);
      
      // Stop typing indicator
      setIsTyping(false);
      broadcastStopTyping();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Process message with emoji conversion
      const processedMessage = convertEmojis(newMessage.trim());
      
      const { error } = await supabase
        .from('workspace_messages')
        .insert([{
          user_id: user.id,
          user_name: user.name,
          user_position: user.position,
          user_role: user.role,
          message: processedMessage,
        }]);

      if (error) throw error;
      
      setNewMessage('');
      
      // Auto-scroll to new message when user sends it
      shouldAutoScroll.current = true;
      setUserScrolledUp(false);
      isNearBottom.current = true;
      hasUserManuallyScrolled.current = false; // Reset because user sent message
      
      // Scroll to show the new message user just sent
      setTimeout(() => {
        scrollToBottom();
        markMessagesAsRead();
      }, 50);
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      broadcastTyping();
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      broadcastStopTyping();
    }, 3000);
    
    if (!value.trim() && isTyping) {
      setIsTyping(false);
      broadcastStopTyping();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM dd, HH:mm');
    }
  };

  const getUserRoleBadge = (role: string, position: string) => {
    if (role === 'admin') {
      return <Badge variant="destructive" className="text-xs">Admin</Badge>;
    }
    
    const positionColors: { [key: string]: string } = {
      'Customer Service': 'bg-blue-100 text-blue-800',
      'Media Buyer': 'bg-purple-100 text-purple-800',
      'Designer': 'bg-green-100 text-green-800',
    };
    
    const colorClass = positionColors[position] || 'bg-gray-100 text-gray-800';
    
    return (
      <Badge variant="secondary" className={`text-xs ${colorClass}`}>
        {position}
      </Badge>
    );
  };

  const isUserOnline = (lastSeen: string) => {
    const { isOnline } = getUserStatus(lastSeen);
    return isOnline;
  };

  const getOnlineCount = () => {
    return onlineUsers.filter(user => isUserOnline(user.last_seen)).length + 1;
  };

  const TypingIndicator = () => {
    if (typingUsers.length === 0) return null;
    
    const typingNames = typingUsers.map(t => t.user_name);
    const displayText = typingNames.length === 1 
      ? `${typingNames[0]} is typing...`
      : typingNames.length === 2
      ? `${typingNames[0]} and ${typingNames[1]} are typing...`
      : `${typingNames[0]} and ${typingNames.length - 1} others are typing...`;
    
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
        <span>{displayText}</span>
      </div>
    );
  };

  // Function to delete old messages from Supabase database
  const deleteOldMessagesFromDB = async (messagesToDelete: ChatMessage[]) => {
    if (messagesToDelete.length === 0) return;
    
    try {
      const messageIds = messagesToDelete.map(msg => msg.id);
      const { error } = await supabase
        .from('workspace_messages')
        .delete()
        .in('id', messageIds);
        
      if (error) {
        console.error('Error deleting old messages:', error);
      } else {
        console.log(`🗑️ Deleted ${messagesToDelete.length} old messages from database`);
      }
    } catch (error) {
      console.error('Error in deleteOldMessagesFromDB:', error);
    }
  };

  // Enhanced cleanup function that deletes from both local state and database
  const performMessageCleanup = async (currentMessages: ChatMessage[]) => {
    // Get messages that exceed the 50-message limit
    const messagesToDelete = getMessagesToDelete(currentMessages);
    
    if (messagesToDelete.length > 0) {
      // Delete old messages from database
      await deleteOldMessagesFromDB(messagesToDelete);
    }
    
    // Return cleaned messages (only keep latest 50)
    return cleanupMessages(currentMessages);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 w-full max-w-full overflow-x-hidden">
      {/* Enhanced mobile-optimized header - Non-sticky, responsive layout */}
      <div className="border-b border-border/50 bg-background/98 w-full">
        <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6 w-full max-w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
            <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
              <div className="flex items-center gap-2">
                <Hash className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                  Workspace Chat
                </h1>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="text-xs animate-pulse flex-shrink-0">
                    {unreadCount}
                  </Badge>
                )}
              </div>

            </div>
            
            {/* Header Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSound}
                className="h-8 w-8 sm:h-10 sm:w-10 p-0"
                title={soundEnabled ? 'Mute notifications' : 'Enable notifications'}
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4 text-green-600" />
                ) : (
                  <VolumeX className="h-4 w-4 text-red-500" />
                )}
              </Button>
              
              {isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                  className="h-8 w-8 sm:h-10 sm:w-10 p-0"
                  title="Show team members"
                >
                  <Users className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 w-full max-w-full overflow-x-hidden">
        <div className="h-[calc(100vh-200px)] sm:h-[calc(100vh-220px)] md:h-[calc(100vh-240px)]">
          {/* Chat Area - Full width on mobile, 3/4 on desktop */}
          <div className={`${isMobile ? 'h-full' : 'grid grid-cols-1 lg:grid-cols-4 gap-4 h-full'}`}>
            <Card className={`${isMobile ? 'h-full border-0 rounded-lg' : 'lg:col-span-3'} flex flex-col overflow-hidden`}>
              <CardHeader className="flex-shrink-0 p-3 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                  General Chat
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col min-h-0 p-0 overflow-hidden">
                {/* Messages Area */}
                <div 
                  className={`flex-1 overflow-y-auto ${isMobile ? 'px-3 sm:px-6' : 'px-3 sm:px-6'}`} 
                  ref={scrollAreaRef} 
                  onScrollCapture={handleScroll}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mb-2" />
                      <p className="text-center text-sm">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4 py-3 sm:py-4 relative">
                      {messages.map((message, index) => {
                        const isOwnMessage = message.user_id === user.id;
                        const showAvatar = index === 0 || messages[index - 1].user_id !== message.user_id;
                        
                        return (
                          <div key={message.id} className={`flex gap-2 sm:gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                            {showAvatar && (
                              <div className="flex-shrink-0">
                                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                                  isOwnMessage 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'bg-muted text-muted-foreground'
                                }`}>
                                  {message.user_name.charAt(0).toUpperCase()}
                                </div>
                              </div>
                            )}
                            
                            <div className={`flex-1 ${showAvatar ? '' : 'ml-8 sm:ml-11'} ${isOwnMessage ? 'mr-8 sm:mr-11' : ''}`}>
                              {showAvatar && (
                                <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                                  <span className="font-medium text-xs sm:text-sm truncate">{message.user_name}</span>
                                  {getUserRoleBadge(message.user_role, message.user_position)}
                                  <span className="text-xs text-muted-foreground flex-shrink-0">
                                    {formatMessageTime(message.created_at)}
                                  </span>
                                </div>
                              )}
                              
                              <div className={`rounded-lg px-3 py-2 max-w-[85%] sm:max-w-[70%] ${
                                isOwnMessage 
                                  ? 'bg-primary text-primary-foreground ml-auto' 
                                  : 'bg-muted'
                              }`}>
                                <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Typing Indicator */}
                      <TypingIndicator />
                      
                      <div ref={messagesEndRef} />
                      

                    </div>
                  )}
                </div>
                
                <Separator />
                
                {/* Message Input */}
                <div className="p-3 sm:p-4 bg-muted/30">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input
                        value={newMessage}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message..."
                        disabled={isSending}
                        className={`${isMobile ? 'pr-16 text-base' : 'pr-24'}`}
                        maxLength={1000}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`${isMobile ? 'h-8 w-8' : 'h-6 w-6'} p-0`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowEmojiMenu(!showEmojiMenu);
                            }}
                          >
                            <Smile className="h-4 w-4" />
                          </Button>
                          
                          {/* Emoji Menu */}
                          {showEmojiMenu && (
                            <div 
                              className={`absolute ${isMobile ? 'bottom-10 right-0 w-72 max-h-56' : 'bottom-8 right-0 w-64 max-h-48'} bg-background border rounded-lg shadow-lg p-3 overflow-y-auto z-50`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className={`grid ${isMobile ? 'grid-cols-9' : 'grid-cols-8'} gap-1`}>
                                {popularEmojis.map((emoji, index) => (
                                  <button
                                    key={index}
                                    onClick={() => selectEmoji(emoji)}
                                    className={`${isMobile ? 'text-xl p-2' : 'text-lg p-1'} hover:bg-muted rounded transition-colors`}
                                    title={emoji}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        {!isMobile && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                          >
                            <Paperclip className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || isSending}
                      size={isMobile ? "default" : "sm"}
                      className={`${isMobile ? 'px-4' : ''}`}
                    >
                      <Send className="h-4 w-4" />
                      {isMobile && <span className="ml-2">Send</span>}
                    </Button>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {newMessage.length}/1000 characters {!isMobile && '• Click 😊 for emoji menu'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Desktop Sidebar */}
            {!isMobile && (
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4" />
                    Team Members
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="flex-1 overflow-y-auto">
                    <div className="space-y-1 p-4">
                      {/* Current User */}
                      <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name} (You)</p>
                          <div className="flex items-center gap-1">
                            {getUserRoleBadge(user.role, user.position)}
                          </div>
                          {isTyping && (
                            <p className="text-xs text-muted-foreground italic">typing...</p>
                          )}
                        </div>
                      </div>

                      {/* Other Users */}
                      {onlineUsers.map((otherUser) => {
                        const { isOnline, statusText } = getUserStatus(otherUser.last_seen);
                        const isUserTyping = typingUsers.some(t => t.user_id === otherUser.id);
                        
                        return (
                          <div key={otherUser.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                                {otherUser.name.charAt(0).toUpperCase()}
                              </div>
                              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-background rounded-full ${
                                isOnline ? 'bg-green-500' : 'bg-gray-400'
                              }`}></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{otherUser.name}</p>
                              <div className="flex items-center gap-1">
                                {getUserRoleBadge(otherUser.role, otherUser.position)}
                              </div>
                              {isUserTyping ? (
                                <p className="text-xs text-primary italic">typing...</p>
                              ) : !isOnline && (
                                <p className="text-xs text-muted-foreground">
                                  {statusText}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Mobile Sidebar Overlay */}
          {isMobile && showMobileSidebar && (
            <>
              {/* Backdrop */}
              <div 
                className="absolute inset-0 bg-black/50 z-40"
                onClick={() => setShowMobileSidebar(false)}
              />
              
              {/* Sidebar */}
              <div className="absolute top-0 right-0 h-full w-80 max-w-[80vw] bg-background border-l z-50 overflow-hidden">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold">Team Members</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowMobileSidebar(false)}
                      className="h-8 w-8 p-0"
                    >
                      ×
                    </Button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto">
                    <div className="space-y-1 p-4">
                      {/* Current User */}
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{user.name} (You)</p>
                          <div className="flex items-center gap-1 mt-1">
                            {getUserRoleBadge(user.role, user.position)}
                          </div>
                          {isTyping && (
                            <p className="text-xs text-muted-foreground italic mt-1">typing...</p>
                          )}
                        </div>
                      </div>

                      {/* Other Users */}
                      {onlineUsers.map((otherUser) => {
                        const { isOnline, statusText } = getUserStatus(otherUser.last_seen);
                        const isUserTyping = typingUsers.some(t => t.user_id === otherUser.id);
                        
                        return (
                          <div key={otherUser.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="relative">
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                                {otherUser.name.charAt(0).toUpperCase()}
                              </div>
                              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-background rounded-full ${
                                isOnline ? 'bg-green-500' : 'bg-gray-400'
                              }`}></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{otherUser.name}</p>
                              <div className="flex items-center gap-1 mt-1">
                                {getUserRoleBadge(otherUser.role, otherUser.position)}
                              </div>
                              {isUserTyping ? (
                                <p className="text-xs text-primary italic mt-1">typing...</p>
                              ) : !isOnline && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {statusText}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkspacePage;