import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import OpeningAnimation from "./components/OpeningAnimation";
import PageTransition from "./components/PageTransition";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import CheckInPage from "./pages/CheckInPage";
import ReportPage from "./pages/ReportPage";
import AdminEmployeesPage from "./pages/AdminEmployeesPage";
import AdminReportsPage from "./pages/AdminReportsPage";
import AdminTasksPage from "./pages/AdminTasksPage";
import AdminRatingsPage from "./pages/AdminRatingsPage";
import EmployeeTasksPage from "./pages/EmployeeTasksPage";
import EmployeeRatingsPage from "./pages/EmployeeRatingsPage";
import SettingsPage from "./pages/SettingsPage";
import ShiftsPage from "./pages/ShiftsPage";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./contexts/AuthContext";
import { CheckInProvider } from "./contexts/CheckInContext";
import { useAuth } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { WorkspaceMessageProvider } from "./contexts/WorkspaceMessageContext";
import SidebarNavigation from "./components/SidebarNavigation";
import "./styles/rtl.css";
import EventsPage from '@/pages/EventsPage';
import MediaBuyerTasksPage from "./pages/MediaBuyerTasksPage";
import WorkspacePage from '@/pages/WorkspacePage';
import React, { useState, useEffect } from 'react';
import AdminShiftManagement from "./pages/AdminShiftManagement";
import AdminBugReportsPage from "./pages/AdminBugReportsPage";
import AdminAnalyticsPage from "./pages/AdminAnalyticsPage";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import NotificationHandler from "./components/NotificationHandler";
import NotificationBanner from "./components/NotificationBanner";
import { useLocation } from 'react-router-dom';



const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevents queries from refetching when the window regains focus
      staleTime: 5 * 60 * 1000, // Data is considered fresh for 5 minutes
    },
  },
});

// Private route component to protect routes that require authentication
const PrivateRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return user.role === 'admin' 
      ? <Navigate to="/dashboard" replace /> 
      : <Navigate to="/employee-dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Admin route component to protect routes that require admin role
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  return (
    <PrivateRoute allowedRoles={['admin']}>
      {children}
    </PrivateRoute>
  );
};

// Employee route component to protect routes that require employee role
const EmployeeRoute = ({ children }: { children: React.ReactNode }) => {
  return (
    <PrivateRoute allowedRoles={['employee']}>
      {children}
    </PrivateRoute>
  );
};

// Customer Service route component
const CustomerServiceRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  
  if (!user || user.position !== 'Customer Service') {
    return <Navigate to={user?.role === 'admin' ? '/dashboard' : '/employee-dashboard'} replace />;
  }
  
  return <>{children}</>;
};

// Media Buyer route component for calendar and task assignment access (Media Buyers only)
const MediaBuyerRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  
  if (!user || user.position !== 'Media Buyer') {
    return <Navigate to={user?.role === 'admin' ? '/dashboard' : '/employee-dashboard'} replace />;
  }
  
  return <>{children}</>;
};

// Route component that excludes Media Buyers (for Events page)
const NonMediaBuyerRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (user.position === 'Media Buyer') {
    return <Navigate to="/media-buyer-tasks" replace />;
  }
  
  return <>{children}</>;
};

// This component is outside the BrowserRouter but inside the other providers
const AppWithAuth = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showOpeningAnimation, setShowOpeningAnimation] = useState(true);

  useEffect(() => {
    // Hide opening animation after 2 seconds
    const timer = setTimeout(() => {
      setShowOpeningAnimation(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Disable browser scroll restoration to prevent jumping
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  return (
    <BrowserRouter>
        <AuthProvider>
          <WorkspaceMessageProvider>
            <CheckInProvider>
              <LanguageProvider>
                <AnimatePresence>
                  {showOpeningAnimation && <OpeningAnimation />}
                </AnimatePresence>
                <AuthenticatedNotificationBanner />
                <NotificationHandler />
                <Routes>
                  <Route path="/" element={<PageTransition><Index /></PageTransition>} />
                  <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
                  <Route 
                    path="/dashboard" 
                    element={
                      <AdminRoute>
                        <SidebarNavigation isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)}>
                          <Dashboard />
                        </SidebarNavigation>
                      </AdminRoute>
                    } 
                  />
                  <Route 
                    path="/employee-dashboard" 
                    element={
                      <EmployeeRoute>
                        <SidebarNavigation isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)}>
                          <EmployeeDashboard />
                        </SidebarNavigation>
                      </EmployeeRoute>
                    } 
                  />
                  <Route 
                    path="/check-in" 
                    element={
                      <PrivateRoute>
                        <SidebarNavigation isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)}>
                          <CheckInPage />
                        </SidebarNavigation>
                      </PrivateRoute>
                    } 
                  />
                  <Route 
                    path="/shifts" 
                    element={
                      <PrivateRoute>
                        <SidebarNavigation isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)}>
                          <ShiftsPage />
                        </SidebarNavigation>
                      </PrivateRoute>
                    } 
                  />
                  <Route 
                    path="/report" 
                    element={
                      <PrivateRoute>
                        <SidebarNavigation isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)}>
                          <ReportPage />
                        </SidebarNavigation>
                      </PrivateRoute>
                    } 
                  />
                  <Route 
                    path="/employees" 
                    element={
                      <AdminRoute>
                        <SidebarNavigation isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)}>
                          <AdminEmployeesPage />
                        </SidebarNavigation>
                      </AdminRoute>
                    } 
                  />
                  <Route 
                    path="/reports" 
                    element={
                      <AdminRoute>
                        <SidebarNavigation isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)}>
                          <AdminReportsPage />
                        </SidebarNavigation>
                      </AdminRoute>
                    } 
                  />
                  <Route 
                    path="/tasks" 
                    element={
                      <AdminRoute>
                        <SidebarNavigation isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)}>
                          <AdminTasksPage />
                        </SidebarNavigation>
                      </AdminRoute>
                    } 
                  />
                  <Route 
                    path="/admin-ratings" 
                    element={
                      <AdminRoute>
                        <SidebarNavigation isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)}>
                          <AdminRatingsPage />
                        </SidebarNavigation>
                      </AdminRoute>
                    } 
                  />
                  <Route 
                    path="/employee-tasks" 
                    element={
                      <EmployeeRoute>
                        <SidebarNavigation isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)}>
                          <EmployeeTasksPage />
                        </SidebarNavigation>
                      </EmployeeRoute>
                    } 
                  />
                  <Route 
                    path="/my-ratings" 
                    element={
                      <EmployeeRoute>
                        <SidebarNavigation isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)}>
                          <EmployeeRatingsPage />
                        </SidebarNavigation>
                      </EmployeeRoute>
                    } 
                  />
                  <Route 
                    path="/settings" 
                    element={
                      <AdminRoute>
                        <SidebarNavigation isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)}>
                          <SettingsPage />
                        </SidebarNavigation>
                      </AdminRoute>
                    } 
                  />
                  <Route 
                    path="/events" 
                    element={
                      <NonMediaBuyerRoute>
                        <SidebarNavigation isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)}>
                          <EventsPage />
                        </SidebarNavigation>
                      </NonMediaBuyerRoute>
                    } 
                  />
                  <Route 
                    path="/media-buyer-tasks" 
                    element={
                      <MediaBuyerRoute>
                        <SidebarNavigation isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)}>
                          <MediaBuyerTasksPage />
                        </SidebarNavigation>
                      </MediaBuyerRoute>
                    } 
                  />
                  <Route 
                    path="/admin-shift-management" 
                    element={
                      <AdminRoute>
                        <SidebarNavigation isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)}>
                          <AdminShiftManagement />
                        </SidebarNavigation>
                      </AdminRoute>
                    } 
                  />
                  <Route 
                    path="/workspace" 
                    element={
                      <PrivateRoute>
                        <SidebarNavigation isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)}>
                          <WorkspacePage />
                        </SidebarNavigation>
                      </PrivateRoute>
                    } 
                  />
                  <Route 
                    path="/analytics" 
                    element={
                      <AdminRoute>
                        <SidebarNavigation isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)}>
                          <AdminAnalyticsPage />
                        </SidebarNavigation>
                      </AdminRoute>
                    } 
                  />
                  <Route 
                    path="/admin-bug-reports" 
                    element={
                      <AdminRoute>
                        <SidebarNavigation isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)}>
                          <AdminBugReportsPage />
                        </SidebarNavigation>
                      </AdminRoute>
                    } 
                  />

                  <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
                </Routes>
                <PWAInstallPrompt />
                <Toaster />
                <Sonner />
              </LanguageProvider>
            </CheckInProvider>
          </WorkspaceMessageProvider>
        </AuthProvider>
      </BrowserRouter>
  );
};

// Component to conditionally show NotificationBanner only for authenticated users
const AuthenticatedNotificationBanner = () => {
  const { user } = useAuth();
  const location = useLocation();
  
  // Don't show notification banner on login page or index page
  const hideOnPages = ['/', '/login'];
  
  // Only show if user is authenticated and not on excluded pages
  if (!user || hideOnPages.includes(location.pathname)) {
    return null;
  }
  
  return <NotificationBanner />;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppWithAuth />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
