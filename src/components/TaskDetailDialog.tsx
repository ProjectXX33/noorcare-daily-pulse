import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, User, Clock, Eye, MessageSquare, FileText, Image as ImageIcon } from 'lucide-react';
import { Task } from '@/types';
import TaskComments from '@/components/TaskComments';

interface TaskDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onAddComment: (comments: any[]) => void;
  onImageClick: (url: string) => void;
}

const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({
  isOpen,
  onClose,
  task,
  onAddComment,
  onImageClick
}) => {
  if (!task) return null;

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Not Started':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200';
      case 'Complete':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200';
      case 'On Hold':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200';
      case 'Unfinished':
        return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-200';
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{task.title}</span>
            <Badge className={getStatusBadgeClass(task.status)}>
              {task.status}
            </Badge>
            {task.priority && (
              <Badge className={getPriorityBadgeClass(task.priority)}>
                {task.priority}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            View detailed task information, creative brief, attachments, and comments.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Task Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Assigned to: {task.assignedToName || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Updated: {new Date(task.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span>{task.progressPercentage}%</span>
              </div>
              <Progress value={task.progressPercentage} className="h-2" />
            </div>
          </div>

          {/* Task Description */}
          <div className="space-y-2">
            <h3 className="font-semibold">Description</h3>
            <p className="text-sm text-muted-foreground">{task.description}</p>
          </div>

          {/* Creative Brief */}
          {(task.tacticalPlan || task.aim || task.idea || task.copy) && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-4">Creative Brief</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {task.tacticalPlan && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Tactical Plan</h4>
                    <p className="text-sm text-muted-foreground">{task.tacticalPlan}</p>
                  </div>
                )}
                
                {task.aim && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Aim/Goal</h4>
                    <p className="text-sm text-muted-foreground">{task.aim}</p>
                  </div>
                )}
                
                {task.idea && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Creative Idea</h4>
                    <p className="text-sm text-muted-foreground">{task.idea}</p>
                  </div>
                )}
                
                {task.copy && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Copy Text</h4>
                    <p className="text-sm text-muted-foreground">{task.copy}</p>
                  </div>
                )}
              </div>

              {(task.timeEstimate || task.notes) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {task.timeEstimate && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Time Estimate</h4>
                      <p className="text-sm text-muted-foreground">{task.timeEstimate}</p>
                    </div>
                  )}
                  
                  {task.notes && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Additional Notes</h4>
                      <p className="text-sm text-muted-foreground">{task.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Attachments */}
          {(task.visualFeeding || task.attachmentFile) && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-4">Attachments</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {task.visualFeeding && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Visual Feeding
                    </h4>
                    <div className="space-y-2">
                      <img 
                        src={task.visualFeeding} 
                        alt="Visual Feeding" 
                        className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => onImageClick(task.visualFeeding!)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onImageClick(task.visualFeeding!)}
                        className="w-full"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Full Size
                      </Button>
                    </div>
                  </div>
                )}
                
                {task.attachmentFile && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Additional Attachment
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(task.attachmentFile, '_blank')}
                      className="w-full"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Attachment
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comments
            </h3>
            
            <TaskComments
              taskId={task.id}
              user={task.createdBy as any} // This should be the current user
              comments={task.comments || []}
              onCommentAdded={onAddComment}
              language="en"
              isLocked={task.isLocked}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;
