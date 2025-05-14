
import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-white border-r">
        <div className="p-4 flex items-center gap-2">
          <img 
            src="/lovable-uploads/da15fff1-1f54-460e-ab4d-bec7311e7ed0.png" 
            alt="NoorCare Logo" 
            className="h-8 w-8"
          />
          <h1 className="font-bold text-primary text-xl">NoorCare</h1>
        </div>
        <Separator />
        <div className="flex-1 py-4 px-2 space-y-1">
          <Button
            variant={isActive('/dashboard') ? "default" : "ghost"}
            className={`w-full justify-start ${isActive('/dashboard') ? 'bg-primary' : ''}`}
            onClick={() => navigate('/dashboard')}
            type="button"
          >
            Dashboard
          </Button>
          <Button
            variant={isActive('/check-in') ? "default" : "ghost"}
            className={`w-full justify-start ${isActive('/check-in') ? 'bg-primary' : ''}`}
            onClick={() => navigate('/check-in')}
            type="button"
          >
            Check-In
          </Button>
          <Button
            variant={isActive('/report') ? "default" : "ghost"}
            className={`w-full justify-start ${isActive('/report') ? 'bg-primary' : ''}`}
            onClick={() => navigate('/report')}
            type="button"
          >
            Daily Report
          </Button>
          {user.role === 'admin' && (
            <>
              <Button
                variant={isActive('/employees') ? "default" : "ghost"}
                className={`w-full justify-start ${isActive('/employees') ? 'bg-primary' : ''}`}
                onClick={() => navigate('/employees')}
                type="button"
              >
                Employees
              </Button>
              <Button
                variant={isActive('/reports') ? "default" : "ghost"}
                className={`w-full justify-start ${isActive('/reports') ? 'bg-primary' : ''}`}
                onClick={() => navigate('/reports')}
                type="button"
              >
                All Reports
              </Button>
            </>
          )}
        </div>
        <div className="p-4 border-t">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <User size={16} className="text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">{user.name}</p>
              <p className="text-xs text-gray-500">{user.department} - {user.position}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full justify-start text-red-500" 
            onClick={logout}
            type="button"
          >
            <LogOut size={16} className="mr-2" /> Logout
          </Button>
        </div>
      </div>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b z-10">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="/lovable-uploads/da15fff1-1f54-460e-ab4d-bec7311e7ed0.png" 
              alt="NoorCare Logo" 
              className="h-8 w-8"
            />
            <h1 className="font-bold text-primary">NoorCare</h1>
          </div>
          <Button variant="outline" size="sm" onClick={logout} type="button">
            <LogOut size={16} />
          </Button>
        </div>
        <div className="flex border-t overflow-x-auto">
          <Button
            variant="ghost"
            className={`flex-1 rounded-none ${isActive('/dashboard') ? 'border-b-2 border-primary' : ''}`}
            onClick={() => navigate('/dashboard')}
            type="button"
          >
            Dashboard
          </Button>
          <Button
            variant="ghost"
            className={`flex-1 rounded-none ${isActive('/check-in') ? 'border-b-2 border-primary' : ''}`}
            onClick={() => navigate('/check-in')}
            type="button"
          >
            Check-In
          </Button>
          <Button
            variant="ghost"
            className={`flex-1 rounded-none ${isActive('/report') ? 'border-b-2 border-primary' : ''}`}
            onClick={() => navigate('/report')}
            type="button"
          >
            Report
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-4 md:p-8 md:pt-6 md:pb-8 md:mt-0 mt-24">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
