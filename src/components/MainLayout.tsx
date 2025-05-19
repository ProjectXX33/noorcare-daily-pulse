
import React from 'react';
import SidebarNavigation from './SidebarNavigation';

interface MainLayoutProps {
  children: React.ReactNode;
}

// This component is now just a wrapper for SidebarNavigation
const MainLayout = ({ children }: MainLayoutProps) => {
  return <SidebarNavigation>{children}</SidebarNavigation>;
};

export default MainLayout;
