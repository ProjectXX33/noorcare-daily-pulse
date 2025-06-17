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
import { LoyalCustomersProvider } from "./contexts/LoyalCustomersContext";
import { CopyWritingProductsProvider } from "./contexts/CopyWritingProductsContext";
import { StrategyProvider } from "./contexts/StrategyContext";
import SidebarNavigation from "./components/SidebarNavigation";
import "./styles/rtl.css";
import EventsPage from '@/pages/EventsPage';
import MediaBuyerTasksPage from "./pages/MediaBuyerTasksPage";
import DesignerDashboard from "./pages/DesignerDashboard";
import WorkspacePage from '@/pages/WorkspacePage';
import React, { useState, useEffect } from 'react';
import AdminShiftManagement from "./pages/AdminShiftManagement";
import AdminBugReportsPage from "./pages/AdminBugReportsPage";
import AdminAnalyticsPage from "./pages/AdminAnalyticsPage";
import AdminPerformancePage from "./pages/AdminPerformancePage";
import CreateOrderPage from "./pages/CreateOrderPage";
import MyOrdersPage from "./pages/MyOrdersPage";
import AdminTotalOrdersPage from "./pages/AdminTotalOrdersPage";
import LoyalCustomersPage from "./pages/LoyalCustomersPage";
import CustomerServiceCRMPage from "./pages/CustomerServiceCRMPage";
import CopyWritingDashboard from "./pages/CopyWritingDashboard";
import CopyWritingProductsPage from "./pages/CopyWritingProductsPage";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import NotificationHandler from "./components/NotificationHandler";
import NotificationBanner from "./components/NotificationBanner";
import AppUpdateManager from "./components/AppUpdateManager";
import UpdateTrigger from "./components/UpdateTrigger";
import PWAVersionChecker from "./components/PWAVersionChecker";
import FloatingChatbot from "./components/FloatingChatbot";
import BackgroundProcessIndicator from "./components/BackgroundProcessIndicator";
import CustomerLoader from "./components/MobileCustomerLoader";
import CopyWritingLoader from "./components/MobileCopyWritingLoader";
import StrategyPage from "./pages/StrategyPage";  
import PWAUpdateInstructions from "./components/PWAUpdateInstructions";
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

// Employee Dashboard route - redirects Copy Writing users to their dashboard
const EmployeeDashboardRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  
  // Redirect Copy Writing users to their dedicated dashboard
  if (user && user.position === 'Copy Writing') {
    return <Navigate to="/copy-writing-dashboard" replace />;
  }
  
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

// Designer route component for designer-only access
const DesignerRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  
  if (!user || user.position !== 'Designer') {
    return <Navigate to={user?.role === 'admin' ? '/dashboard' : '/employee-dashboard'} replace />;
  }
  
  return <>{children}</>;
};

// Copy Writing route component for copy writing-only access
const CopyWritingRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  
  if (!user || user.position !== 'Copy Writing') {
    return <Navigate to={user?.role === 'admin' ? '/dashboard' : '/employee-dashboard'} replace />;
  }
  
  return <>{children}</>;
};

// Strategy route component for admin and media buyer access
const StrategyRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  
  if (!user || (user.role !== 'admin' && user.position !== 'Media Buyer')) {
    return <Navigate to={user?.role === 'admin' ? '/dashboard' : '/employee-dashboard'} replace />;
  }
  
  return <>{children}</>;
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

// This component is outside the BrowserRouter but inside the other providers
const AppWithAuth = () => {
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
              <LoyalCustomersProvider>
                <CopyWritingProductsProvider>
                  <StrategyProvider>
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
                              <SidebarNavigation>
                                <Dashboard />
                              </SidebarNavigation>
                            </AdminRoute>
                          } 
                        />
                        <Route 
                          path="/employee-dashboard" 
                          element={
                            <EmployeeDashboardRoute>
                              <SidebarNavigation>
                                <EmployeeDashboard />
                              </SidebarNavigation>
                            </EmployeeDashboardRoute>
                          } 
                        />
                        <Route 
                          path="/copy-writing-dashboard" 
                          element={
                            <CopyWritingRoute>
                              <SidebarNavigation>
                                <CopyWritingDashboard />
                              </SidebarNavigation>
                            </CopyWritingRoute>
                          } 
                        />
                        <Route 
                          path="/check-in" 
                          element={
                            <PrivateRoute>
                              <SidebarNavigation>
                                <CheckInPage />
                              </SidebarNavigation>
                            </PrivateRoute>
                          } 
                        />
                        <Route 
                          path="/shifts" 
                          element={
                            <PrivateRoute>
                              <SidebarNavigation>
                                <ShiftsPage />
                              </SidebarNavigation>
                            </PrivateRoute>
                          } 
                        />
                        <Route 
                          path="/report" 
                          element={
                            <PrivateRoute>
                              <SidebarNavigation>
                                <ReportPage />
                              </SidebarNavigation>
                            </PrivateRoute>
                          } 
                        />
                        <Route 
                          path="/employees" 
                          element={
                            <AdminRoute>
                              <SidebarNavigation>
                                <AdminEmployeesPage />
                              </SidebarNavigation>
                            </AdminRoute>
                          } 
                        />
                        <Route 
                          path="/reports" 
                          element={
                            <AdminRoute>
                              <SidebarNavigation>
                                <AdminReportsPage />
                              </SidebarNavigation>
                            </AdminRoute>
                          } 
                        />
                        <Route 
                          path="/tasks" 
                          element={
                            <AdminRoute>
                              <SidebarNavigation>
                                <AdminTasksPage />
                              </SidebarNavigation>
                            </AdminRoute>
                          } 
                        />
                        <Route 
                          path="/admin-ratings" 
                          element={
                            <AdminRoute>
                              <SidebarNavigation>
                                <AdminRatingsPage />
                              </SidebarNavigation>
                            </AdminRoute>
                          } 
                        />
                        <Route 
                          path="/employee-tasks" 
                          element={
                            <EmployeeRoute>
                              <SidebarNavigation>
                                <EmployeeTasksPage />
                              </SidebarNavigation>
                            </EmployeeRoute>
                          } 
                        />
                        <Route 
                          path="/my-ratings" 
                          element={
                            <EmployeeRoute>
                              <SidebarNavigation>
                                <EmployeeRatingsPage />
                              </SidebarNavigation>
                            </EmployeeRoute>
                          } 
                        />
                        <Route 
                          path="/settings" 
                          element={
                            <AdminRoute>
                              <SidebarNavigation>
                                <SettingsPage />
                              </SidebarNavigation>
                            </AdminRoute>
                          } 
                        />
                        <Route 
                          path="/events" 
                          element={
                            <PrivateRoute>
                              <SidebarNavigation>
                                <EventsPage />
                              </SidebarNavigation>
                            </PrivateRoute>
                          } 
                        />
                        <Route 
                          path="/media-buyer-tasks" 
                          element={
                            <MediaBuyerRoute>
                              <SidebarNavigation>
                                <MediaBuyerTasksPage />
                              </SidebarNavigation>
                            </MediaBuyerRoute>
                          } 
                        />
                        <Route 
                          path="/admin-shift-management" 
                          element={
                            <AdminRoute>
                              <SidebarNavigation>
                                <AdminShiftManagement />
                              </SidebarNavigation>
                            </AdminRoute>
                          } 
                        />
                        <Route 
                          path="/performance-dashboard" 
                          element={
                            <AdminRoute>
                              <SidebarNavigation>
                                <AdminPerformancePage />
                              </SidebarNavigation>
                            </AdminRoute>
                          } 
                        />
                        <Route 
                          path="/workspace" 
                          element={
                            <PrivateRoute>
                              <SidebarNavigation>
                                <WorkspacePage />
                              </SidebarNavigation>
                            </PrivateRoute>
                          } 
                        />
                        <Route 
                          path="/analytics" 
                          element={
                            <AdminRoute>
                              <SidebarNavigation>
                                <AdminAnalyticsPage />
                              </SidebarNavigation>
                            </AdminRoute>
                          } 
                        />
                        <Route 
                          path="/admin-bug-reports" 
                          element={
                            <AdminRoute>
                              <SidebarNavigation>
                                <AdminBugReportsPage />
                              </SidebarNavigation>
                            </AdminRoute>
                          } 
                        />
                        <Route 
                          path="/customer-service-crm" 
                          element={
                            <CustomerServiceRoute>
                              <SidebarNavigation>
                                <CustomerServiceCRMPage />
                              </SidebarNavigation>
                            </CustomerServiceRoute>
                          } 
                        />
                        <Route 
                          path="/create-order" 
                          element={
                            <CustomerServiceRoute>
                              <SidebarNavigation>
                                <CreateOrderPage />
                              </SidebarNavigation>
                            </CustomerServiceRoute>
                          } 
                        />
                        <Route 
                          path="/my-orders" 
                          element={
                            <CustomerServiceRoute>
                              <SidebarNavigation>
                                <MyOrdersPage />
                              </SidebarNavigation>
                            </CustomerServiceRoute>
                          } 
                        />
                        <Route 
                          path="/admin-total-orders" 
                          element={
                            <AdminRoute>
                              <SidebarNavigation>
                                <AdminTotalOrdersPage />
                              </SidebarNavigation>
                            </AdminRoute>
                          } 
                        />
                        <Route 
                          path="/loyal-customers" 
                          element={
                            <CustomerServiceRoute>
                              <SidebarNavigation>
                                <LoyalCustomersPage />
                              </SidebarNavigation>
                            </CustomerServiceRoute>
                          } 
                        />
                        <Route 
                          path="/designer-dashboard" 
                          element={
                            <DesignerRoute>
                              <SidebarNavigation>
                                <DesignerDashboard />
                              </SidebarNavigation>
                            </DesignerRoute>
                          } 
                        />
                        <Route 
                          path="/copy-writing-dashboard" 
                          element={
                            <CopyWritingRoute>
                              <SidebarNavigation>
                                <CopyWritingDashboard />
                              </SidebarNavigation>
                            </CopyWritingRoute>
                          } 
                        />
                        <Route 
                          path="/copy-writing-products" 
                          element={
                            <CopyWritingRoute>
                              <SidebarNavigation>
                                <CopyWritingProductsPage />
                              </SidebarNavigation>
                            </CopyWritingRoute>
                          } 
                        />
                        {/* Strategy Page */}
                        <Route 
                          path="/strategy" 
                          element={
                            <StrategyRoute>
                              <SidebarNavigation>
                                <StrategyPage />
                              </SidebarNavigation>
                            </StrategyRoute>
                          } 
                        />
                        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
                      </Routes>
                      <AppUpdateManager />
                      <UpdateTrigger />
                      <PWAVersionChecker />
                      <PWAUpdateInstructions />
                      <FloatingChatbot />
                      <BackgroundProcessIndicator />
                      <CustomerLoader />
                      <CopyWritingLoader />

                      <PWAInstallPrompt />
                      <Toaster />
                      <Sonner />
                    </LanguageProvider>
                  </StrategyProvider>
                </CopyWritingProductsProvider>
              </LoyalCustomersProvider>
            </CheckInProvider>
          </WorkspaceMessageProvider>
        </AuthProvider>
      </BrowserRouter>
  );
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
