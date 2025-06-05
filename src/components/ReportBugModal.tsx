import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Bug, Send, Loader2 } from 'lucide-react';

interface ReportBugModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BugReport {
  title: string;
  description: string;
  category: string;
  priority: string;
  steps_to_reproduce: string;
  expected_behavior: string;
  actual_behavior: string;
}

const ReportBugModal: React.FC<ReportBugModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bugReport, setBugReport] = useState<BugReport>({
    title: '',
    description: '',
    category: 'general',
    priority: 'medium',
    steps_to_reproduce: '',
    expected_behavior: '',
    actual_behavior: ''
  });

  const categories = [
    { value: 'ui', label: 'User Interface' },
    { value: 'functionality', label: 'Functionality' },
    { value: 'performance', label: 'Performance' },
    { value: 'data', label: 'Data Issues' },
    { value: 'security', label: 'Security' },
    { value: 'general', label: 'General' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'text-green-600' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'critical', label: 'Critical', color: 'text-red-600' }
  ];

  const handleInputChange = (field: keyof BugReport, value: string) => {
    setBugReport(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !bugReport.title.trim() || !bugReport.description.trim()) {
      toast.error('Please fill in the required fields (Title and Description)');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Get browser info
      const browserInfo = `${navigator.userAgent} | Screen: ${window.screen.width}x${window.screen.height}`;
      const pageUrl = window.location.href;

      const { error } = await supabase
        .from('bug_reports')
        .insert([{
          title: bugReport.title.trim(),
          description: bugReport.description.trim(),
          category: bugReport.category,
          priority: bugReport.priority,
          steps_to_reproduce: bugReport.steps_to_reproduce.trim() || null,
          expected_behavior: bugReport.expected_behavior.trim() || null,
          actual_behavior: bugReport.actual_behavior.trim() || null,
          reported_by: user.id,
          browser_info: browserInfo,
          page_url: pageUrl
        }]);

      if (error) {
        console.error('Error submitting bug report:', error);
        toast.error('Failed to submit bug report. Please try again.');
        return;
      }

      toast.success('Bug report submitted successfully! Our team will review it soon.');
      
      // Reset form
      setBugReport({
        title: '',
        description: '',
        category: 'general',
        priority: 'medium',
        steps_to_reproduce: '',
        expected_behavior: '',
        actual_behavior: ''
      });
      
      onClose();
    } catch (error) {
      console.error('Error submitting bug report:', error);
      toast.error('Failed to submit bug report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-red-500" />
            Report a Bug
          </DialogTitle>
          <DialogDescription>
            Help us improve the system by reporting bugs or issues you encounter.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={bugReport.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Brief description of the issue"
              className="w-full"
              required
            />
          </div>

          {/* Category and Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">Category</Label>
              <Select value={bugReport.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority" className="text-sm font-medium">Priority</Label>
              <Select value={bugReport.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      <span className={priority.color}>{priority.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              value={bugReport.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Detailed description of the bug or issue"
              className="w-full min-h-[100px]"
              required
            />
          </div>

          {/* Steps to Reproduce */}
          <div className="space-y-2">
            <Label htmlFor="steps" className="text-sm font-medium">Steps to Reproduce</Label>
            <Textarea
              id="steps"
              value={bugReport.steps_to_reproduce}
              onChange={(e) => handleInputChange('steps_to_reproduce', e.target.value)}
              placeholder="1. Go to...&#10;2. Click on...&#10;3. Notice that..."
              className="w-full min-h-[80px]"
            />
          </div>

          {/* Expected vs Actual Behavior */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expected" className="text-sm font-medium">Expected Behavior</Label>
              <Textarea
                id="expected"
                value={bugReport.expected_behavior}
                onChange={(e) => handleInputChange('expected_behavior', e.target.value)}
                placeholder="What should happen?"
                className="w-full min-h-[60px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="actual" className="text-sm font-medium">Actual Behavior</Label>
              <Textarea
                id="actual"
                value={bugReport.actual_behavior}
                onChange={(e) => handleInputChange('actual_behavior', e.target.value)}
                placeholder="What actually happens?"
                className="w-full min-h-[60px]"
              />
            </div>
          </div>

          {/* Submit buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !bugReport.title.trim() || !bugReport.description.trim()}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Report
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReportBugModal; 