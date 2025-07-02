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
  VolumeX,
  CornerDownLeft,
  X
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
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  user_position: string;
  user_role: string;
  message: string;
  created_at: string;
  updated_at?: string;
  reply_to_id?: string;
  reactions?: MessageReaction[];
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
  const [isEmojiMenuClosing, setIsEmojiMenuClosing] = useState(false);
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
  const [replyTo, setReplyTo] = useState<null | { id: string; user_name: string; message: string }>(null);
  const [hoveredReplyId, setHoveredReplyId] = useState<string | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [emojiMenuFor, setEmojiMenuFor] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [swipeMessageId, setSwipeMessageId] = useState<string | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const [messageReactions, setMessageReactions] = useState<{[messageId: string]: {[emoji: string]: string[]}}>({});
  const [longPressMessageId, setLongPressMessageId] = useState<string | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleCloseEmojiMenu = () => {
    if (isEmojiMenuClosing) return;
    setIsEmojiMenuClosing(true);
    setTimeout(() => {
      setShowEmojiMenu(false);
      setIsEmojiMenuClosing(false);
    }, 300); // Must match animation duration
  };

  // Emoji selection function
  const selectEmoji = (emoji: string) => {
    if (inputRef.current) {
      const start = inputRef.current.selectionStart || 0;
      const end = inputRef.current.selectionEnd || 0;
      const textBeforeCursor = newMessage.substring(0, start);
      const textAfterCursor = newMessage.substring(end);
      
      setNewMessage(textBeforeCursor + emoji + textAfterCursor);
      
      // Set cursor position after emoji
      setTimeout(() => {
        if (inputRef.current) {
          const newCursorPosition = start + emoji.length;
          inputRef.current.selectionStart = newCursorPosition;
          inputRef.current.selectionEnd = newCursorPosition;
          inputRef.current.focus();
        }
      }, 0);
    } else {
    setNewMessage(prev => prev + emoji);
    }
    handleCloseEmojiMenu();
  };

  // Track cursor position
  const handleSelect = (e: React.SyntheticEvent<HTMLInputElement>) => {
    setCursorPosition(e.currentTarget.selectionStart);
  };

  // Close emoji menu when clicking outside and handle mobile scroll prevention
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('.emoji-menu-container, .emoji-toggle-button')) {
        return;
      }
      if (showEmojiMenu || emojiMenuFor) {
        handleCloseEmojiMenu();
        setEmojiMenuFor(null);
      }
    };

    // Prevent body scroll on mobile when emoji menu is open
    if ((showEmojiMenu || emojiMenuFor) && isMobile) {
      document.body.classList.add('emoji-menu-open');
    } else {
      document.body.classList.remove('emoji-menu-open');
    }

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.body.classList.remove('emoji-menu-open');
    };
  }, [showEmojiMenu, emojiMenuFor, isEmojiMenuClosing, isMobile]);

  // ============================================
  // 🎯 ADD CUSTOM useEffect HOOKS HERE
  // ============================================
  
  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
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

      // Update presence and online users list every 30 seconds
      const presenceInterval = setInterval(() => {
        updateUserPresence();
        loadOnlineUsers();  // Added this to refresh online users list
      }, 30000);
      
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
      }, 30000);
      
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
    // Try to use messagesEndRef for reliable scroll
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    // Fallback: try to scroll using scrollAreaRef
    if (!isAutoScrolling.current && scrollAreaRef.current) {
      isAutoScrolling.current = true;
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
      }
        isAutoScrolling.current = false;
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
      // Get timestamp for 5 minutes ago
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('users')
        .select('id, name, position, role, last_seen')
        .neq('id', user?.id)
        .gte('last_seen', fiveMinutesAgo)  // Only get users seen in last 5 minutes
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
      
      const { data: insertedRows, error } = await supabase
        .from('workspace_messages')
        .insert([{
          user_id: user.id,
          user_name: user.name,
          user_position: user.position,
          user_role: user.role,
          message: processedMessage,
          reply_to_id: replyTo?.id || null,
        }])
        .select('*')
        .single();

      if (error) throw error;

      // Optimistically append the new message to state so the sender sees it instantly
      if (insertedRows) {
        setMessages(prev => {
          if (prev.some(m => m.id === insertedRows.id)) return prev;
          return [...prev, insertedRows as any];
        });
      }
      
      setNewMessage('');
      setReplyTo(null);
      
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
      'Customer Service': 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      'Media Buyer': 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
      'Designer': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
    };
    
    const colorClass = positionColors[position] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
    
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

  // Place this useEffect after the messages rendering (after the JSX that renders messages)
  useEffect(() => {
    // Always scroll to bottom when messages change
    scrollToBottom();
  }, [messages]);

  // Add function to handle reactions
  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) {
      toast.error('You must be logged in to react to messages');
      return;
    }

    try {
      const userName = user.name;
      const currentReactions = messageReactions[messageId] || {};

      // Determine if the user has already reacted (and with which emoji)
      let existingEmoji: string | null = null;
      for (const [em, users] of Object.entries(currentReactions)) {
        if (users.includes(userName)) {
          existingEmoji = em;
          break;
        }
      }

      // If the user clicked the same emoji they already reacted with -> toggle remove
      if (existingEmoji === emoji) {
        console.log('Removing reaction:', { messageId, userId: user.id, emoji });
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .match({ message_id: messageId, user_id: user.id, emoji });

        if (error) {
          console.error('Error removing reaction:', error);
          throw error;
        }

        // Update local state
        setMessageReactions(prev => {
          const messageReacts = { ...(prev[messageId] || {}) } as {[e: string]: string[]};
          messageReacts[emoji] = (messageReacts[emoji] || []).filter(name => name !== userName);
          if (messageReacts[emoji].length === 0) {
            delete messageReacts[emoji];
          }
          return { ...prev, [messageId]: messageReacts };
        });
        return;
      }

      // Remove any previous reaction by this user (if exists and different emoji)
      if (existingEmoji) {
        console.log('Replacing reaction: removing previous', existingEmoji);
        const { error: deleteError } = await supabase
          .from('message_reactions')
          .delete()
          .match({ message_id: messageId, user_id: user.id });

        if (deleteError) {
          console.error('Error removing previous reaction:', deleteError);
          // Continue even if delete fails, to try inserting new reaction
        }
      }

      // Add (or replace with) new reaction
      console.log('Adding reaction:', { messageId, userId: user.id, emoji });
      const { error: insertError } = await supabase
        .from('message_reactions')
        .insert({ message_id: messageId, user_id: user.id, emoji });

      if (insertError) {
        console.error('Error adding reaction:', insertError);
        toast.error('Failed to add reaction');
        return;
      }

      // Update local state
      setMessageReactions(prev => {
        // First remove user from any existing emoji arrays
        const messageReacts = { ...(prev[messageId] || {}) } as {[e: string]: string[]};
        Object.keys(messageReacts).forEach(em => {
          messageReacts[em] = messageReacts[em].filter(name => name !== userName);
          if (messageReacts[em].length === 0) {
            delete messageReacts[em];
          }
        });

        // Add user to the new emoji array
        if (!messageReacts[emoji]) {
          messageReacts[emoji] = [];
        }
        messageReacts[emoji].push(userName);

        return { ...prev, [messageId]: messageReacts };
      });
    } catch (error) {
      console.error('Error handling reaction:', error);
      toast.error('Failed to update reaction. Please try again.');
    }
  };

  // Add function to load reactions
  const loadReactions = async () => {
    try {
      const { data, error } = await supabase
        .from('message_reactions')
        .select(`
          id,
          message_id,
          user_id,
          emoji,
          users!inner (
            name
          )
        `)
        .returns<Array<{
          id: string;
          message_id: string;
          user_id: string;
          emoji: string;
          users: { name: string };
        }>>();

      if (error) throw error;

      // Transform reactions into the format we need
      const reactionsMap: {[messageId: string]: {[emoji: string]: string[]}} = {};
      data?.forEach(reaction => {
        const messageId = reaction.message_id;
        const emoji = reaction.emoji;
        const userName = reaction.users.name;

        if (!reactionsMap[messageId]) {
          reactionsMap[messageId] = {};
        }
        if (!reactionsMap[messageId][emoji]) {
          reactionsMap[messageId][emoji] = [];
        }
        reactionsMap[messageId][emoji].push(userName);
      });

      setMessageReactions(reactionsMap);
    } catch (error) {
      console.error('Error loading reactions:', error);
    }
  };

  // Subscribe to reaction changes
  useEffect(() => {
    const reactionsChannel = supabase
      .channel('reactions_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'message_reactions' }, 
        () => {
          // Reload reactions when changes occur
          loadReactions();
        }
      )
      .subscribe();

    // Load initial reactions
    loadReactions();

    return () => {
      supabase.removeChannel(reactionsChannel);
    };
  }, []);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 w-full max-w-full overflow-x-hidden">
      {/* Main Content Area */}
      <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 w-full max-w-full overflow-x-hidden">
        <div className="h-[calc(100vh-120px)] sm:h-[calc(100vh-140px)] md:h-[calc(100vh-160px)]">
          {/* Chat Area - Full width on mobile, with sidebar on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
            <Card className="lg:col-span-3 flex flex-col overflow-hidden">
              <CardHeader className="flex-shrink-0 p-3 sm:p-4 border-b">
                <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                  General Chat
                </CardTitle>
                  {/* Mobile Team Members Button */}
              <Button
                variant="ghost"
                size="sm"
                    className="lg:hidden"
                    onClick={() => setShowMobileSidebar(true)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    <span className="text-sm">Team</span>
              </Button>
            </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                {/* Messages Area */}
                <ScrollArea className="flex-1 p-3 sm:p-4">
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
                    <div className="space-y-2 sm:space-y-3 py-3 sm:py-4 relative">
                      {messages.map((message, index) => {
                        const isOwnMessage = message.user_id === user.id;
                        const isReply = !!message.reply_to_id;
                        const prev = messages[index - 1];
                        const next = messages[index + 1];
                        const isFirstInGroup = index === 0 || prev?.user_id !== message.user_id || !!prev?.reply_to_id || isReply;
                        const isLastInGroup = index === messages.length - 1 || next?.user_id !== message.user_id || !!next?.reply_to_id || isReply;
                        const isConsecutive = !isFirstInGroup && !isReply;
                        const repliedMessage = message.reply_to_id ? messages.find(m => m.id === message.reply_to_id) : null;
                        
                        return (
                          <div
                            key={message.id}
                            className={`flex gap-2 sm:gap-3 ${isFirstInGroup ? 'mt-3' : 'mt-0'} group-message-row ${
                              longPressMessageId === message.id ? 'long-press-active' : ''
                            }`}
                            onMouseEnter={() => { setHoveredReplyId(message.reply_to_id || null); setHoveredMessageId(message.id); }}
                            onMouseLeave={() => { setHoveredReplyId(null); setHoveredMessageId(null); setEmojiMenuFor(null); }}
                            // Enhanced mobile interactions - swipe to reply + long press for emoji
                            onTouchStart={isMobile ? (e) => {
                              setTouchStartX(e.touches[0].clientX);
                              setSwipeMessageId(message.id);
                              setSwipeDirection(null);
                              setDragOffset(0);
                              
                              // Long press for emoji reactions
                              const timer = setTimeout(() => {
                                setLongPressMessageId(message.id);
                                setEmojiMenuFor(message.id);
                                // Add haptic feedback if available
                                if (navigator.vibrate) {
                                  navigator.vibrate(50);
                                }
                              }, 700);
                              setLongPressTimer(timer);
                            } : undefined}
                            onTouchMove={isMobile ? (e) => {
                              // Clear long press timer if user moves finger
                              if (longPressTimer) {
                                clearTimeout(longPressTimer);
                                setLongPressTimer(null);
                              }
                              
                              // Handle swipe logic
                              if (touchStartX !== null && swipeMessageId === message.id) {
                                const currentX = e.touches[0].clientX;
                                const diff = currentX - touchStartX;
                                setDragOffset(diff);
                                
                                if (Math.abs(diff) > 10) {
                                  setSwipeDirection(diff > 0 ? 'right' : 'left');
                                }
                              }
                            } : undefined}
                            onTouchEnd={isMobile ? () => {
                              // Clear long press timer
                              if (longPressTimer) {
                                clearTimeout(longPressTimer);
                                setLongPressTimer(null);
                              }
                              
                              // Reset touch states
                              setTouchStartX(null);
                              setSwipeMessageId(null);
                              setSwipeDirection(null);
                              setDragOffset(0);
                            } : undefined}
                          >
                            <div className={`flex flex-col items-end min-w-0 flex-1`}>
                              {isFirstInGroup && (
                                <div className="flex items-center gap-2 mb-1 transition-all duration-200 hover:scale-105">
                                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-all duration-200 ${
                                  isOwnMessage 
                                      ? 'bg-gradient-to-br from-primary to-primary/80 text-white shadow-md' 
                                      : 'bg-gradient-to-br from-muted to-muted/60 text-muted-foreground shadow-sm'
                                }`}>
                                  {message.user_name.charAt(0).toUpperCase()}
                                </div>
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-xs sm:text-sm truncate text-foreground">{message.user_name}</span>
                                  {getUserRoleBadge(message.user_role, message.user_position)}
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                    {formatMessageTime(message.created_at)}
                                  </span>
                                </div>
                                </div>
                              )}
                              {repliedMessage && (
                                <div className={`flex items-center gap-1 text-xs rounded bg-muted/40 px-2 py-1 mb-1 ${isOwnMessage ? 'border-r-4 border-primary/60' : 'border-l-4 border-muted-foreground/60'} max-w-[80%]`}>
                                  <div className="flex items-center gap-1">
                                    <CornerDownLeft className="inline-block h-3 w-3 text-primary/70" />
                                    <span className="font-medium text-muted-foreground">{repliedMessage.user_name}</span>
                                  </div>
                                  <span className="truncate text-muted-foreground/80" dangerouslySetInnerHTML={{__html: processMessageForDisplay(repliedMessage.message)}} />
                                </div>
                              )}
                              <div className="relative group message-bubble-container">
                                {/* Compute bubble class and dir outside JSX for clarity and linter safety */}
                                {(() => {
                                  const base = 'px-4 py-2 max-w-[90vw] sm:max-w-md md:max-w-lg shadow-sm transition-all duration-200';
                                  const shape = isFirstInGroup && isLastInGroup
                                    ? 'rounded-2xl'
                                    : isFirstInGroup
                                      ? isOwnMessage
                                        ? 'rounded-2xl rounded-br-lg'
                                        : 'rounded-2xl rounded-bl-lg'
                                      : isLastInGroup
                                        ? isOwnMessage
                                          ? 'rounded-2xl rounded-tr-lg'
                                          : 'rounded-2xl rounded-tl-lg'
                                        : 'rounded-2xl';
                                  const color = isOwnMessage
                                    ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100';
                                  const ring = hoveredReplyId === message.id ? 'ring-2 ring-primary/70 ring-offset-2' : '';
                                  const dir = /^[\u0000-\u007F]*$/.test(message.message) ? 'ltr' : 'rtl';
                                  const transform = swipeMessageId === message.id ? `transform translate-x-[${dragOffset}px]` : '';
                                  const bubbleClass = `${base} ${shape} ${color} ${ring} ${transform}`;
                                  return (
                                    <div
                                      className={bubbleClass + ' ml-auto'}
                                      dir={dir}
                                      style={{
                                        margin: 0,
                                        marginTop: isFirstInGroup ? '0' : '2px',
                                        transform: isMobile && swipeMessageId === message.id ? `translateX(${Math.min(Math.abs(dragOffset), 100) * (dragOffset > 0 ? 1 : -1)}px)` : 'none',
                                        transition: swipeMessageId === message.id ? 'none' : 'transform 200ms ease-out'
                                      }}
                                    >
                                      <span className="text-sm whitespace-pre-line break-words" dangerouslySetInnerHTML={{__html: processMessageForDisplay(message.message)}} />
                                    </div>
                                  );
                                })()}
                                {/* Action buttons on hover - Hidden on mobile since swipe/long-press exists */}
                                {hoveredMessageId === message.id && !isMobile && (
                                  <div
                                    className={`absolute top-1/2 -translate-y-1/2 z-10 flex gap-1 bg-white/80 dark:bg-gray-800/80 rounded-full shadow px-1 py-0.5 border border-gray-200 dark:border-gray-700 transition-all duration-150 ${
                                      // Always show on the left side regardless of message owner
                                      'left-0 -translate-x-full'
                                    }`}
                                  >
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 p-0"
                                      onClick={e => { e.stopPropagation(); setEmojiMenuFor(message.id); }}
                                      title="React with emoji"
                                    >
                                      <Smile className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 p-0"
                                      onClick={e => { e.stopPropagation(); setReplyTo({ id: message.id, user_name: message.user_name, message: message.message }); }}
                                      title="Reply to message"
                                    >
                                      <CornerDownLeft className="h-4 w-4" />
                                    </Button>
                                </div>
                              )}
                              
                                {/* Enhanced horizontal reaction display - MOVED ABOVE MESSAGE */}
                                {messageReactions[message.id] ? (
                                  Object.keys(messageReactions[message.id]).length > 0 && (
                                    <div className="message-reactions-container flex items-center gap-1.5 mb-2 flex-wrap"> {/* Improved horizontal layout */}
                                      {Object.entries(messageReactions[message.id]).map(([emoji, users]) => (
                                        <button
                                          key={emoji}
                                          onClick={() => handleReaction(message.id, emoji)}
                                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border reaction-bubble group relative transition-all duration-200 ${
                                            users.includes(user?.name || '') 
                                              ? 'bg-primary/20 border-primary/40 text-primary font-semibold shadow-sm' 
                                              : 'bg-muted/40 border-muted/60 hover:bg-primary/15 hover:border-primary/30 text-muted-foreground hover:text-primary'
                                          }`}
                                          title={`Reacted by: ${users.join(', ')}`}
                                        >
                                          <span className="text-sm emoji-scale-animation relative z-10">{emoji}</span>
                                          <span className="font-medium relative z-10 text-xs">{users.length}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )
                                ) : null}

                                                                {/* Quick 7-emoji reaction menu */}
                                {emojiMenuFor === message.id && (
                                  <>
                                    {/* Backdrop for reaction menu */}
                                    <div 
                                      className="fixed inset-0 z-[99998] bg-transparent"
                                      onClick={() => setEmojiMenuFor(null)}
                                    />
                                    <div 
                                      className={`fixed z-[99999] mobile-emoji-menu
                                        bottom-24 right-4 w-[280px]
                                        md:absolute md:bottom-8 md:right-0 md:w-[280px]
                                        bg-white dark:bg-gray-800 border-2 border-primary/20 rounded-2xl shadow-2xl overflow-hidden
                                        ${isEmojiMenuClosing ? 'emoji-menu-exit' : 'emoji-menu-enter'}`}
                                      aria-label="Quick emoji reactions"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="p-3">
                                        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
                                          <span className="text-primary">⚡</span>
                                          Quick Reactions
                                        </div>
                                        <div className="grid grid-cols-7 gap-2">
                                          {['👍', '❤️', '😊', '😂', '😡', '🔥', '💯'].map((emoji) => (
                                            <button
                                              key={emoji}
                                              onClick={() => {
                                                handleReaction(message.id, emoji);
                                                setEmojiMenuFor(null);
                                              }}
                                              className="relative p-2 text-xl transition-all duration-200 rounded-xl group hover:bg-primary/10 hover:scale-110 active:scale-95"
                                              title={emoji}
                                            >
                                              <span className="relative z-10 group-hover:drop-shadow-lg">
                                                {emoji}
                                              </span>
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                )}



                              </div>
                            </div>
{!isFirstInGroup && <div className={`w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 ${isOwnMessage ? 'order-3' : 'order-0'}`} />}
                          </div>
                        );
                      })}
                      
                      {/* Typing Indicator */}
                      <TypingIndicator />
                      
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
                
                <Separator />
                
                {/* Message Input */}
                <div className="p-3 sm:p-4">
                  {/* Reply preview */}
                  {replyTo && (
                    <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-muted/30 rounded-lg">
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <CornerDownLeft className="h-4 w-4 text-primary/70 flex-shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-medium text-muted-foreground">Replying to {replyTo.user_name}</span>
                          <span className="text-xs truncate text-muted-foreground/70" dangerouslySetInnerHTML={{__html: processMessageForDisplay(replyTo.message)}} />
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 rounded-full hover:bg-muted/60"
                        onClick={() => setReplyTo(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      {/* Emoji button on the right */}
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-muted/60 rounded-full emoji-toggle-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              showEmojiMenu ? handleCloseEmojiMenu() : setShowEmojiMenu(true);
                            }}
                          >
                            <Smile className="h-4 w-4" />
                          </Button>
                          
                                                    {/* Enhanced Emoji Menu with Higher Z-Index */}
                          {showEmojiMenu && (
                            <>
                              {/* Backdrop */}
                              <div 
                                className="fixed inset-0 z-[99998] bg-transparent"
                                onClick={handleCloseEmojiMenu}
                              />
                              {/* Emoji Menu */}
                              <div 
                                className={`fixed z-[99999] mobile-emoji-menu
                                  bottom-4 right-4 w-[320px] max-h-[60vh]
                                  md:absolute md:bottom-full md:mb-3 md:right-0 md:w-[420px] md:max-h-[50vh]
                                  bg-white dark:bg-gray-800 border-2 border-primary/20 rounded-2xl shadow-2xl overflow-hidden
                                  ${isEmojiMenuClosing ? 'emoji-menu-exit' : 'emoji-menu-enter'}`}
                                style={{overflowY:'auto'}}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="p-4 border-b border-muted/50">
                                  <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
                                    <span className="text-primary emoji-scale-animation">🌟</span>
                                    Frequently Used
                                  </div>
                                  <div className="grid grid-cols-8 gap-2">
                                    {popularEmojis.slice(0, 16).map((emoji, index) => (
                                      <button
                                        key={index}
                                        onClick={() => selectEmoji(emoji)}
                                        className="relative p-2 text-xl transition-all duration-200 rounded-xl group emoji-scale-animation emoji-button-gradient hover:bg-primary/10 hover:scale-110 active:scale-95"
                                        title={emoji}
                                      >
                                        <span className="relative z-10 group-hover:drop-shadow-lg">
                                          {emoji}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div className="p-4">
                                  <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
                                    <span className="text-blue-500 emoji-scale-animation">😊</span>
                                    All Emojis
                                  </div>
                                  <div className="grid grid-cols-8 gap-2 emoji-menu-scroll" style={{maxHeight: '200px', overflowY: 'auto'}}>
                                    {popularEmojis.slice(16).map((emoji, index) => (
                                      <button
                                        key={index}
                                        onClick={() => selectEmoji(emoji)}
                                        className="relative p-2 text-xl transition-all duration-200 rounded-xl group emoji-scale-animation emoji-button-gradient hover:bg-primary/10 hover:scale-110 active:scale-95"
                                        title={emoji}
                                      >
                                        <span className="relative z-10 group-hover:drop-shadow-lg">
                                          {emoji}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                      </div>
                    </div>

                      <Input
                        ref={inputRef}
                        value={newMessage}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        onSelect={handleSelect}
                        placeholder={replyTo ? "Type your reply..." : "Type your message..."}
                        disabled={isSending}
                        className="pl-4 pr-12 text-base"
                        maxLength={1000}
                      />
                  </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Desktop Sidebar - Only Online Users */}
            <Card className="hidden lg:flex flex-col h-full">
              <CardHeader className="flex-shrink-0 p-3 sm:p-4 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4" />
                    Online Team
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {onlineUsers.length + 1}
                  </Badge>
                </div>
                </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="space-y-1 p-3">
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

                    {/* Other Online Users */}
                      {onlineUsers.map((otherUser) => {
                        const isUserTyping = typingUsers.some(t => t.user_id === otherUser.id);
                        
                        return (
                          <div key={otherUser.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                                {otherUser.name.charAt(0).toUpperCase()}
                              </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{otherUser.name}</p>
                              <div className="flex items-center gap-1">
                                {getUserRoleBadge(otherUser.role, otherUser.position)}
                              </div>
                            {isUserTyping && (
                                <p className="text-xs text-primary italic">typing...</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                </ScrollArea>
                </CardContent>
              </Card>
          </div>

          {/* Mobile Sidebar Overlay - Only Online Users */}
          {isMobile && showMobileSidebar && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black/50 z-40"
                onClick={() => setShowMobileSidebar(false)}
              />
              
              {/* Sidebar */}
              <div className="fixed top-0 right-0 h-full w-80 max-w-[80vw] bg-background border-l z-50">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">Online Team</h3>
                      <Badge variant="secondary" className="text-xs">
                        {onlineUsers.length + 1}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowMobileSidebar(false)}
                      className="h-8 w-8 p-0"
                    >
                      ×
                    </Button>
                  </div>
                  
                  <ScrollArea className="flex-1">
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

                      {/* Other Online Users */}
                      {onlineUsers.map((otherUser) => {
                        const isUserTyping = typingUsers.some(t => t.user_id === otherUser.id);
                        
                        return (
                          <div key={otherUser.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="relative">
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                                {otherUser.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{otherUser.name}</p>
                              <div className="flex items-center gap-1 mt-1">
                                {getUserRoleBadge(otherUser.role, otherUser.position)}
                              </div>
                              {isUserTyping && (
                                <p className="text-xs text-primary italic mt-1">typing...</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
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