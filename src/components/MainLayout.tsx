
import React from 'react';

interface MainLayoutProps {
  children: React.ReactNode;
}

// Since we're now using SidebarNavigation directly in App.tsx for all routes,
// this component is simplified to just pass through children
const MainLayout = ({ children }: MainLayoutProps) => {
  return <>{children}</>;
};

export default MainLayout;
