
import React from 'react';
import ReportForm from '@/components/ReportForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

const ReportPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold mb-2">Daily Report</h1>
        <p className="text-muted-foreground">Submit your daily work report</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Daily Work Report
          </CardTitle>
          <CardDescription>
            Please provide details about your work activities for today
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportForm />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Report Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-1">Submission Time</h3>
              <p className="text-muted-foreground">
                Please submit your daily report before the end of your work day.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium mb-1">Report Content</h3>
              <p className="text-muted-foreground">
                Include specific details about tasks completed, challenges faced, and progress made.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium mb-1">Report Quality</h3>
              <p className="text-muted-foreground">
                Clear and concise reports help management track progress and identify areas that need support.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportPage;
