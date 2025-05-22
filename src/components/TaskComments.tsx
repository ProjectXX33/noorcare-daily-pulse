import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addTaskComment } from '@/lib/tasksApi';
import { toast } from "sonner";
import { User } from '@/types';
import { format } from "date-fns";

interface TaskCommentsProps {
  taskId: string;
  user: User;
  comments: any[];
  onCommentAdded: (newComments: any[]) => void;
  language: string;
}

const TaskComments: React.FC<TaskCommentsProps> = ({ 
  taskId, 
  user,
  comments = [],
  onCommentAdded,
  language 
}) => {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Translation object for multilingual support
  const translations = {
    en: {
      comments: "Comments",
      noComments: "No comments yet",
      addComment: "Add a comment",
      post: "Post",
      commentAdded: "Comment added successfully",
      error: "Error adding comment",
      enterComment: "Please enter a comment"
    },
    ar: {
      comments: "التعليقات",
      noComments: "لا توجد تعليقات حتى الآن",
      addComment: "أضف تعليقًا",
      post: "نشر",
      commentAdded: "تمت إضافة التعليق بنجاح",
      error: "خطأ في إضافة التعليق",
      enterComment: "الرجاء إدخال تعليق"
    }
  };

  const t = translations[language as keyof typeof translations] || translations.en;
  
  const handleSubmit = async () => {
    if (!newComment.trim()) {
      toast.error(t.enterComment);
      return;
    }
    
    setIsSubmitting(true);
    console.log('Adding comment to task:', taskId);
    
    try {
      const success = await addTaskComment(
        taskId,
        newComment,
        user.id,
        user.name
      );
      
      if (success) {
        toast.success(t.commentAdded);
        console.log('Comment added successfully');
        
        // Add comment to local state
        const newCommentObj = {
          id: Date.now().toString(), // This will be replaced by the actual UUID on the backend
          userId: user.id,
          userName: user.name,
          text: newComment,
          createdAt: new Date().toISOString()
        };
        
        const updatedComments = [...comments, newCommentObj];
        onCommentAdded(updatedComments);
        setNewComment('');
      } else {
        console.error('Failed to add comment');
        toast.error(t.error);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error(t.error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <h3 className="font-medium">{t.comments}</h3>
      
      <div className="space-y-4">
        {/* Comment input */}
        <div className="space-y-2">
          <Textarea
            placeholder={t.addComment}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !newComment.trim()}
              size="sm"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  {t.post}
                </>
              ) : (
                t.post
              )}
            </Button>
          </div>
        </div>
        
        {/* Comments list */}
        <div className="space-y-3">
          {comments && comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="border rounded-lg p-3 space-y-1">
                <div className="flex justify-between">
                  <span className="font-medium text-sm">{comment.userName}</span>
                  <span className="text-xs text-gray-500">
                    {format(new Date(comment.createdAt), "MMM d, yyyy h:mm a")}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-line break-words p-2 sm:p-0" style={{ wordBreak: 'break-word' }}>{comment.text}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-2 text-gray-500 text-sm">
              {t.noComments}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskComments;
