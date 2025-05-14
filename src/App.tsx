
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CheckInPage from "./pages/CheckInPage";
import ReportPage from "./pages/ReportPage";
import AdminEmployeesPage from "./pages/AdminEmployeesPage";
import AdminReportsPage from "./pages/AdminReportsPage";
import NotFound from "./pages/NotFound";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CheckInProvider } from "./contexts/CheckInContext";

const queryClient = new QueryClient();

// PrivateRoute component to protect routes
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// AdminRoute component to protect admin-only routes
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Need to wrap routes in this component to use AuthContext
const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={
        <PrivateRoute>
          <Dashboard />
        </PrivateRoute>
      } />
      <Route path="/check-in" element={
        <PrivateRoute>
          <CheckInPage />
        </PrivateRoute>
      } />
      <Route path="/report" element={
        <PrivateRoute>
          <ReportPage />
        </PrivateRoute>
      } />
      <Route path="/employees" element={
        <AdminRoute>
          <AdminEmployeesPage />
        </AdminRoute>
      } />
      <Route path="/reports" element={
        <AdminRoute>
          <AdminReportsPage />
        </AdminRoute>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <CheckInProvider>
            <AppRoutes />
            <Toaster />
            <Sonner />
          </CheckInProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
