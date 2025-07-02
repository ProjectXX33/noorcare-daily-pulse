import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from '@/contexts/AuthContext';
import { addTaskComment } from '@/lib/tasksApi';
import { supabase } from '@/lib/supabase';
import { toast } from "sonner";
import { User } from '@/types';
import { format } from "date-fns";

interface TaskComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

interface TaskCommentsProps {
  taskId: string;
  user: User;
  comments: TaskComment[];
  onCommentAdded: (comments: TaskComment[]) => void;
  language: string;
  isLocked?: boolean;
}

const TaskComments: React.FC<TaskCommentsProps> = ({ 
  taskId, 
  user,
  comments: initialComments,
  onCommentAdded,
  language,
  isLocked = false
}) => {
  const { user: authUser } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState<TaskComment[]>(initialComments);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionRef = useRef<any>(null);
  
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
  
  // Update comments when props change
  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  // Real-time comments with enhanced subscription and polling fallback
  useEffect(() => {
    console.log(`🔔 Setting up real-time comments for task ${taskId}`);
    
    // Function to fetch latest comments
    const fetchLatestComments = async () => {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('comments')
          .eq('id', taskId)
          .single();
        
        if (error) {
          console.error('Error fetching latest comments:', error);
          return;
        }
        
        if (data && data.comments) {
          const latestComments = data.comments as TaskComment[];
          // Only update if comments have actually changed
          if (JSON.stringify(latestComments) !== JSON.stringify(comments)) {
            console.log('📝 Comments updated:', latestComments.length);
            setComments(latestComments);
            onCommentAdded(latestComments);
          }
        }
      } catch (error) {
        console.error('Error in fetchLatestComments:', error);
      }
    };

    // Set up Supabase real-time subscription
    const setupSubscription = () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }

      subscriptionRef.current = supabase
        .channel(`task-comments-${taskId}`)
        .on('postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'tasks',
            filter: `id=eq.${taskId}`
          }, 
          (payload) => {
            console.log('🔄 Real-time task update received:', payload);
            if (payload.new && payload.new.comments) {
              const updatedComments = payload.new.comments as TaskComment[];
              console.log('📝 Setting comments from real-time:', updatedComments.length);
              setComments(updatedComments);
              onCommentAdded(updatedComments);
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Subscription status:', status);
        });
    };

    // Set up polling as fallback (every 5 seconds)
    const setupPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      intervalRef.current = setInterval(fetchLatestComments, 5000);
    };

    setupSubscription();
    setupPolling();

    // Cleanup
    return () => {
      console.log(`🧹 Cleaning up real-time comments for task ${taskId}`);
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [taskId, onCommentAdded]); // Removed comments dependency to prevent infinite re-subscriptions

  const handleSubmit = async () => {
    if (!newComment.trim()) {
      toast.error(t.enterComment);
      return;
    }
    
    setIsSubmitting(true);
    console.log('📝 Adding comment to task:', taskId);
    
    try {
      const success = await addTaskComment(
        taskId,
        newComment,
        authUser.id,
        authUser.name
      );
      
      if (success) {
        toast.success(t.commentAdded);
        console.log('✅ Comment added successfully');
        setNewComment('');
        
        // Force immediate refresh of comments
        setTimeout(async () => {
          try {
            const { data, error } = await supabase
              .from('tasks')
              .select('comments')
              .eq('id', taskId)
              .single();
            
            if (!error && data && data.comments) {
              const latestComments = data.comments as TaskComment[];
              setComments(latestComments);
              onCommentAdded(latestComments);
            }
          } catch (error) {
            console.error('Error refreshing comments after add:', error);
          }
        }, 500);
      } else {
        console.error('❌ Failed to add comment');
        toast.error(t.error);
      }
    } catch (error) {
      console.error('❌ Error adding comment:', error);
      toast.error(t.error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{t.comments}</h3>
        <div className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
          {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Comment input */}
        {!isLocked && (
          <div className="space-y-2">
            <Textarea
              placeholder={t.addComment}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              className="resize-none"
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
        )}
        
        {/* Comments list */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {comments && comments.length > 0 ? (
            comments
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) // Sort by newest first
              .map((comment) => (
                <div 
                  key={comment.id} 
                  className="border rounded-lg p-3 space-y-1 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-sm text-blue-600 dark:text-blue-400">
                      {comment.userName}
                    </span>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {format(new Date(comment.createdAt), "MMM d, yyyy h:mm a")}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-line break-words p-2 sm:p-0 bg-gray-50 dark:bg-gray-700 rounded px-2 py-1" 
                     style={{ wordBreak: 'break-word' }}>
                    {comment.text}
                  </p>
                </div>
              ))
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600">
              <div className="space-y-2">
                <div className="text-2xl">💬</div>
                <div>{t.noComments}</div>
                <div className="text-xs text-gray-400">Be the first to add a comment!</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskComments;
