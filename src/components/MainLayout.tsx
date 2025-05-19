
import React from 'react';

interface MainLayoutProps {
  children: React.ReactNode;
}

// This component is now updated to work better with the sidebar navigation
const MainLayout = ({ children }: MainLayoutProps) => {
  return <div className="flex flex-col w-full">{children}</div>;
};

export default MainLayout;
