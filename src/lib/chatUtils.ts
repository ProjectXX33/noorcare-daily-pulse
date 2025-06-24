// Chat utility functions
// Add your custom JavaScript functions here

// Sound utilities
export const playNotificationSound = (soundType: 'message' | 'mention' | 'error' = 'message') => {
  const sounds = {
    message: '/sounds/message.mp3',
    mention: '/sounds/mention.mp3',
    error: '/sounds/error.mp3'
  };
  
  const audio = new Audio(sounds[soundType]);
  audio.volume = 0.5;
  audio.play().catch(console.error);
};

// Text formatting utilities
export const formatMessageText = (text: string) => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **bold**
    .replace(/\*(.*?)\*/g, '<em>$1</em>') // *italic*
    .replace(/`(.*?)`/g, '<code>$1</code>') // `code`
    .replace(/@(\w+)/g, '<span class="mention">@$1</span>'); // @mentions
};

// Emoji utilities
export const convertEmojis = (text: string) => {
  const emojiMap: { [key: string]: string } = {
    ':)': '😊',
    ':D': '😃',
    ':(': '😢',
    ':P': '😛',
    ';)': '😉',
    '<3': '❤️',
    ':thumbsup:': '👍',
    ':thumbsdown:': '👎',
    ':fire:': '🔥',
    ':rocket:': '🚀',
    ':smile:': '😊',
    ':laugh:': '😄',
    ':sad:': '😢',
    ':cry:': '😭',
    ':heart:': '❤️',
    ':like:': '👍',
    ':dislike:': '👎',
    ':star:': '⭐',
    ':sun:': '☀️',
    ':moon:': '🌙',
    ':check:': '✅',
    ':x:': '❌',
    ':warning:': '⚠️',
    ':idea:': '💡',
    ':time:': '⏰',
    ':coffee:': '☕',
    ':clap:': '👏',
    ':pray:': '🙏',
    ':100:': '💯',
    ':sparkles:': '✨'
  };
  
  let result = text;
  Object.entries(emojiMap).forEach(([key, emoji]) => {
    result = result.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), emoji);
  });
  
  return result;
};

// Time utilities
export const formatChatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  
  if (diffInHours < 1) {
    return 'Just now';
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)} hours ago`;
  } else {
    return date.toLocaleDateString();
  }
};

// Message validation
export const validateMessage = (message: string): { isValid: boolean; error?: string } => {
  if (!message.trim()) {
    return { isValid: false, error: 'Message cannot be empty' };
  }
  
  if (message.length > 1000) {
    return { isValid: false, error: 'Message too long (max 1000 characters)' };
  }
  
  return { isValid: true };
};

// Local storage utilities for chat
export const saveChatPreferences = (preferences: any) => {
  localStorage.setItem('chatPreferences', JSON.stringify(preferences));
};

export const getChatPreferences = () => {
  const saved = localStorage.getItem('chatPreferences');
  return saved ? JSON.parse(saved) : {};
};

// URL detection and link formatting
export const detectAndFormatLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">$1</a>');
};

// Chat commands processor
export const processChatCommand = (message: string, userId: string) => {
  if (!message.startsWith('/')) return null;
  
  const [command, ...args] = message.slice(1).split(' ');
  
  switch (command.toLowerCase()) {
    case 'help':
      return {
        type: 'system',
        message: 'Available commands: /help, /clear, /status, /time'
      };
    
    case 'clear':
      return {
        type: 'action',
        action: 'clear_chat'
      };
    
    case 'status':
      return {
        type: 'system',
        message: `Your status: Online | User ID: ${userId}`
      };
    
    case 'time':
      return {
        type: 'system',
        message: `Current time: ${new Date().toLocaleString()}`
      };
    
    default:
      return {
        type: 'system',
        message: `Unknown command: /${command}. Type /help for available commands.`
      };
  }
};

// Advanced message processing with emoji conversion
export const processMessageForDisplay = (message: string): string => {
  let processedMessage = message;
  
  // Convert emojis first
  processedMessage = convertEmojis(processedMessage);
  
  // Format text (bold, italic, etc.)
  processedMessage = formatMessageText(processedMessage);
  
  // Detect and format links
  processedMessage = detectAndFormatLinks(processedMessage);
  
  // Add emoji size class
  processedMessage = processedMessage.replace(/(\p{Emoji}+)/gu, '<span class="text-xl">$1</span>');
  
  return processedMessage;
};

// Message cleanup utility - only 50-message limit (no time expiration)
export const cleanupMessages = (messages: any[]): any[] => {
  // Only limit to 50 messages max, keep newest
  if (messages.length > 50) {
    return messages.slice(-50);
  }
  
  return messages;
};

// Get messages that need to be deleted from database
export const getMessagesToDelete = (messages: any[]): any[] => {
  if (messages.length > 50) {
    // Return the oldest messages that exceed the limit
    return messages.slice(0, messages.length - 50);
  }
  return [];
};

// Generate unique channel name to prevent conflicts
export const generateUniqueChannelName = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Check if user is near bottom of scroll area
export const isNearBottom = (element: HTMLElement, threshold: number = 100): boolean => {
  const { scrollTop, scrollHeight, clientHeight } = element;
  return scrollHeight - scrollTop - clientHeight < threshold;
};

// Scroll element to bottom smoothly
export const scrollToBottom = (element: HTMLElement | null) => {
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};

// Format user status for display
export const getUserStatus = (lastSeen: string): { isOnline: boolean; statusText: string } => {
  const lastSeenDate = new Date(lastSeen);
  const now = new Date();
  const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
  
  if (diffMinutes < 5) {
    return { isOnline: true, statusText: 'Online' };
  } else if (diffMinutes < 60) {
    return { isOnline: false, statusText: `${Math.floor(diffMinutes)} min ago` };
  } else if (diffMinutes < 1440) {
    return { isOnline: false, statusText: `${Math.floor(diffMinutes / 60)} hrs ago` };
  } else {
    return { isOnline: false, statusText: `${Math.floor(diffMinutes / 1440)} days ago` };
  }
};


// Now using these utilities:
// - cleanupMessages() - 20min expiration + 50 message limit
// - generateUniqueChannelName() - Prevents conflicts
// - checkNearBottom() - Smart scroll detection
// - validateMessage() - Input validation
// - convertEmojis() - Emoji processing
// - getUserStatus() - Better status display 