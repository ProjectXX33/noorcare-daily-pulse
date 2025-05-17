
import React, { useState, useEffect } from 'react';
import { getTaskAttachments, deleteTaskAttachment } from '@/lib/taskAttachmentsApi';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileIcon, Trash2, FileText, FileImage, FileArchive, Eye } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';

interface TaskAttachmentsListProps {
  taskId: string;
  refresh: number;
  language: string;
}

const TaskAttachmentsList: React.FC<TaskAttachmentsListProps> = ({ 
  taskId, 
  refresh,
  language 
}) => {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Translation object for multilingual support
  const translations = {
    en: {
      attachments: "Attachments",
      noAttachments: "No attachments yet",
      deleted: "Attachment deleted successfully",
      error: "Error deleting attachment"
    },
    ar: {
      attachments: "المرفقات",
      noAttachments: "لا توجد مرفقات حتى الآن",
      deleted: "تم حذف المرفق بنجاح",
      error: "خطأ في حذف المرفق"
    }
  };

  const t = translations[language as keyof typeof translations];
  
  useEffect(() => {
    loadAttachments();
  }, [taskId, refresh]);
  
  const loadAttachments = async () => {
    if (!taskId) return;
    
    setIsLoading(true);
    try {
      const data = await getTaskAttachments(taskId);
      setAttachments(data);
    } catch (error) {
      console.error('Error loading attachments:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = async (attachmentId: string, filePath: string) => {
    if (!user) return;
    
    const confirmed = window.confirm("Are you sure you want to delete this attachment?");
    if (!confirmed) return;
    
    try {
      const success = await deleteTaskAttachment(attachmentId, filePath);
      
      if (success) {
        toast.success(t.deleted);
        setAttachments(attachments.filter(att => att.id !== attachmentId));
      } else {
        toast.error(t.error);
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error(t.error);
    }
  };
  
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <FileImage className="h-5 w-5" />;
    } else if (fileType.includes('pdf') || fileType.includes('document')) {
      return <FileText className="h-5 w-5" />;
    } else if (fileType.includes('zip') || fileType.includes('compressed')) {
      return <FileArchive className="h-5 w-5" />;
    }
    return <FileIcon className="h-5 w-5" />;
  };
  
  if (isLoading) {
    return (
      <div className="py-4 flex justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (attachments.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        {t.noAttachments}
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      <h3 className="font-medium text-sm">{t.attachments}</h3>
      <div className="space-y-2">
        {attachments.map((attachment) => (
          <div 
            key={attachment.id} 
            className="border rounded-md p-2 flex items-center justify-between"
          >
            <div className="flex items-center">
              {getFileIcon(attachment.file_type)}
              <span className="ml-2 text-sm truncate max-w-[180px]">
                {attachment.file_name}
              </span>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (attachment.url) {
                    window.open(attachment.url, '_blank');
                  }
                }}
              >
                <Eye className="h-4 w-4" />
              </Button>
              
              {/* Only show delete button if user created the attachment */}
              {user && (user.id === attachment.created_by || user.role === 'admin') && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(attachment.id, attachment.file_path)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskAttachmentsList;
