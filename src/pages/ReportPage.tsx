import React from 'react';
import ReportForm from '@/components/ReportForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, AlertCircle, Clock, CheckCircle } from 'lucide-react';

const ReportPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 w-full max-w-full overflow-x-hidden">
      {/* Enhanced mobile-optimized header - Non-sticky, responsive layout */}
      <div className="border-b border-border/50 bg-background/98 w-full">
        <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6 w-full max-w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
            <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">Daily Work Report</h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">Submit your daily work activities and progress</p>
            </div>
          </div>
        </div>
      </div>

      <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 space-y-6 sm:space-y-8 md:space-y-10 w-full max-w-full overflow-x-hidden">
        {/* Mobile-optimized important notice */}
        <div className="p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-900/20 dark:border-amber-900/30">
          <div className="flex items-start gap-2 sm:gap-3">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-1 text-sm sm:text-base">⚠️ Daily Reminder</h3>
              <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-400 font-medium">
                Please submit your daily report before the end of your work day. 
                Failure to submit reports will affect your attendance records.
              </p>
            </div>
          </div>
        </div>

        {/* Mobile-optimized report form card */}
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Daily Work Report
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Please provide details about your work activities for today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReportForm />
          </CardContent>
        </Card>

        {/* Mobile-optimized guidelines */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Clock className="h-4 w-4 text-blue-500" />
                Submission Time
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Please submit your daily report before the end of your work day to ensure accurate tracking.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <FileText className="h-4 w-4 text-green-500" />
                Report Content
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Include specific details about tasks completed, challenges faced, and progress made on your projects.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <CheckCircle className="h-4 w-4 text-purple-500" />
                Best Practices
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                  <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                    <strong>Be specific:</strong> Instead of "worked on project", write "completed user authentication module for mobile app"
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                  <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                    <strong>Include metrics:</strong> Mention numbers, percentages, or time spent when relevant
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                  <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                    <strong>Note blockers:</strong> Clearly identify any obstacles and how you plan to resolve them
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                  <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                    <strong>Plan ahead:</strong> Use the "Plans for Tomorrow" section to set clear goals for the next day
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;
