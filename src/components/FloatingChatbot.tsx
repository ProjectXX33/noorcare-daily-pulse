import React, { useState } from 'react';
import { MessageCircle, Bot } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const FloatingChatbot: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`
              fixed right-6 bottom-6 z-40
              w-14 h-14 rounded-full
              bg-gradient-to-r from-blue-500 to-blue-600
              hover:from-blue-600 hover:to-blue-700
              shadow-lg hover:shadow-xl
              flex items-center justify-center
              cursor-pointer transition-all duration-300
              hover:scale-110 active:scale-95
              border-2 border-white
            `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => {
              // Placeholder for future functionality
              console.log('Chatbot clicked - Coming soon!');
            }}
          >
            <div className="relative">
              <Bot className="h-6 w-6 text-white" />
              {/* Animated pulse effect */}
              <div className="absolute -inset-3 rounded-full bg-blue-400 opacity-20 animate-ping"></div>
              {/* Secondary pulse */}
              <div className="absolute -inset-1 rounded-full bg-blue-300 opacity-40 animate-pulse"></div>
            </div>
            
            {/* Notification dot */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={15} className="max-w-xs">
          <div className="flex items-center gap-3 p-1">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-white" />
              </div>
            </div>
            <div>
              <div className="font-semibold text-sm text-foreground">AI Assistant</div>
              <div className="text-xs text-muted-foreground">Coming Soon!</div>
              <div className="text-xs text-muted-foreground mt-1">
                Get instant help with your tasks
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default FloatingChatbot; 