import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import OpeningAnimation from "./components/OpeningAnimation";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import CheckInPage from "./pages/CheckInPage";
import ReportPage from "./pages/ReportPage";
import AdminEmployeesPage from "./pages/AdminEmployeesPage";
import AdminReportsPage from "./pages/AdminReportsPage";
import AdminTasksPage from "./pages/AdminTasksPage";
import EmployeeTasksPage from "./pages/EmployeeTasksPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./contexts/AuthContext";
import { CheckInProvider } from "./contexts/CheckInContext";
import { useAuth } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import SidebarNavigation from "./components/SidebarNavigation";
import "./styles/rtl.css";
import EventsPage from '@/pages/EventsPage';
import React, { useState, useEffect } from 'react';


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

  return (
    <BrowserRouter>
      <AuthProvider>
        <CheckInProvider>
          <LanguageProvider>
            <AnimatePresence>
              {showOpeningAnimation && <OpeningAnimation />}
            </AnimatePresence>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
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
                path="/settings" 
                element={
                  <PrivateRoute>
                    <SidebarNavigation isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)}>
                      <SettingsPage />
                    </SidebarNavigation>
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/events" 
                element={
                  <PrivateRoute>
                    <SidebarNavigation isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)}>
                      <EventsPage />
                    </SidebarNavigation>
                  </PrivateRoute>
                } 
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
            <Sonner />
          </LanguageProvider>
        </CheckInProvider>
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
