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

interface EditTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  editingTask: TaskFormData;
  setEditingTask: React.Dispatch<React.SetStateAction<TaskFormData>>;
  designers: UserType[];
  isLoading: boolean;
  onVisualFeedingUpload: (file: File) => void;
  onAttachmentUpload: (file: File) => void;
  isUploadingVisualFeeding: boolean;
  isUploadingAttachment: boolean;
}

const EditTaskDialog: React.FC<EditTaskDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingTask,
  setEditingTask,
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
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update task details, status, progress, and creative brief information.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Basic Task Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="editTitle">Task Title *</Label>
              <Input
                id="editTitle"
                value={editingTask.title}
                onChange={(e) => setEditingTask(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter task title"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editAssignedTo">Assign to Designer *</Label>
              <Select
                value={editingTask.assignedTo}
                onValueChange={(value) => setEditingTask(prev => ({ ...prev, assignedTo: value }))}
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
            <Label htmlFor="editDescription">Task Description *</Label>
            <Textarea
              id="editDescription"
              value={editingTask.description}
              onChange={(e) => setEditingTask(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter task description"
              rows={3}
              required
            />
          </div>

          {/* Status and Progress */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="editStatus">Status</Label>
              <Select
                value={editingTask.status}
                onValueChange={(value: 'Not Started' | 'On Hold' | 'In Progress' | 'Complete' | 'Unfinished') => 
                  setEditingTask(prev => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not Started">Not Started</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Complete">Complete</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                  <SelectItem value="Unfinished">Unfinished</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editProgress">Progress (%)</Label>
              <Input
                id="editProgress"
                type="number"
                min="0"
                max="100"
                value={editingTask.progressPercentage}
                onChange={(e) => setEditingTask(prev => ({ ...prev, progressPercentage: parseInt(e.target.value) || 0 }))}
                placeholder="0-100"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editPriority">Priority</Label>
              <Select
                value={editingTask.priority}
                onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => 
                  setEditingTask(prev => ({ ...prev, priority: value }))
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="editProjectType">Project Type</Label>
            <Select
              value={editingTask.projectType}
              onValueChange={(value: 'social-media' | 'web-design' | 'branding' | 'print' | 'ui-ux' | 'other') => 
                setEditingTask(prev => ({ ...prev, projectType: value }))
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

          {/* Creative Brief Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Creative Brief</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editTacticalPlan">Tactical Plan</Label>
                <Textarea
                  id="editTacticalPlan"
                  value={editingTask.tacticalPlan}
                  onChange={(e) => setEditingTask(prev => ({ ...prev, tacticalPlan: e.target.value }))}
                  placeholder="Describe the tactical approach"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="editAim">Aim/Goal</Label>
                <Textarea
                  id="editAim"
                  value={editingTask.aim}
                  onChange={(e) => setEditingTask(prev => ({ ...prev, aim: e.target.value }))}
                  placeholder="What is the main objective?"
                  rows={3}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="editIdea">Creative Idea</Label>
                <Textarea
                  id="editIdea"
                  value={editingTask.idea}
                  onChange={(e) => setEditingTask(prev => ({ ...prev, idea: e.target.value }))}
                  placeholder="Describe the creative concept"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="editCopy">Copy Text</Label>
                <Textarea
                  id="editCopy"
                  value={editingTask.copy}
                  onChange={(e) => setEditingTask(prev => ({ ...prev, copy: e.target.value }))}
                  placeholder="Enter the copy text for the design"
                  rows={3}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="editTimeEstimate">Time Estimate</Label>
                <Input
                  id="editTimeEstimate"
                  value={editingTask.timeEstimate}
                  onChange={(e) => setEditingTask(prev => ({ ...prev, timeEstimate: e.target.value }))}
                  placeholder="e.g., 2-3 hours, 1 day"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="editNotes">Additional Notes</Label>
                <Textarea
                  id="editNotes"
                  value={editingTask.notes}
                  onChange={(e) => setEditingTask(prev => ({ ...prev, notes: e.target.value }))}
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
                <Label htmlFor="editVisualFeeding">Visual Feeding (Reference Images)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="editVisualFeeding"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'visual-feeding')}
                    className="flex-1"
                  />
                  {isUploadingVisualFeeding && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                {editingTask.visualFeeding && (
                  <p className="text-xs text-green-600">✓ Visual feeding uploaded</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="editAttachmentFile">Additional Attachments</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="editAttachmentFile"
                    type="file"
                    onChange={(e) => handleFileUpload(e, 'attachment')}
                    className="flex-1"
                  />
                  {isUploadingAttachment && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                {editingTask.attachmentFile && (
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
                  Updating Task...
                </>
              ) : (
                'Update Task'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTaskDialog;
