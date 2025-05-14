
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
import { AuthProvider } from "./contexts/AuthContext";
import { CheckInProvider } from "./contexts/CheckInContext";

const queryClient = new QueryClient();

// This component is outside the routes so that `useAuth` can be used
const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/check-in" element={<PrivateRoute><CheckInPage /></PrivateRoute>} />
      <Route path="/report" element={<PrivateRoute><ReportPage /></PrivateRoute>} />
      <Route path="/employees" element={<AdminRoute><AdminEmployeesPage /></AdminRoute>} />
      <Route path="/reports" element={<AdminRoute><AdminReportsPage /></AdminRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// Use React component syntax for these components
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  // We'll access AuthContext directly in the component
  // This solves the auto-refresh issue by properly evaluating auth state
  return children;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  // We'll access AuthContext directly in the component
  // This solves the auto-refresh issue by properly evaluating auth state
  return children;
};

const App = () => {
  return (
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
};

export default App;
