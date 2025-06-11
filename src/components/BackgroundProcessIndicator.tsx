import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useLoyalCustomers } from '@/contexts/LoyalCustomersContext';

const BackgroundProcessIndicator = () => {
  const { loading, progress, stage, details, customers } = useLoyalCustomers();

  if (!loading || customers.length > 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 400 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 400 }}
        className="fixed bottom-4 right-4 z-50 w-80 hidden" // Hide since we now use unified CustomerLoader
      >
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center flex-shrink-0">
                <Crown className="w-4 h-4 text-amber-600" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-amber-800 mb-1">
                  Background Processing
                </h4>
                <p className="text-xs text-amber-700 mb-2">
                  {stage || 'Loading all-time customer data...'}
                </p>
                
                <Progress value={progress} className="h-2 mb-2" />
                
                <div className="flex items-center justify-between text-xs text-amber-600">
                  <span>{Math.round(progress)}%</span>
                  <span>Continue working!</span>
                </div>
                
                {details && (
                  <p className="text-xs text-amber-600 mt-1 truncate" title={details}>
                    {details}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default BackgroundProcessIndicator; 