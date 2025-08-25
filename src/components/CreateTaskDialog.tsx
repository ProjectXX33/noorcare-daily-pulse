import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Upload, Loader2 } from 'lucide-react';
import { User as UserType } from '@/types';

interface TaskFormData {
  title: string;
  description: string;
  assignedTo: string;
  status: 'Not Started' | 'On Hold' | 'In Progress' | 'Complete' | 'Unfinished';
  progressPercentage: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  projectType: 'social-media' | 'web-design' | 'branding' | 'print' | 'ui-ux' | 'other';
  tacticalPlan: string;
  timeEstimate: string;
  aim: string;
  idea: string;
  copy: string;
  visualFeeding: string;
  attachmentFile: string;
  notes: string;
}

interface CreateTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  taskForm: TaskFormData;
  setTaskForm: React.Dispatch<React.SetStateAction<TaskFormData>>;
  designers: UserType[];
  isLoading: boolean;
  onVisualFeedingUpload: (file: File) => void;
  onAttachmentUpload: (file: File) => void;
  isUploadingVisualFeeding: boolean;
  isUploadingAttachment: boolean;
}

const CreateTaskDialog: React.FC<CreateTaskDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  taskForm,
  setTaskForm,
  designers,
  isLoading,
  onVisualFeedingUpload,
  onAttachmentUpload,
  isUploadingVisualFeeding,
  isUploadingAttachment
}) => {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'visual-feeding' | 'attachment') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'visual-feeding') {
        onVisualFeedingUpload(file);
      } else {
        onAttachmentUpload(file);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign New Task to Designer</DialogTitle>
          <DialogDescription>
            Create a new design task and assign it to a designer with detailed creative brief.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Basic Task Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                value={taskForm.title}
                onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter task title"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="assignedTo">Assign to Designer *</Label>
              <Select
                value={taskForm.assignedTo}
                onValueChange={(value) => setTaskForm(prev => ({ ...prev, assignedTo: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a designer" />
                </SelectTrigger>
                <SelectContent>
                  {designers.map((designer) => (
                    <SelectItem key={designer.id} value={designer.id}>
                      {designer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Task Description *</Label>
            <Textarea
              id="description"
              value={taskForm.description}
              onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter task description"
              rows={3}
              required
            />
          </div>

          {/* Priority and Project Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={taskForm.priority}
                onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => 
                  setTaskForm(prev => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="projectType">Project Type</Label>
              <Select
                value={taskForm.projectType}
                onValueChange={(value: 'social-media' | 'web-design' | 'branding' | 'print' | 'ui-ux' | 'other') => 
                  setTaskForm(prev => ({ ...prev, projectType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="social-media">Social Media</SelectItem>
                  <SelectItem value="web-design">Web Design</SelectItem>
                  <SelectItem value="branding">Branding</SelectItem>
                  <SelectItem value="print">Print</SelectItem>
                  <SelectItem value="ui-ux">UI/UX</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Creative Brief Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Creative Brief (Required for Designer Tasks)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tacticalPlan">Tactical Plan *</Label>
                <Textarea
                  id="tacticalPlan"
                  value={taskForm.tacticalPlan}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, tacticalPlan: e.target.value }))}
                  placeholder="Describe the tactical approach"
                  rows={3}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="aim">Aim/Goal *</Label>
                <Textarea
                  id="aim"
                  value={taskForm.aim}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, aim: e.target.value }))}
                  placeholder="What is the main objective?"
                  rows={3}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="idea">Creative Idea *</Label>
                <Textarea
                  id="idea"
                  value={taskForm.idea}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, idea: e.target.value }))}
                  placeholder="Describe the creative concept"
                  rows={3}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="copy">Copy Text *</Label>
                <Textarea
                  id="copy"
                  value={taskForm.copy}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, copy: e.target.value }))}
                  placeholder="Enter the copy text for the design"
                  rows={3}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="timeEstimate">Time Estimate</Label>
                <Input
                  id="timeEstimate"
                  value={taskForm.timeEstimate}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, timeEstimate: e.target.value }))}
                  placeholder="e.g., 2-3 hours, 1 day"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={taskForm.notes}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional information"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* File Uploads */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Attachments</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="visualFeeding">Visual Feeding (Reference Images)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="visualFeeding"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'visual-feeding')}
                    className="flex-1"
                  />
                  {isUploadingVisualFeeding && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                {taskForm.visualFeeding && (
                  <p className="text-xs text-green-600">✓ Visual feeding uploaded</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="attachmentFile">Additional Attachments</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="attachmentFile"
                    type="file"
                    onChange={(e) => handleFileUpload(e, 'attachment')}
                    className="flex-1"
                  />
                  {isUploadingAttachment && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                {taskForm.attachmentFile && (
                  <p className="text-xs text-green-600">✓ Attachment uploaded</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning Task...
                </>
              ) : (
                'Assign Task'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTaskDialog;
