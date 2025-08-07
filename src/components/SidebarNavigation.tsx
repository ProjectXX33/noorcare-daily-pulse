import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorkspaceMessages } from '@/contexts/WorkspaceMessageContext';
import { 
  Home, 
  Users, 
  ClipboardList, 
  CheckSquare, 
  User, 
  LogOut,
  Settings,
  Calendar,
  Clock,
  LayoutDashboard,
  LogIn,
  ListTodo,
  FileText,
  Brush,
  MessageSquare,
  Star,
  Bug,
  BarChart3,
  ShoppingCart,
  Wrench,
  Crown,
  TrendingUp,
  Edit3,
  Package,
  Globe,
  Receipt,
  DatabaseIcon,
  Target,
  Medal,
  Award,
  Gem
} from 'lucide-react';
import { GrowthStrategyIcon } from './GrowthStrategyIcon';
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarHeader, 
  SidebarContent, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import NotificationsMenu from '@/components/NotificationsMenu';

import { useIsMobile } from '@/hooks/use-mobile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/supabase';
import WorkShiftTimer from '@/components/WorkShiftTimer';
import VersionDisplay from '@/components/VersionDisplay';
import UserRankingProfile, { useUserRankingTheme, useUserRanking } from '@/components/UserRankingProfile';
import { ThemeToggle } from "@/components/ui/theme-toggle";

// SAR Icon Component
const SARIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 1124.14 1256.39" 
    width="14" 
    height="15.432" 
    style={{display:'inline-block', verticalAlign:'-0.125em'}}
  >
    <path fill="currentColor" d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
    <path fill="currentColor" d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
  </svg>
);

interface SidebarNavigationProps {
  children?: React.ReactNode;
}

// Special effects component for ranked headers
const HeaderEffects: React.FC<{ effectType: string }> = ({ effectType }) => {
  if (effectType === 'none') return null;

  // Add custom CSS for ULTRA-PREMIUM Diamond effects
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes flashPulse {
        0%, 100% { opacity: 0.3; transform: scale(0.8); }
        50% { opacity: 1; transform: scale(1.2); }
      }
      
      @keyframes colorShift {
        0% { filter: hue-rotate(0deg); }
        50% { filter: hue-rotate(180deg); }
        100% { filter: hue-rotate(360deg); }
      }
      
      @keyframes gentleGlow {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 0.8; }
      }
      
      /* PREMIUM Diamond Animations */
      @keyframes diamondShimmer {
        0% { 
          opacity: 0.6; 
          transform: scale(0.9) rotate(0deg); 
          filter: brightness(1) saturate(1.2); 
        }
        25% { 
          opacity: 1; 
          transform: scale(1.1) rotate(90deg); 
          filter: brightness(1.3) saturate(1.5); 
        }
        50% { 
          opacity: 0.8; 
          transform: scale(1.2) rotate(180deg); 
          filter: brightness(1.5) saturate(1.8); 
        }
        75% { 
          opacity: 1; 
          transform: scale(1.1) rotate(270deg); 
          filter: brightness(1.3) saturate(1.5); 
        }
        100% { 
          opacity: 0.6; 
          transform: scale(0.9) rotate(360deg); 
          filter: brightness(1) saturate(1.2); 
        }
      }
      
      @keyframes diamondFloat {
        0%, 100% { 
          transform: translateY(0px) translateX(0px) scale(1); 
          opacity: 0.7; 
        }
        25% { 
          transform: translateY(-3px) translateX(2px) scale(1.1); 
          opacity: 1; 
        }
        50% { 
          transform: translateY(-6px) translateX(0px) scale(1.2); 
          opacity: 0.8; 
        }
        75% { 
          transform: translateY(-3px) translateX(-2px) scale(1.1); 
          opacity: 1; 
        }
      }
      
      @keyframes diamondPulse {
        0%, 100% { 
          box-shadow: 0 0 10px rgba(34, 211, 238, 0.4), 0 0 20px rgba(147, 51, 234, 0.3), 0 0 30px rgba(59, 130, 246, 0.2);
          transform: scale(1);
        }
        50% { 
          box-shadow: 0 0 20px rgba(34, 211, 238, 0.8), 0 0 40px rgba(147, 51, 234, 0.6), 0 0 60px rgba(59, 130, 246, 0.4);
          transform: scale(1.05);
        }
      }
      
      @keyframes diamondSparkle {
        0% { 
          opacity: 0; 
          transform: scale(0) rotate(0deg); 
        }
        20% { 
          opacity: 1; 
          transform: scale(1.2) rotate(72deg); 
        }
        40% { 
          opacity: 0.8; 
          transform: scale(0.8) rotate(144deg); 
        }
        60% { 
          opacity: 1; 
          transform: scale(1.1) rotate(216deg); 
        }
        80% { 
          opacity: 0.6; 
          transform: scale(0.9) rotate(288deg); 
        }
        100% { 
          opacity: 0; 
          transform: scale(0) rotate(360deg); 
        }
      }
      
      @keyframes diamondRainbow {
        0% { filter: hue-rotate(0deg) brightness(1.2) saturate(1.5); }
        16.66% { filter: hue-rotate(60deg) brightness(1.3) saturate(1.6); }
        33.33% { filter: hue-rotate(120deg) brightness(1.4) saturate(1.7); }
        50% { filter: hue-rotate(180deg) brightness(1.5) saturate(1.8); }
        66.66% { filter: hue-rotate(240deg) brightness(1.4) saturate(1.7); }
        83.33% { filter: hue-rotate(300deg) brightness(1.3) saturate(1.6); }
        100% { filter: hue-rotate(360deg) brightness(1.2) saturate(1.5); }
      }
      
      /* 🚀 NEW ULTRA-PREMIUM DIAMOND ANIMATIONS - NEXT LEVEL LUXURY */
      
      @keyframes diamond3dRotate {
        0% { 
          transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1); 
          filter: brightness(1) saturate(1.2); 
        }
        25% { 
          transform: rotateX(90deg) rotateY(90deg) rotateZ(90deg) scale(1.1); 
          filter: brightness(1.3) saturate(1.5); 
        }
        50% { 
          transform: rotateX(180deg) rotateY(180deg) rotateZ(180deg) scale(1.2); 
          filter: brightness(1.5) saturate(1.8); 
        }
        75% { 
          transform: rotateX(270deg) rotateY(270deg) rotateZ(270deg) scale(1.1); 
          filter: brightness(1.3) saturate(1.5); 
        }
        100% { 
          transform: rotateX(360deg) rotateY(360deg) rotateZ(360deg) scale(1); 
          filter: brightness(1) saturate(1.2); 
        }
      }
      
      @keyframes diamondLightning {
        0%, 90%, 100% { opacity: 0; transform: scaleX(0); }
        5%, 15% { opacity: 1; transform: scaleX(1); }
        10% { opacity: 0.8; transform: scaleX(1.2); }
      }
      
      @keyframes diamondWave {
        0% { 
          transform: translateX(-100%) scaleY(1); 
          opacity: 0; 
        }
        50% { 
          transform: translateX(0%) scaleY(1.5); 
          opacity: 1; 
        }
        100% { 
          transform: translateX(100%) scaleY(1); 
          opacity: 0; 
        }
      }
      
      @keyframes diamondParticle1 {
        0% { 
          transform: translateY(0px) translateX(0px) scale(0); 
          opacity: 0; 
        }
        25% { 
          transform: translateY(-10px) translateX(5px) scale(1.2); 
          opacity: 1; 
        }
        50% { 
          transform: translateY(-20px) translateX(0px) scale(1); 
          opacity: 0.8; 
        }
        75% { 
          transform: translateY(-10px) translateX(-5px) scale(1.1); 
          opacity: 0.6; 
        }
        100% { 
          transform: translateY(0px) translateX(0px) scale(0); 
          opacity: 0; 
        }
      }
      
      @keyframes diamondParticle2 {
        0% { 
          transform: translateY(0px) translateX(0px) rotate(0deg) scale(0); 
          opacity: 0; 
        }
        30% { 
          transform: translateY(-15px) translateX(-8px) rotate(120deg) scale(1.3); 
          opacity: 1; 
        }
        60% { 
          transform: translateY(-25px) translateX(3px) rotate(240deg) scale(0.9); 
          opacity: 0.7; 
        }
        100% { 
          transform: translateY(-5px) translateX(8px) rotate(360deg) scale(0); 
          opacity: 0; 
        }
      }
      
      @keyframes diamondParticle3 {
        0% { 
          transform: translateY(0px) translateX(0px) rotate(0deg) scale(0); 
          opacity: 0; 
        }
        20% { 
          transform: translateY(-8px) translateX(12px) rotate(90deg) scale(1.4); 
          opacity: 1; 
        }
        40% { 
          transform: translateY(-18px) translateX(-5px) rotate(180deg) scale(1.1); 
          opacity: 0.9; 
        }
        70% { 
          transform: translateY(-12px) translateX(8px) rotate(270deg) scale(0.8); 
          opacity: 0.5; 
        }
        100% { 
          transform: translateY(2px) translateX(-3px) rotate(360deg) scale(0); 
          opacity: 0; 
        }
      }
      
      @keyframes diamondFire {
        0% { 
          transform: scaleY(1) scaleX(1); 
          opacity: 0.3; 
        }
        25% { 
          transform: scaleY(1.5) scaleX(0.8); 
          opacity: 0.7; 
        }
        50% { 
          transform: scaleY(2) scaleX(0.6); 
          opacity: 1; 
        }
        75% { 
          transform: scaleY(1.8) scaleX(0.7); 
          opacity: 0.8; 
        }
        100% { 
          transform: scaleY(1) scaleX(1); 
          opacity: 0.3; 
        }
      }
      
      @keyframes diamondSupernova {
        0% { 
          transform: scale(0) rotate(0deg); 
          opacity: 0; 
        }
        10% { 
          transform: scale(0.5) rotate(36deg); 
          opacity: 0.8; 
        }
        20% { 
          transform: scale(1.2) rotate(72deg); 
          opacity: 1; 
        }
        40% { 
          transform: scale(2) rotate(144deg); 
          opacity: 0.6; 
        }
        60% { 
          transform: scale(2.5) rotate(216deg); 
          opacity: 0.3; 
        }
        80% { 
          transform: scale(3) rotate(288deg); 
          opacity: 0.1; 
        }
        100% { 
          transform: scale(3.5) rotate(360deg); 
          opacity: 0; 
        }
      }
      
      @keyframes disappearingPulse {
        0% { 
          opacity: 0; 
          transform: scale(0.8); 
        }
        25% { 
          opacity: 0.6; 
          transform: scale(1.1); 
        }
        50% { 
          opacity: 1; 
          transform: scale(1); 
        }
        75% { 
          opacity: 0.8; 
          transform: scale(1.05); 
        }
        100% { 
          opacity: 0; 
          transform: scale(0.9); 
        }
      }
      
      .animate-flash-pulse { animation: flashPulse 2s ease-in-out infinite; }
      .animate-color-shift { animation: colorShift 4s ease-in-out infinite; }
      .animate-gentle-glow { animation: gentleGlow 3s ease-in-out infinite; }
      
      /* PREMIUM Diamond Classes */
      .animate-diamond-shimmer { animation: diamondShimmer 3s ease-in-out infinite; }
      .animate-diamond-float { animation: diamondFloat 4s ease-in-out infinite; }
      .animate-diamond-pulse { animation: diamondPulse 2.5s ease-in-out infinite; }
      .animate-diamond-sparkle { animation: diamondSparkle 2s ease-in-out infinite; }
      .animate-diamond-rainbow { animation: diamondRainbow 5s linear infinite; }
      
      /* 🚀 NEW ULTRA-PREMIUM Diamond Classes - NEXT LEVEL LUXURY */
      .animate-diamond-3d-rotate { animation: diamond3dRotate 6s ease-in-out infinite; }
      .animate-diamond-lightning { animation: diamondLightning 3s ease-in-out infinite; }
      .animate-diamond-wave { animation: diamondWave 4s ease-in-out infinite; }
      .animate-diamond-particle-1 { animation: diamondParticle1 3s ease-in-out infinite; }
      .animate-diamond-particle-2 { animation: diamondParticle2 3.5s ease-in-out infinite; }
      .animate-diamond-particle-3 { animation: diamondParticle3 4s ease-in-out infinite; }
      .animate-diamond-fire { animation: diamondFire 2s ease-in-out infinite; }
      .animate-diamond-supernova { animation: diamondSupernova 4s ease-in-out infinite; }
      
      .animation-delay-200 { animation-delay: 0.2s; }
      .animation-delay-400 { animation-delay: 0.4s; }
      .animation-delay-600 { animation-delay: 0.6s; }
      .animation-delay-800 { animation-delay: 0.8s; }
      .animation-delay-1000 { animation-delay: 1s; }
      .animation-delay-1200 { animation-delay: 1.2s; }
      .animation-delay-1400 { animation-delay: 1.4s; }
      .animation-delay-1600 { animation-delay: 1.6s; }
      .animation-delay-1800 { animation-delay: 1.8s; }
      .animation-delay-2000 { animation-delay: 2s; }
      .animation-delay-2200 { animation-delay: 2.2s; }
      .animation-delay-2400 { animation-delay: 2.4s; }
      .animation-delay-2600 { animation-delay: 2.6s; }
      .animation-delay-2800 { animation-delay: 2.8s; }
      .animation-delay-3000 { animation-delay: 3s; }
      
      /* Custom Small Scrollbar Styles */
      .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 2px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 2px;
        transition: background 0.2s ease;
      }
      
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
      
      .custom-scrollbar::-webkit-scrollbar-thumb:active {
        background: #64748b;
      }
      
      /* Firefox scrollbar styling */
      .custom-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: #cbd5e1 #f1f5f9;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (effectType === 'gold') {
    return (
      <>
        {/* Golden Flashing Balls in Static Positions */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Large Golden Orbs - Well distributed */}
          <div className="absolute top-2 left-8 w-4 h-4 bg-gradient-to-br from-yellow-300 to-orange-500 rounded-full animate-flash-pulse shadow-lg"></div>
          <div className="absolute top-1 right-12 w-5 h-5 bg-gradient-to-br from-amber-300 to-yellow-600 rounded-full animate-color-shift animation-delay-800 shadow-xl"></div>
          <div className="absolute bottom-2 left-32 w-3 h-3 bg-gradient-to-br from-orange-400 to-red-500 rounded-full animate-flash-pulse animation-delay-1600 shadow-lg"></div>
          <div className="absolute top-3 right-24 w-3.5 h-3.5 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full animate-gentle-glow animation-delay-600 shadow-md"></div>
          
          {/* Medium Golden Particles - Strategic placement */}
          <div className="absolute top-2 left-20 w-2.5 h-2.5 bg-yellow-400 rounded-full animate-flash-pulse animation-delay-400 shadow-md"></div>
          <div className="absolute bottom-3 right-8 w-2 h-2 bg-amber-500 rounded-full animate-color-shift animation-delay-1200 shadow-md"></div>
          <div className="absolute top-4 left-48 w-2.5 h-2.5 bg-orange-400 rounded-full animate-gentle-glow animation-delay-2000 shadow-sm"></div>
          <div className="absolute bottom-1 right-32 w-2 h-2 bg-yellow-500 rounded-full animate-flash-pulse animation-delay-2400 shadow-sm"></div>
          
          {/* Small Golden Sparkles - Fill gaps */}
          <div className="absolute top-1 left-64 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-flash-pulse animation-delay-1000 shadow-sm"></div>
          <div className="absolute bottom-2 right-48 w-1.5 h-1.5 bg-orange-300 rounded-full animate-gentle-glow animation-delay-2200 shadow-sm"></div>
          <div className="absolute top-3 left-96 w-1 h-1 bg-amber-400 rounded-full animate-flash-pulse animation-delay-1800 shadow-sm"></div>
          <div className="absolute bottom-4 right-64 w-1 h-1 bg-yellow-400 rounded-full animate-color-shift animation-delay-2800 shadow-sm"></div>
          
          {/* Corner accents */}
          <div className="absolute top-1 left-2 w-2 h-2 bg-gradient-to-br from-yellow-400 via-amber-400 to-orange-500 rounded-full animate-gentle-glow animation-delay-200 shadow-md"></div>
          <div className="absolute bottom-1 right-2 w-2 h-2 bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-400 rounded-full animate-flash-pulse animation-delay-3000 shadow-md"></div>
        </div>
        
        {/* Subtle Golden Atmosphere */}
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-100/15 via-amber-100/25 to-orange-100/15 animate-gentle-glow animation-delay-800 opacity-60"></div>
      </>
    );
  }

  if (effectType === 'silver') {
    return (
      <>
        {/* Silver Flashing Balls in Static Positions */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Large Silver Orbs - Balanced placement */}
          <div className="absolute top-2 left-10 w-4 h-4 bg-gradient-to-br from-slate-200 to-gray-500 rounded-full animate-flash-pulse shadow-lg"></div>
          <div className="absolute bottom-2 right-10 w-3.5 h-3.5 bg-gradient-to-br from-gray-300 to-slate-600 rounded-full animate-color-shift animation-delay-1000 shadow-lg"></div>
          <div className="absolute top-3 left-40 w-3 h-3 bg-gradient-to-br from-white to-gray-400 rounded-full animate-gentle-glow animation-delay-1400 shadow-md"></div>
          <div className="absolute bottom-1 right-28 w-3.5 h-3.5 bg-gradient-to-br from-slate-300 to-gray-400 rounded-full animate-flash-pulse animation-delay-800 shadow-md"></div>
          
          {/* Medium Silver Particles */}
          <div className="absolute top-1 right-16 w-2.5 h-2.5 bg-slate-300 rounded-full animate-flash-pulse animation-delay-600 shadow-md"></div>
          <div className="absolute bottom-3 left-24 w-2 h-2 bg-gray-400 rounded-full animate-color-shift animation-delay-1800 shadow-sm"></div>
          <div className="absolute top-4 right-40 w-2.5 h-2.5 bg-slate-400 rounded-full animate-gentle-glow animation-delay-1200 shadow-sm"></div>
          <div className="absolute bottom-2 left-56 w-2 h-2 bg-gray-300 rounded-full animate-flash-pulse animation-delay-2000 shadow-sm"></div>
          
          {/* Small Silver Sparkles */}
          <div className="absolute top-2 left-72 w-1.5 h-1.5 bg-slate-300 rounded-full animate-gentle-glow animation-delay-400 shadow-sm"></div>
          <div className="absolute bottom-4 right-56 w-1.5 h-1.5 bg-gray-400 rounded-full animate-flash-pulse animation-delay-2400 shadow-sm"></div>
          <div className="absolute top-1 left-88 w-1 h-1 bg-slate-400 rounded-full animate-color-shift animation-delay-1600 shadow-sm"></div>
          
          {/* Corner metallic accents */}
          <div className="absolute top-1 left-4 w-2 h-2 bg-gradient-to-br from-slate-300 via-gray-200 to-slate-500 rounded-full animate-flash-pulse animation-delay-200 shadow-md"></div>
          <div className="absolute bottom-1 right-4 w-2 h-2 bg-gradient-to-br from-gray-200 via-slate-300 to-gray-500 rounded-full animate-gentle-glow animation-delay-2600 shadow-md"></div>
        </div>
        
        {/* Silver Atmosphere */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-100/15 via-gray-100/25 to-slate-100/15 animate-gentle-glow animation-delay-1200 opacity-50"></div>
      </>
    );
  }

  if (effectType === 'bronze') {
    return (
      <>
        {/* Bronze Flashing Balls in Static Positions */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Large Brown Orbs - Cozy placement */}
          <div className="absolute top-2 left-12 w-3.5 h-3.5 bg-gradient-to-br from-amber-800 to-orange-900 rounded-full animate-flash-pulse shadow-lg"></div>
          <div className="absolute bottom-2 right-14 w-4 h-4 bg-gradient-to-br from-orange-800 to-amber-900 rounded-full animate-color-shift animation-delay-1200 shadow-lg"></div>
          <div className="absolute top-3 left-36 w-3 h-3 bg-gradient-to-br from-amber-900 to-orange-800 rounded-full animate-gentle-glow animation-delay-2000 shadow-md"></div>
          <div className="absolute bottom-1 right-36 w-3.5 h-3.5 bg-gradient-to-br from-orange-900 to-amber-800 rounded-full animate-flash-pulse animation-delay-600 shadow-md"></div>
          
          {/* Medium Brown Particles */}
          <div className="absolute top-1 right-20 w-2.5 h-2.5 bg-amber-800 rounded-full animate-gentle-glow animation-delay-800 shadow-md"></div>
          <div className="absolute bottom-3 left-28 w-2 h-2 bg-orange-800 rounded-full animate-color-shift animation-delay-1600 shadow-sm"></div>
          <div className="absolute top-4 right-44 w-2.5 h-2.5 bg-amber-900 rounded-full animate-flash-pulse animation-delay-1000 shadow-sm"></div>
          <div className="absolute bottom-2 left-52 w-2 h-2 bg-orange-900 rounded-full animate-gentle-glow animation-delay-2400 shadow-sm"></div>
          
          {/* Small Brown Sparkles */}
          <div className="absolute top-2 left-68 w-1.5 h-1.5 bg-amber-800 rounded-full animate-flash-pulse animation-delay-400 shadow-sm"></div>
          <div className="absolute bottom-4 right-52 w-1.5 h-1.5 bg-orange-800 rounded-full animate-gentle-glow animation-delay-1800 shadow-sm"></div>
          <div className="absolute top-1 left-84 w-1 h-1 bg-amber-900 rounded-full animate-color-shift animation-delay-1400 shadow-sm"></div>
          
          {/* Brown corner accents */}
          <div className="absolute top-1 left-6 w-2 h-2 bg-gradient-to-br from-amber-800 via-orange-800 to-amber-900 rounded-full animate-gentle-glow animation-delay-200 shadow-md"></div>
          <div className="absolute bottom-1 right-6 w-2 h-2 bg-gradient-to-br from-orange-800 via-amber-900 to-orange-900 rounded-full animate-flash-pulse animation-delay-2800 shadow-md"></div>
        </div>
        
        {/* Brown Atmosphere */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-900/15 via-orange-900/25 to-amber-900/15 animate-gentle-glow animation-delay-1400 opacity-70"></div>
      </>
    );
  }

  if (effectType === 'diamond') {
    return (
      <>
        {/* 💎 SPECTACULAR SVG GEM ICONS - SAME SIZE + RANDOM LOCATIONS + DISAPPEARING PULSE! 💎 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          
          {/* 💎 CREATIVE STRATEGIC STAR PLACEMENT - MAXIMUM VISUAL IMPACT! 💎 */}
          
          {/* ⭐ CORNER STARS - FRAME THE HEADER */}
          <svg className="absolute opacity-0 blur-sm" style={{top: '5%', left: '3%', animation: 'disappearingPulse 3s ease-in-out infinite', animationDelay: '0s', filter: 'blur(1px)'}} width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path fill="url(#grad1)" d="M12 .5L16 8l7.5 4l-7.5 4l-4 7.5L8 16L.5 12L8 8l4-7.5Z" className="text-cyan-400"/>
            <defs><linearGradient id="grad1"><stop offset="0%" stopColor="#67e8f9" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient></defs>
          </svg>
          
          <svg className="absolute opacity-0 blur-sm" style={{top: '5%', right: '3%', animation: 'disappearingPulse 3.2s ease-in-out infinite', animationDelay: '0.5s', filter: 'blur(1px)'}} width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path fill="url(#grad2)" d="M12 .5L16 8l7.5 4l-7.5 4l-4 7.5L8 16L.5 12L8 8l4-7.5Z" className="text-purple-400"/>
            <defs><linearGradient id="grad2"><stop offset="0%" stopColor="#a855f7" /><stop offset="100%" stopColor="#67e8f9" /></linearGradient></defs>
          </svg>
          
  
          
          <svg className="absolute opacity-0 blur-sm" style={{bottom: '5%', right: '3%', animation: 'disappearingPulse 3.5s ease-in-out infinite', animationDelay: '1.5s', filter: 'blur(1px)'}} width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path fill="url(#grad4)" d="M12 .5L16 8l7.5 4l-7.5 4l-4 7.5L8 16L.5 12L8 8l4-7.5Z" className="text-cyan-400"/>
            <defs><linearGradient id="grad4"><stop offset="0%" stopColor="#67e8f9" /><stop offset="100%" stopColor="#a855f7" /></linearGradient></defs>
          </svg>
          

          
          {/* ⭐ SUBTLE DIAMOND CONSTELLATION - MINIMAL & ELEGANT */}
          
          {/* 💎 PRIMARY DIAMOND STARS - DESKTOP & MOBILE RESPONSIVE */}
          <svg className="absolute opacity-0 blur-sm hidden md:block" style={{top: '35%', left: '25%', animation: 'disappearingPulse 8s ease-in-out infinite', animationDelay: '2s', filter: 'blur(1px)'}} width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path fill="url(#grad15)" d="M12 .5L16 8l7.5 4l-7.5 4l-4 7.5L8 16L.5 12L8 8l4-7.5Z" className="text-cyan-400/60"/>
            <defs><linearGradient id="grad15"><stop offset="0%" stopColor="#67e8f9" /><stop offset="100%" stopColor="#c084fc" /></linearGradient></defs>
          </svg>
          

          
          <svg className="absolute opacity-0 blur-sm hidden md:block" style={{top: '65%', left: '75%', animation: 'disappearingPulse 9s ease-in-out infinite', animationDelay: '6s', filter: 'blur(1.2px)'}} width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path fill="url(#grad17)" d="M12 .5L16 8l7.5 4l-7.5 4l-4 7.5L8 16L.5 12L8 8l4-7.5Z" className="text-purple-400/60"/>
            <defs><linearGradient id="grad17"><stop offset="0%" stopColor="#a855f7" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient></defs>
          </svg>
          
          {/* 🌟 MOBILE-ONLY MINIMAL STARS */}
          <svg className="absolute opacity-0 blur-sm md:hidden" style={{top: '40%', left: '30%', animation: 'disappearingPulse 6s ease-in-out infinite', animationDelay: '1s', filter: 'blur(0.9px)'}} width="14" height="14" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path fill="url(#grad18)" d="M12 .5L16 8l7.5 4l-7.5 4l-4 7.5L8 16L.5 12L8 8l4-7.5Z" className="text-cyan-400/50"/>
            <defs><linearGradient id="grad18"><stop offset="0%" stopColor="#67e8f9" /><stop offset="100%" stopColor="#a855f7" /></linearGradient></defs>
          </svg>
          
          <svg className="absolute opacity-0 blur-sm md:hidden" style={{top: '60%', left: '70%', animation: 'disappearingPulse 7s ease-in-out infinite', animationDelay: '3s', filter: 'blur(1px)'}} width="12" height="12" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path fill="url(#grad19)" d="M12 .5L16 8l7.5 4l-7.5 4l-4 7.5L8 16L.5 12L8 8l4-7.5Z" className="text-blue-400/50"/>
            <defs><linearGradient id="grad19"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#c084fc" /></linearGradient></defs>
          </svg>
          
          {/* ✨ FLOWING EDGE STARS - CREATE MOVEMENT */}
          <svg className="absolute opacity-0 blur-sm" style={{top: '20%', left: '8%', animation: 'disappearingPulse 2.9s ease-in-out infinite', animationDelay: '2.5s', filter: 'blur(1.2px)'}} width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path fill="url(#grad6)" d="M12 .5L16 8l7.5 4l-7.5 4l-4 7.5L8 16L.5 12L8 8l4-7.5Z" className="text-blue-400"/>
            <defs><linearGradient id="grad6"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#67e8f9" /></linearGradient></defs>
          </svg>
          
          <svg className="absolute opacity-0 blur-sm" style={{top: '35%', left: '15%', animation: 'disappearingPulse 3.3s ease-in-out infinite', animationDelay: '3s', filter: 'blur(1.1px)'}} width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path fill="url(#grad7)" d="M12 .5L16 8l7.5 4l-7.5 4l-4 7.5L8 16L.5 12L8 8l4-7.5Z" className="text-cyan-400"/>
            <defs><linearGradient id="grad7"><stop offset="0%" stopColor="#67e8f9" /><stop offset="100%" stopColor="#c084fc" /></linearGradient></defs>
          </svg>
          
          <svg className="absolute opacity-0 blur-sm" style={{top: '65%', left: '12%', animation: 'disappearingPulse 3.4s ease-in-out infinite', animationDelay: '3.5s', filter: 'blur(1px)'}} width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path fill="url(#grad8)" d="M12 .5L16 8l7.5 4l-7.5 4l-4 7.5L8 16L.5 12L8 8l4-7.5Z" className="text-purple-400"/>
            <defs><linearGradient id="grad8"><stop offset="0%" stopColor="#a855f7" /><stop offset="100%" stopColor="#67e8f9" /></linearGradient></defs>
          </svg>
          
          <svg className="absolute opacity-0 blur-sm" style={{top: '80%', left: '20%', animation: 'disappearingPulse 2.7s ease-in-out infinite', animationDelay: '4s', filter: 'blur(1.3px)'}} width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path fill="url(#grad9)" d="M12 .5L16 8l7.5 4l-7.5 4l-4 7.5L8 16L.5 12L8 8l4-7.5Z" className="text-blue-400"/>
            <defs><linearGradient id="grad9"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#a855f7" /></linearGradient></defs>
          </svg>
          
          {/* 💫 RIGHT SIDE FLOWING PATTERN */}
          <svg className="absolute opacity-0 blur-sm" style={{top: '15%', right: '12%', animation: 'disappearingPulse 3.6s ease-in-out infinite', animationDelay: '4.5s', filter: 'blur(1.1px)'}} width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path fill="url(#grad10)" d="M12 .5L16 8l7.5 4l-7.5 4l-4 7.5L8 16L.5 12L8 8l4-7.5Z" className="text-cyan-400"/>
            <defs><linearGradient id="grad10"><stop offset="0%" stopColor="#67e8f9" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient></defs>
          </svg>
          
          <svg className="absolute opacity-0 blur-sm" style={{top: '40%', right: '8%', animation: 'disappearingPulse 3.2s ease-in-out infinite', animationDelay: '5s', filter: 'blur(1.2px)'}} width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path fill="url(#grad11)" d="M12 .5L16 8l7.5 4l-7.5 4l-4 7.5L8 16L.5 12L8 8l4-7.5Z" className="text-purple-400"/>
            <defs><linearGradient id="grad11"><stop offset="0%" stopColor="#c084fc" /><stop offset="100%" stopColor="#67e8f9" /></linearGradient></defs>
          </svg>
          
          <svg className="absolute opacity-0 blur-sm" style={{top: '70%', right: '15%', animation: 'disappearingPulse 2.8s ease-in-out infinite', animationDelay: '5.5s', filter: 'blur(1px)'}} width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path fill="url(#grad12)" d="M12 .5L16 8l7.5 4l-7.5 4l-4 7.5L8 16L.5 12L8 8l4-7.5Z" className="text-blue-400"/>
            <defs><linearGradient id="grad12"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#c084fc" /></linearGradient></defs>
          </svg>
          
          {/* 🌟 TOP & BOTTO`M CENTER ACCENTS */}

          

          
        </div>
        
        {/* 🌟 DIAMOND ATMOSPHERE - SUBTLE BACKGROUND */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-50/20 via-blue-50/30 via-purple-50/25 to-cyan-50/15 animate-pulse opacity-60"></div>
        
      </>
    );
  }

  return null;
};

// Header component that uses sidebar context
const HeaderContent = ({ children, themeColors, language }: { 
  children: React.ReactNode; 
  themeColors: any; 
  language: string; 
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { isMobile, state } = useSidebar();
  const { userRanking } = useUserRanking();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <header
        className={`fixed top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6 ${themeColors.header}`}
        style={
          // Full width on mobile or when sidebar is collapsed
          isMobile || state === 'collapsed'
            ? { left: 0, right: 0 }
            : language === 'ar'
            ? { right: 'var(--sidebar-width)', left: 0 }
            : { left: 'var(--sidebar-width)', right: 0 }
        }
      >
        {/* Special effects for top 3 performers */}
        <HeaderEffects effectType={themeColors.effects} />
        
        <div className={`flex items-center gap-2 md:gap-4 ${language === 'ar' ? 'order-2' : 'order-1'} relative z-10`}>
          <SidebarTrigger />
          <WorkShiftTimer />
        </div>
        <div className={`flex items-center gap-2 md:gap-4 ${language === 'ar' ? 'order-1' : 'order-2'} relative z-10`}>
          <NotificationsMenu />
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 md:h-9 w-auto flex items-center gap-2 rounded-full p-0">
                <div className="hidden md:flex items-center gap-2">
                  <span className="text-sm">{user?.name}</span>
                  <UserRankingProfile />
                </div>
                <div className="relative">
                  <Avatar className="h-7 w-7 md:h-8 md:w-8">
                    <AvatarImage src="" alt={user?.name} />
                    <AvatarFallback userRank={userRanking?.position}>{user?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  
                  {/* Enhanced ranking icons with performance dashboard styling */}
                  {userRanking?.isDiamond && (
                    <div className="absolute -top-1 -right-2 z-20 p-1 rounded-full bg-gradient-to-br from-cyan-300 via-blue-400 to-purple-500 shadow-xl border border-cyan-200/50">
                      <Gem className="h-3 w-3 text-white" />
                    </div>
                  )}
                  {userRanking?.position === 1 && !userRanking?.isDiamond && (
                    <div className="absolute -top-1 -right-2 z-20 p-1 rounded-full bg-white shadow-lg">
                      <Crown className="h-3 w-3 text-yellow-600" />
                    </div>
                  )}
                  {userRanking?.position === 2 && !userRanking?.isDiamond && (
                    <div className="absolute -top-1 -right-2 z-20 p-1 rounded-full bg-white shadow-lg">
                      <Medal className="h-3 w-3 text-slate-600" />
                    </div>
                  )}
                  {userRanking?.position === 3 && !userRanking?.isDiamond && (
                    <div className="absolute -top-1 -right-2 z-20 p-1 rounded-full bg-white shadow-lg">
                      <Award className="h-3 w-3 text-amber-800" />
                    </div>
                  )}
                  
                  {/* Special effects for ranking */}
                  {userRanking?.isDiamond && (
                    <>
                      {/* ENHANCED Premium Diamond glow effect - Multi-layered shining */}
                      <div className="absolute -inset-2 bg-gradient-to-r from-cyan-300 via-blue-400 via-purple-500 to-cyan-400 rounded-full opacity-25 animate-pulse -z-10 blur-sm"></div>
                      <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 rounded-full opacity-20 animate-pulse -z-10"></div>
                      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-200 via-blue-300 to-purple-400 rounded-full opacity-15 -z-10"></div>
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-100 to-purple-300 rounded-full opacity-10 -z-10"></div>
                    </>
                  )}
                  {userRanking?.position === 1 && !userRanking?.isDiamond && (
                    <>
                      {/* Subtle pulsing golden background */}
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full opacity-10 -z-10"></div>
                    </>
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={language === 'ar' ? 'start' : 'end'} className={`w-56 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{user?.name}</p>
                    <UserRankingProfile />
                  </div>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')} className={language === 'ar' ? 'flex-row-reverse text-right' : 'flex-row text-left'}>
                <Settings className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                {t('settings')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className={`text-red-500 ${language === 'ar' ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}>
                <LogOut className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                {t('signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="flex-1 pt-14 md:pt-14 overflow-auto">{children}</main>
    </div>
  );
};

const SidebarNavigation = ({ children }: SidebarNavigationProps) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useWorkspaceMessages();
  const [notifications, setNotifications] = useState<any[]>([]);
  const userRankingTheme = useUserRankingTheme();
  const { userRanking } = useUserRanking();
  
  // Ref to track sidebar scroll position
  const sidebarContentRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Navigation without scroll jumping
  const handleNavigation = (path: string) => {
    // Save current scroll position
    if (sidebarContentRef.current) {
      const scrollTop = sidebarContentRef.current.scrollTop;
      scrollPositionRef.current = scrollTop;
      sessionStorage.setItem('sidebar-scroll-position', scrollTop.toString());
    }

    // Navigate to the selected path
    navigate(path);
  };

  // Restore scroll position immediately to prevent jump flicker
  useLayoutEffect(() => {
    const savedPosition = sessionStorage.getItem('sidebar-scroll-position');
    if (savedPosition && sidebarContentRef.current) {
      const scrollPosition = parseInt(savedPosition, 10);
      sidebarContentRef.current.scrollTop = scrollPosition;
      scrollPositionRef.current = scrollPosition;
    }
  }, []);

  // Ensure no forced smooth scroll that causes jumps
  useEffect(() => {
    if (sidebarContentRef.current) {
      sidebarContentRef.current.style.scrollBehavior = 'auto';
    }
  }, []);

  // Track scroll position continuously
  const handleScroll = () => {
    if (sidebarContentRef.current) {
      const scrollTop = sidebarContentRef.current.scrollTop;
      scrollPositionRef.current = scrollTop;
      
      // Throttle sessionStorage updates
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        sessionStorage.setItem('sidebar-scroll-position', scrollTop.toString());
      }, 100);
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    // Create unique channel name per user to avoid conflicts
    const channelName = `sidebar-notifications-${user.id}`;

    // Subscribe to notifications changes
    const notificationsSubscription = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, 
        (payload) => {
          console.log('Realtime notification (sidebar):', payload);
          // Handle the notification change
          if (payload.eventType === 'INSERT') {
            setNotifications(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
          }
        }
      )
      .subscribe();

    // Load initial notifications
    const loadNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          console.error('Error loading notifications:', error);
          return;
        }

        setNotifications(data || []);
      } catch (error) {
        console.error('Error in loadNotifications:', error);
      }
    };

    loadNotifications();

    return () => {
      if (notificationsSubscription) {
        notificationsSubscription.unsubscribe();
      }
    };
  }, [user?.id]); // Only depend on user.id to avoid unnecessary re-subscriptions

  // Define interface for nav items
  interface NavItem {
    name: string;
    path: string;
    icon: any;
    color?: string;
    adminOnly?: boolean;
    employeeOnly?: boolean;
    customerServiceAndDesignerOnly?: boolean;
    customerServiceOnly?: boolean;
    shiftsAccess?: boolean;
    mediaBuyerOnly?: boolean;
    designerOnly?: boolean;
    excludeMediaBuyer?: boolean;
    excludeDesigner?: boolean;
    excludeCopyWriting?: boolean;
    copyWritingOnly?: boolean;
    hasCounter?: boolean;
    adminAndMediaBuyerOnly?: boolean;
  }

  // Organize navigation items into groups with colors
  const navGroups = [
    {
      label: 'Overview',
      color: 'blue',
      items: [
        { name: t('dashboard') as string, path: user?.role === 'admin' ? '/dashboard' : '/employee-dashboard', icon: Home, color: 'blue', excludeCopyWriting: true },
        { name: 'Dashboard', path: '/copy-writing-dashboard', icon: Edit3, copyWritingOnly: true, color: 'blue' },
        { name: 'Analytics', path: '/analytics', icon: BarChart3, adminOnly: true, color: 'purple' },
      ] as NavItem[]
    },
    {
      label: 'Employee Management',
      color: 'green',
      items: [
        { name: t('employees') as string, path: '/employees', icon: Users, adminOnly: true, color: 'green' },
        { name: 'Employee Ratings', path: '/admin-ratings', icon: Star, adminOnly: true, color: 'yellow' },
        { name: 'Shift Management', path: '/admin-shift-management', icon: Calendar, adminOnly: true, color: 'teal' },
        { name: 'Performance', path: '/performance-dashboard', icon: TrendingUp, adminOnly: true, color: 'purple' },
      ] as NavItem[]
    },
    {
      label: 'Task Management',
      color: 'orange',
      items: [
        { name: t('tasks') as string, path: user?.role === 'admin' ? '/tasks' : '/employee-tasks', icon: CheckSquare, color: 'orange', excludeDesigner: true },
        { name: 'Media Buyer Dashboard', path: '/media-buyer-tasks', icon: TrendingUp, mediaBuyerOnly: true, color: 'amber' },
        { name: 'Design Studio', path: '/designer-dashboard', icon:  Brush, designerOnly: true, color: 'purple' },
        { name: 'My Ratings', path: '/my-ratings', icon: Star, employeeOnly: true, color: 'yellow' },
      ] as NavItem[]
    },
    {
      label: 'Reports & Data',
      color: 'indigo',
      items: [
        { name: t('reports') as string, path: '/reports', icon: ClipboardList, adminOnly: true, color: 'indigo' },
        { name: 'Bug Reports', path: '/admin-bug-reports', icon: Bug, adminOnly: true, color: 'red' },
        { name: 'Total Orders', path: '/admin-total-orders', icon: SARIcon, adminOnly: true, color: 'purple' },
        { name: 'Campaign Strategy', path: '/strategy', icon: GrowthStrategyIcon, adminOnly: true, color: 'purple' },
        { name: t('dailyReport') as string, path: '/report', icon: ClipboardList, employeeOnly: true, color: 'blue' },
      ] as NavItem[]
    },
    {
      label: 'Media Buyer Tools',
      color: 'purple',
      items: [
        { name: 'Campaign Strategy', path: '/strategy', icon: GrowthStrategyIcon, mediaBuyerOnly: true, color: 'purple' },
        { name: 'Total Orders', path: '/admin-total-orders', icon: SARIcon, mediaBuyerOnly: true, color: 'purple' },
      ] as NavItem[]
    },
    {
      label: 'Time & Attendance',
      color: 'cyan',
      items: [
        { name: t('checkIn') as string, path: '/check-in', icon: User, employeeOnly: true, color: 'cyan' },
        { name: 'Shifts', path: '/shifts', icon: Clock, shiftsAccess: true, color: 'slate' },
      ] as NavItem[]
    },
    {
      label: 'Communication',
      color: 'pink',
      items: [
        { name: t('events') as string, path: '/events', icon: Calendar, color: 'pink' },
        { name: 'Workspace', path: '/workspace', icon: MessageSquare, hasCounter: true, color: 'violet' },
      ] as NavItem[]
    },
    {
      label: 'Customer Service Tools',
      color: 'emerald',
      items: [
        { name: 'Social Media CRM', path: '/customer-service-crm', icon: Globe, customerServiceOnly: true, color: 'emerald' },
        { name: 'Create Order', path: '/create-order', icon: ShoppingCart, customerServiceOnly: true, color: 'emerald' },
        { name: 'My Orders', path: '/my-orders', icon: SARIcon, customerServiceOnly: true, color: 'blue' },
        { name: 'Loyal Customers', path: '/loyal-customers', icon: Crown, customerServiceOnly: true, color: 'amber' },
      ] as NavItem[]
    },
    {
      label: 'Copy Writing Tools',
      color: 'blue',
      items: [
        { name: 'Products', path: '/copy-writing-products', icon: Package, copyWritingOnly: true, color: 'indigo' },
      ] as NavItem[]
    }
  ];

  // Get theme colors based on user ranking
  const getThemeColors = (theme: 'diamond' | 'gold' | 'silver' | 'bronze' | 'default') => {
    switch (theme) {
      case 'diamond':
        return {
          header: 'bg-gradient-to-r from-cyan-50/90 via-blue-50/90 to-purple-50/90 dark:from-cyan-900/90 dark:via-blue-900/90 dark:to-purple-900/90 backdrop-blur-md supports-[backdrop-filter]:bg-cyan-50/60 dark:supports-[backdrop-filter]:bg-cyan-900/70 border-cyan-200 dark:border-cyan-700 transition-all duration-300 ease-in-out',
          sidebar: 'bg-background',
          text: 'text-foreground',
          accent: 'text-muted-foreground',
          effects: 'diamond'
        };
      case 'gold':
        return {
          header: 'bg-gradient-to-r from-yellow-50/90 via-amber-50/90 to-orange-50/90 dark:from-yellow-950/80 dark:via-amber-950/80 dark:to-orange-950/80 backdrop-blur-md supports-[backdrop-filter]:bg-yellow-50/60 dark:supports-[backdrop-filter]:bg-yellow-950/60 border-yellow-200 dark:border-yellow-800',
          sidebar: 'bg-background',
          text: 'text-foreground',
          accent: 'text-muted-foreground',
          effects: 'gold'
        };
      case 'silver':
        return {
          header: 'bg-gradient-to-r from-slate-50/90 via-gray-50/90 to-slate-50/90 dark:from-slate-900/90 dark:via-gray-800/90 dark:to-slate-900/90 backdrop-blur-md supports-[backdrop-filter]:bg-slate-50/60 dark:supports-[backdrop-filter]:bg-slate-900/70 border-slate-200 dark:border-slate-600',
          sidebar: 'bg-background',
          text: 'text-foreground',
          accent: 'text-muted-foreground',
          effects: 'silver'
        };
      case 'bronze':
        return {
          header: 'bg-gradient-to-r from-amber-50/90 via-orange-50/90 to-amber-50/90 dark:from-amber-950/80 dark:via-orange-950/80 dark:to-amber-950/80 backdrop-blur-md supports-[backdrop-filter]:bg-amber-50/60 dark:supports-[backdrop-filter]:bg-amber-950/60 border-amber-200 dark:border-amber-800',
          sidebar: 'bg-background',
          text: 'text-foreground',
          accent: 'text-muted-foreground',
          effects: 'bronze'
        };
      default:
        return {
          header: 'bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-border',
          sidebar: 'bg-background',
          text: 'text-foreground',
          accent: 'text-muted-foreground',
          effects: 'none'
        };
    }
  };

  const getColorClasses = (color: string = 'gray', isActive: boolean = false) => {
    const colorMap: Record<string, { icon: string; text: string; activeIcon: string; activeText: string; activeBg: string }> = {
      blue: { 
        icon: 'text-blue-500', 
        text: 'text-blue-700', 
        activeIcon: 'text-blue-600', 
        activeText: 'text-blue-800', 
        activeBg: 'bg-blue-50 border-blue-200' 
      },
      purple: { 
        icon: 'text-purple-500', 
        text: 'text-purple-700', 
        activeIcon: 'text-purple-600', 
        activeText: 'text-purple-800', 
        activeBg: 'bg-purple-50 border-purple-200' 
      },
      green: { 
        icon: 'text-green-500', 
        text: 'text-green-700', 
        activeIcon: 'text-green-600', 
        activeText: 'text-green-800', 
        activeBg: 'bg-green-50 border-green-200' 
      },
      yellow: { 
        icon: 'text-yellow-500', 
        text: 'text-yellow-700', 
        activeIcon: 'text-yellow-600', 
        activeText: 'text-yellow-800', 
        activeBg: 'bg-yellow-50 border-yellow-200' 
      },
      orange: { 
        icon: 'text-orange-500', 
        text: 'text-orange-700', 
        activeIcon: 'text-orange-600', 
        activeText: 'text-orange-800', 
        activeBg: 'bg-orange-50 border-orange-200' 
      },
      red: { 
        icon: 'text-red-500', 
        text: 'text-red-700', 
        activeIcon: 'text-red-600', 
        activeText: 'text-red-800', 
        activeBg: 'bg-red-50 border-red-200' 
      },
      indigo: { 
        icon: 'text-indigo-500', 
        text: 'text-indigo-700', 
        activeIcon: 'text-indigo-600', 
        activeText: 'text-indigo-800', 
        activeBg: 'bg-indigo-50 border-indigo-200' 
      },
      cyan: { 
        icon: 'text-cyan-500', 
        text: 'text-cyan-700', 
        activeIcon: 'text-cyan-600', 
        activeText: 'text-cyan-800', 
        activeBg: 'bg-cyan-50 border-cyan-200' 
      },
      pink: { 
        icon: 'text-pink-500', 
        text: 'text-pink-700', 
        activeIcon: 'text-pink-600', 
        activeText: 'text-pink-800', 
        activeBg: 'bg-pink-50 border-pink-200' 
      },
      violet: { 
        icon: 'text-violet-500', 
        text: 'text-violet-700', 
        activeIcon: 'text-violet-600', 
        activeText: 'text-violet-800', 
        activeBg: 'bg-violet-50 border-violet-200' 
      },
      teal: { 
        icon: 'text-teal-500', 
        text: 'text-teal-700', 
        activeIcon: 'text-teal-600', 
        activeText: 'text-teal-800', 
        activeBg: 'bg-teal-50 border-teal-200' 
      },
      amber: { 
        icon: 'text-amber-500', 
        text: 'text-amber-700', 
        activeIcon: 'text-amber-600', 
        activeText: 'text-amber-800', 
        activeBg: 'bg-amber-50 border-amber-200' 
      },
      slate: { 
        icon: 'text-slate-500', 
        text: 'text-slate-700', 
        activeIcon: 'text-slate-600', 
        activeText: 'text-slate-800', 
        activeBg: 'bg-slate-50 border-slate-200' 
      },
      emerald: { 
        icon: 'text-emerald-500', 
        text: 'text-emerald-700', 
        activeIcon: 'text-emerald-600', 
        activeText: 'text-emerald-800', 
        activeBg: 'bg-emerald-50 border-emerald-200' 
      },
    };
    
    return colorMap[color] || colorMap.blue;
  };

  // Filter items based on user role and permissions
  const filteredNavGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (item.adminOnly && user?.role !== 'admin') return false;
      if (item.employeeOnly && user?.role === 'admin') return false;
      if (item.customerServiceAndDesignerOnly && user?.position !== 'Customer Service' && user?.position !== 'Designer') return false;
      if (item.customerServiceOnly && user?.position !== 'Customer Service') return false;
      if (item.shiftsAccess && !(user?.role === 'admin' || user?.role === 'employee')) return false;
      if (item.mediaBuyerOnly && user?.position !== 'Media Buyer') return false;
      if (item.designerOnly && user?.position !== 'Designer') return false;
      if (item.copyWritingOnly && user?.position !== 'Copy Writing') return false;
      if (item.adminAndMediaBuyerOnly && !(user?.role === 'admin' || user?.position === 'Media Buyer')) return false;
      if (item.excludeMediaBuyer && user?.position === 'Media Buyer') return false;
      if (item.excludeDesigner && user?.position === 'Designer') return false;
      if (item.excludeCopyWriting && user?.position === 'Copy Writing') return false;
      return true;
    })
      })).filter(group => group.items.length > 0); // Only show groups that have items

  // Get theme colors with memoization to prevent unnecessary re-renders
  const themeColors = useMemo(() => getThemeColors(userRankingTheme), [userRankingTheme]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full no-overflow-fix" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <Sidebar
          className="bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 transition-all duration-500 ease-in-out"
          side={language === 'ar' ? 'right' : 'left'}
        >
          <SidebarHeader className="flex h-16 items-center border-b px-4 md:px-6">
            <div className="flex items-center gap-3">
              <img src="/NQ-ICON.png" alt="Logo" className="h-8 w-8 md:h-10 md:w-10 rounded-full shadow" />
              <VersionDisplay variant="sidebar" />
            </div>
          </SidebarHeader>
          <SidebarContent 
            ref={sidebarContentRef}
            className="flex-1 overflow-y-auto py-2 md:py-4 sidebar-content"
            onScroll={handleScroll}
          >
            {filteredNavGroups.map((group) => {
              const groupColorClasses = getColorClasses(group.color);
              
              return (
                <SidebarGroup key={group.label}>
                  <SidebarGroupLabel className={`text-xs font-semibold uppercase tracking-wider mb-2 px-2 ${groupColorClasses.text}`}>
                    {group.label}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => {
                        const isActive = window.location.pathname === item.path;
                        const colorClasses = getColorClasses(item.color, isActive);
                        
                        return (
                          <SidebarMenuItem key={item.name}>
                            <SidebarMenuButton
                              data-path={item.path}
                              onClick={() => handleNavigation(item.path)}
                              tooltip={item.name}
                              isActive={isActive}
                              onMouseDown={(e) => e.preventDefault()}
                              className={`w-full px-2 md:px-3 py-2 rounded-lg transition-all duration-300 ease-in-out border border-transparent ${
                                isActive 
                                  ? `${colorClasses.activeBg} ${colorClasses.activeText} font-semibold shadow-sm` 
                                  : `${colorClasses.text}`
                              } ${language === 'ar' ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}
                            >
                              <item.icon className={`h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3 ${
                                isActive ? colorClasses.activeIcon : colorClasses.icon
                              }`} />
                              <span className="w-full text-sm md:text-base">{item.name}</span>
                              {item.hasCounter && unreadCount > 0 && (
                                <Badge 
                                  variant="destructive" 
                                  className="text-xs animate-pulse ml-auto flex-shrink-0"
                                >
                                  {unreadCount}
                                </Badge>
                              )}
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              );
            })}
          </SidebarContent>
          
          <SidebarFooter>
            <div className="flex flex-col gap-2 p-2 md:p-3">
              <Button 
                variant="ghost" 
                size="sm"
                className={`justify-start w-full text-sm ${language === 'ar' ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}
                onClick={() => handleNavigation('/settings')}
              >
                <Settings className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                {t('settings')}
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className={`justify-start w-full text-red-500 hover:bg-red-50 hover:text-red-600 text-sm ${language === 'ar' ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}
                onClick={() => handleNavigation('/logout')}
              >
                <LogOut className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                {t('signOut')}
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        
        <HeaderContent themeColors={themeColors} language={language}>
          {children}
        </HeaderContent>
      </div>
    </SidebarProvider>
  );
};

export default SidebarNavigation;