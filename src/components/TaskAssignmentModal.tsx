import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Target, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface TaskAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssignTask: (task: CopyWritingTask) => Promise<boolean>;
}

export interface CopyWritingTask {
  id?: string;
  title: string;
  description: string;
  productId?: number;
  productName?: string;
  assignedTo: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline: string;
  status: 'pending' | 'in_progress' | 'review' | 'completed';
  taskType: 'product_description' | 'meta_description' | 'category_copy' | 'blog_post' | 'ad_copy' | 'email_copy';
  requirements: string[];
  createdBy: string;
  createdAt: string;
}

const copyWriters = [
  { id: 'copywriter1', name: 'Sarah Ahmed', speciality: 'Product Descriptions' },
  { id: 'copywriter2', name: 'Mohammed Ali', speciality: 'SEO Content' },
  { id: 'copywriter3', name: 'Fatima Hassan', speciality: 'Arabic Content' },
  { id: 'copywriter4', name: 'Omar Khaled', speciality: 'Health & Wellness' }
];

export const TaskAssignmentModal: React.FC<TaskAssignmentModalProps> = ({
  isOpen,
  onClose,
  onAssignTask
}) => {
  const [formData, setFormData] = useState<Partial<CopyWritingTask>>({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    deadline: '',
    taskType: 'product_description',
    requirements: [],
    status: 'pending'
  });
  
  const [newRequirement, setNewRequirement] = useState('');
  const [saving, setSaving] = useState(false);

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setFormData(prev => ({
        ...prev,
        requirements: [...(prev.requirements || []), newRequirement.trim()]
      }));
      setNewRequirement('');
    }
  };

  const removeRequirement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements?.filter((_, i) => i !== index) || []
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.title || !formData.assignedTo || !formData.deadline) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const task: CopyWritingTask = {
        ...formData as CopyWritingTask,
        id: `task_${Date.now()}`,
        createdBy: 'Media Buyer', // This should come from auth context
        createdAt: new Date().toISOString()
      };

      const success = await onAssignTask(task);
      if (success) {
        toast.success(`Task assigned to ${copyWriters.find(w => w.id === formData.assignedTo)?.name}!`);
        onClose();
        // Reset form
        setFormData({
          title: '',
          description: '',
          assignedTo: '',
          priority: 'medium',
          deadline: '',
          taskType: 'product_description',
          requirements: [],
          status: 'pending'
        });
      }
    } catch (error) {
      console.error('Error assigning task:', error);
      toast.error('Failed to assign task');
    } finally {
      setSaving(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTaskTypeLabel = (type: string) => {
    const labels = {
      'product_description': 'Product Description',
      'meta_description': 'Meta Description',
      'category_copy': 'Category Copy',
      'blog_post': 'Blog Post',
      'ad_copy': 'Ad Copy',
      'email_copy': 'Email Copy'
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Assign Copy Writing Task
            <Badge variant="outline">Media Buyer</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Task Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              📝 Task Details
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Write SEO product description for Vitamin D3"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taskType">Task Type</Label>
                <Select value={formData.taskType} onValueChange={(value) => setFormData(prev => ({ ...prev, taskType: value as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product_description">📦 Product Description</SelectItem>
                    <SelectItem value="meta_description">🔍 Meta Description</SelectItem>
                    <SelectItem value="category_copy">📂 Category Copy</SelectItem>
                    <SelectItem value="blog_post">📰 Blog Post</SelectItem>
                    <SelectItem value="ad_copy">📢 Ad Copy</SelectItem>
                    <SelectItem value="email_copy">📧 Email Copy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Task Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what needs to be written, target audience, key messaging, brand guidelines, etc."
                rows={4}
              />
            </div>
          </div>

          {/* Assignment Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              👤 Assignment Details
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assign to Copywriter *</Label>
                <Select value={formData.assignedTo} onValueChange={(value) => setFormData(prev => ({ ...prev, assignedTo: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select copywriter" />
                  </SelectTrigger>
                  <SelectContent>
                    {copyWriters.map(writer => (
                      <SelectItem key={writer.id} value={writer.id}>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <div>
                            <div className="font-medium">{writer.name}</div>
                            <div className="text-xs text-gray-500">{writer.speciality}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority Level</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <Badge className="bg-green-100 text-green-800">🟢 Low</Badge>
                    </SelectItem>
                    <SelectItem value="medium">
                      <Badge className="bg-yellow-100 text-yellow-800">🟡 Medium</Badge>
                    </SelectItem>
                    <SelectItem value="high">
                      <Badge className="bg-orange-100 text-orange-800">🟠 High</Badge>
                    </SelectItem>
                    <SelectItem value="urgent">
                      <Badge className="bg-red-100 text-red-800">🔴 Urgent</Badge>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline *</Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={formData.deadline}
                onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
              />
            </div>
          </div>

          {/* Requirements */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              ✅ Requirements & Guidelines
            </h3>
            
            <div className="flex gap-2">
              <Input
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                placeholder="Add requirement (e.g., Include specific keywords, tone, word count)"
                onKeyPress={(e) => e.key === 'Enter' && addRequirement()}
              />
              <Button type="button" onClick={addRequirement} size="sm">
                Add
              </Button>
            </div>

            {formData.requirements && formData.requirements.length > 0 && (
              <div className="space-y-2">
                <Label>Current Requirements:</Label>
                <div className="space-y-2">
                  {formData.requirements.map((req, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="flex-1">{req}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRequirement(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Task Summary */}
          {formData.title && formData.assignedTo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                Task Summary
              </h4>
              <div className="space-y-1 text-sm">
                <div><strong>Task:</strong> {getTaskTypeLabel(formData.taskType || '')} - {formData.title}</div>
                <div><strong>Assigned to:</strong> {copyWriters.find(w => w.id === formData.assignedTo)?.name}</div>
                <div><strong>Priority:</strong> 
                  <Badge className={`ml-2 ${getPriorityColor(formData.priority || '')}`}>
                    {formData.priority?.toUpperCase()}
                  </Badge>
                </div>
                {formData.deadline && (
                  <div><strong>Deadline:</strong> {new Date(formData.deadline).toLocaleString()}</div>
                )}
                <div><strong>Requirements:</strong> {formData.requirements?.length || 0} items</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? 'Assigning...' : 'Assign Task'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 