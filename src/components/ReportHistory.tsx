
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkReport } from '@/types';
import { format } from 'date-fns';

interface ReportHistoryProps {
  reports: WorkReport[];
  title?: string;
}

const ReportHistory: React.FC<ReportHistoryProps> = ({ 
  reports,
  title = "Recent Reports" 
}) => {
  // Sort reports by date (most recent first)
  const sortedReports = [...reports].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Your submitted work reports</CardDescription>
      </CardHeader>
      <CardContent>
        {sortedReports.length === 0 ? (
          <p className="text-sm text-gray-500">No report history found.</p>
        ) : (
          <div className="space-y-8">
            {sortedReports.map((report) => (
              <div key={report.id} className="border-b pb-6">
                <div className="flex justify-between mb-2">
                  <div>
                    <p className="font-medium">{format(new Date(report.date), 'EEEE, MMMM d, yyyy')}</p>
                    <p className="text-sm text-gray-500">{report.userName} - {report.department}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-primary">Tasks Completed</h4>
                    <p className="text-sm mt-1">{report.tasksDone}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-primary">Issues Faced</h4>
                    <p className="text-sm mt-1">{report.issuesFaced || 'None reported'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-primary">Plans for Tomorrow</h4>
                    <p className="text-sm mt-1">{report.plansForTomorrow}</p>
                  </div>
                  {report.fileAttachments && report.fileAttachments.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-primary">Attachments</h4>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {report.fileAttachments.map((file, index) => (
                          <div key={index} className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {file}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReportHistory;
