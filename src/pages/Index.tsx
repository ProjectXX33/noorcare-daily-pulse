
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    let timeoutId: number;
    
    const handleNavigation = () => {
      if (!isLoading) {
        if (isAuthenticated) {
          navigate('/dashboard');
        } else {
          navigate('/login');
        }
      } else {
        // If still loading, wait a bit and try again
        timeoutId = window.setTimeout(() => {
          setIsRedirecting(false); // Show content if taking too long
        }, 3000);
      }
    };
    
    handleNavigation();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isAuthenticated, isLoading, navigate]);

  // Only show loading state for a reasonable time
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-primary">NoorCare</h1>
          <div className="flex justify-center items-center mt-4">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
          </div>
          <p className="text-xl text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // Fallback view if automatic navigation fails
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-primary">NoorCare</h1>
        <p className="text-xl text-gray-600 mb-8">Employee Management System</p>
        <div className="space-x-4">
          <button 
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index;
