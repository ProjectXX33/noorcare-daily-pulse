
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useCheckIn } from '@/contexts/CheckInContext';
import { useAuth } from '@/contexts/AuthContext';

const ReportForm = () => {
  const { user } = useAuth();
  const { submitWorkReport, hasSubmittedReportToday, isLoading: contextLoading } = useCheckIn();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    tasksDone: '',
    issuesFaced: '',
    plansForTomorrow: '',
  });
  const [fileAttachment, setFileAttachment] = useState<File | null>(null);

  if (!user) return null;

  const alreadySubmitted = hasSubmittedReportToday(user.id);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileAttachment(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (alreadySubmitted) return;
    
    setIsLoading(true);
    
    try {
      await submitWorkReport(
        user.id,
        {
          tasksDone: formData.tasksDone,
          issuesFaced: formData.issuesFaced || null,
          plansForTomorrow: formData.plansForTomorrow,
        },
        fileAttachment || undefined
      );
      
      // Reset form
      setFormData({
        tasksDone: '',
        issuesFaced: '',
        plansForTomorrow: '',
      });
      setFileAttachment(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (alreadySubmitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Work Report</CardTitle>
          <CardDescription>Share your daily progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <h3 className="text-xl font-medium text-center">Report Submitted</h3>
            <p className="text-center text-gray-500 mt-2">You have already submitted your work report for today.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Work Report</CardTitle>
        <CardDescription>Share your daily progress</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="tasksDone">Tasks Completed Today</Label>
              <Textarea
                id="tasksDone"
                name="tasksDone"
                placeholder="What did you accomplish today?"
                value={formData.tasksDone}
                onChange={handleChange}
                required
                className="min-h-24"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="issuesFaced">Issues Faced</Label>
              <Textarea
                id="issuesFaced"
                name="issuesFaced"
                placeholder="Any challenges or blockers? If none, leave blank."
                value={formData.issuesFaced}
                onChange={handleChange}
                className="min-h-24"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plansForTomorrow">Plans for Tomorrow</Label>
              <Textarea
                id="plansForTomorrow"
                name="plansForTomorrow"
                placeholder="What do you plan to work on next?"
                value={formData.plansForTomorrow}
                onChange={handleChange}
                required
                className="min-h-24"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fileAttachment">Attach Files (Optional)</Label>
              <Input
                id="fileAttachment"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              />
              <p className="text-xs text-gray-500">
                Supported formats: PDF, Word, Excel, Images
              </p>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90"
              disabled={isLoading || contextLoading}
            >
              {isLoading || contextLoading ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ReportForm;
