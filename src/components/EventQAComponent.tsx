import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquare, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  User, 
  Clock, 
  CheckCircle,
  AlertCircle,
  GripVertical,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { eventService, EventQA, CreateEventQAData, UpdateEventQAData } from '@/services/eventService';
import { playNotificationSound } from '@/lib/notifications';

interface EventQAComponentProps {
  eventId: string;
  eventTitle: string;
  qa: EventQA[];
  onQAUpdate: (updatedQA: EventQA[]) => void;
  isViewOnly?: boolean;
}

const EventQAComponent: React.FC<EventQAComponentProps> = ({
  eventId,
  eventTitle,
  qa,
  onQAUpdate,
  isViewOnly = false
}) => {
  const { user } = useAuth();
  const [localQA, setLocalQA] = useState<EventQA[]>(qa);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQA, setEditingQA] = useState<EventQA | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnswering, setIsAnswering] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  // Form state
  const [questionForm, setQuestionForm] = useState({
    question: '',
    answer: ''
  });

  // Update local state when props change
  useEffect(() => {
    setLocalQA(qa);
  }, [qa]);

  // Check permissions
  const canEditQA = user && (user.role === 'admin' || user.role === 'content_creative_manager' || user.position === 'Media Buyer' || user.position === 'Content Creator');
  const canCreateQuestion = user && !isViewOnly;

  // Toggle question expansion
  const toggleQuestionExpansion = (questionId: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleCreateQuestion = () => {
    if (!canCreateQuestion) {
      toast.error('You do not have permission to create questions');
      return;
    }
    
    setEditingQA(null);
    setQuestionForm({ question: '', answer: '' });
    setShowQuestionForm(true);
  };

  const handleEditQuestion = (qaItem: EventQA) => {
    if (!user) return;
    
    // Check if user can edit this Q&A
    const canEdit = user.role === 'admin' || 
                   user.role === 'content_creative_manager' ||
                   user.position === 'Media Buyer' || 
                   user.position === 'Content Creator' ||
                   (qaItem.created_by === user.id && !qaItem.answer);

    if (!canEdit) {
      toast.error('You do not have permission to edit this question');
      return;
    }

    setEditingQA(qaItem);
    setQuestionForm({
      question: qaItem.question,
      answer: qaItem.answer || ''
    });
    setShowQuestionForm(true);
  };

  const handleAnswerQuestion = (qaItem: EventQA) => {
    if (!canEditQA) {
      toast.error('You do not have permission to answer questions');
      return;
    }

    setIsAnswering(qaItem.id);
    setQuestionForm({
      question: qaItem.question,
      answer: qaItem.answer || ''
    });
  };

  const handleSubmitQA = async (e: React.FormEvent) => {
    // Note: preventDefault and stopPropagation are now handled in the form onSubmit
    
    if (!user || !questionForm.question.trim()) {
      toast.error('Please enter a question');
      return;
    }

    setIsLoading(true);
    try {
      let updatedQA: EventQA;

      if (editingQA) {
        // Update existing Q&A
        const updates: UpdateEventQAData = {
          question: questionForm.question.trim(),
        };
        
        if (questionForm.answer.trim()) {
          updates.answer = questionForm.answer.trim();
        }

        updatedQA = await eventService.updateEventQA(editingQA.id, updates);
        
        // Update local state
        const newQA = localQA.map(qa => qa.id === editingQA.id ? updatedQA : qa);
        setLocalQA(newQA);
        onQAUpdate(newQA);
        
        toast.success(questionForm.answer.trim() ? 'Question answered successfully' : 'Question updated successfully');
      } else {
        // Create new question (with optional answer)
        const qaData: CreateEventQAData = {
          event_id: eventId,
          question: questionForm.question.trim()
        };

        // Add answer if provided and user can edit QA
        if (questionForm.answer.trim() && canEditQA) {
          qaData.answer = questionForm.answer.trim();
        }

        // Create the question (with answer if provided)
        updatedQA = await eventService.createEventQA(qaData);
        
        // Update local state
        const newQA = [...localQA, updatedQA];
        setLocalQA(newQA);
        onQAUpdate(newQA);
        
        toast.success(questionForm.answer.trim() ? 'Question and answer added successfully' : 'Question added successfully');
      }

      setShowQuestionForm(false);
      setEditingQA(null);
      setQuestionForm({ question: '', answer: '' });
      playNotificationSound();
    } catch (error) {
      console.error('Error saving Q&A:', error);
      toast.error('Error saving Q&A');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = async (qaId: string) => {
    if (!canEditQA || !questionForm.answer.trim()) {
      toast.error('Please enter an answer');
      return;
    }

    setIsLoading(true);
    try {
      const updatedQA = await eventService.updateEventQA(qaId, {
        answer: questionForm.answer.trim()
      });

      // Update local state
      const newQA = localQA.map(qa => qa.id === qaId ? updatedQA : qa);
      setLocalQA(newQA);
      onQAUpdate(newQA);
      
      setIsAnswering(null);
      setQuestionForm({ question: '', answer: '' });
      toast.success('Answer added successfully');
      playNotificationSound();
    } catch (error) {
      console.error('Error saving answer:', error);
      toast.error('Error saving answer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteQA = async (qaItem: EventQA) => {
    if (!user) {
      toast.error('You must be logged in to delete questions');
      return;
    }
    
    const canDelete = user.role === 'admin' || 
                     user.position === 'Media Buyer' ||
                     user.position === 'Content Creator' ||
                     (qaItem.created_by === user.id && !qaItem.answer);

    if (!canDelete) {
      toast.error('You do not have permission to delete this question');
      return;
    }

    const confirmMessage = `Are you sure you want to delete this question?\n\n"${qaItem.question.substring(0, 100)}${qaItem.question.length > 100 ? '...' : ''}"\n\nThis action cannot be undone.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setIsLoading(true);
    try {
      console.log('🗑️ Deleting Q&A:', { id: qaItem.id, question: qaItem.question });
      
      await eventService.deleteEventQA(qaItem.id);
      
      // Update local state
      const newQA = localQA.filter(qa => qa.id !== qaItem.id);
      setLocalQA(newQA);
      onQAUpdate(newQA);
      
      toast.success('Question deleted successfully');
      playNotificationSound();
    } catch (error) {
      console.error('❌ Error deleting Q&A:', error);
      
      // Extract the most specific error message
      let errorMessage = 'Unknown error occurred';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        // Handle Supabase error objects
        if ('message' in error) {
          errorMessage = error.message as string;
        } else if ('error_description' in error) {
          errorMessage = error.error_description as string;
        } else if ('details' in error) {
          errorMessage = error.details as string;
        }
      }
      
      toast.error(`Failed to delete question: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Questions & Answers</h3>
          <Badge variant="secondary">{localQA.length}</Badge>
        </div>
        
        {canCreateQuestion && (
          <Button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCreateQuestion();
            }} 
            size="sm"
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        )}
      </div>

      {/* Q&A List */}
      <div className="space-y-4">
        {localQA.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No questions yet</p>
              {canCreateQuestion && (
                <p className="text-sm">Be the first to ask a question about this event!</p>
              )}
            </CardContent>
          </Card>
        ) : (
          localQA.map((qaItem, index) => (
            <Card key={qaItem.id} className="relative overflow-hidden">
              <CardContent className="p-3 sm:p-4">
                {/* Question */}
                <div className="space-y-3">
                  <div 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 p-2 rounded-lg transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (qaItem.answer) {
                        toggleQuestionExpansion(qaItem.id);
                      }
                    }}
                  >
                    <div className="space-y-2">
                      {/* Header with badges and actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {qaItem.answer ? (
                            expandedQuestions.has(qaItem.id) ? (
                              <ChevronDown className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            )
                          ) : (
                            <MessageSquare className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          )}
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            Q{index + 1}
                          </Badge>
                          {qaItem.answer && (
                            <Badge variant="default" className="text-xs bg-green-600 flex-shrink-0">
                              Answered
                            </Badge>
                          )}
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {user && (
                            <>
                              {(user.role === 'admin' || 
                                user.position === 'Media Buyer' || 
                                user.position === 'Content Creator' ||
                                (qaItem.created_by === user.id && !qaItem.answer)) && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleEditQuestion(qaItem);
                                  }}
                                  disabled={isLoading}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {(user.role === 'admin' || 
                                user.position === 'Media Buyer' ||
                                user.position === 'Content Creator' ||
                                (qaItem.created_by === user.id && !qaItem.answer)) && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDeleteQA(qaItem);
                                  }}
                                  disabled={isLoading}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Creator and date info */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>by {qaItem.creator_name || 'Unknown'}</span>
                        <span>•</span>
                        <span>{formatDate(qaItem.created_at)}</span>
                      </div>
                      
                      {/* Question text */}
                      <p className="font-medium text-sm sm:text-base break-words text-right" dir="rtl" style={{ textAlign: 'right', direction: 'rtl' }}>{qaItem.question}</p>
                      
                      {/* Click hint for answered questions */}
                      {qaItem.answer && !expandedQuestions.has(qaItem.id) && (
                        <p className="text-xs text-muted-foreground">
                          👆 Click to view answer
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Answer Section - Only show if expanded or no answer exists */}
                  {(expandedQuestions.has(qaItem.id) || !qaItem.answer) && (
                    <>
                      <Separator />

                      {/* Answer */}
                      {qaItem.answer ? (
                        <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            <Badge variant="default" className="text-xs bg-green-600 flex-shrink-0">
                              Answer
                            </Badge>
                            {qaItem.answerer_name && (
                              <span className="text-xs text-muted-foreground">
                                by {qaItem.answerer_name}
                              </span>
                            )}
                            {qaItem.answered_at && (
                              <span className="text-xs text-muted-foreground">
                                {formatDate(qaItem.answered_at)}
                              </span>
                            )}
                          </div>
                          <p className="text-sm break-words whitespace-pre-wrap text-right" dir="rtl" style={{ textAlign: 'right', direction: 'rtl' }}>{qaItem.answer}</p>
                        </div>
                      ) : (
                    <div className="space-y-3">
                      {isAnswering === qaItem.id ? (
                        // Answer form
                        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                          <div className="space-y-3">
                            <Label htmlFor={`answer-${qaItem.id}`} className="text-sm font-medium text-right block">إجابتك / Your Answer</Label>
                            <Textarea
                              id={`answer-${qaItem.id}`}
                              value={questionForm.answer}
                              onChange={(e) => setQuestionForm(prev => ({ ...prev, answer: e.target.value }))}
                              placeholder="اكتب إجابتك هنا... / Type your answer here..."
                              rows={3}
                              className="min-h-[80px] text-right dir-rtl"
                              dir="rtl"
                              style={{ textAlign: 'right', direction: 'rtl' }}
                            />
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleSubmitAnswer(qaItem.id);
                                }}
                                disabled={isLoading || !questionForm.answer.trim()}
                                className="w-full sm:w-auto"
                              >
                                <Check className="h-4 w-4 mr-2" />
                                {isLoading ? 'Submitting...' : 'Submit Answer'}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setIsAnswering(null);
                                  setQuestionForm({ question: '', answer: '' });
                                }}
                                className="w-full sm:w-auto"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Unanswered state
                        <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                              <span className="text-sm text-muted-foreground">
                                Waiting for answer...
                              </span>
                            </div>
                            {canEditQA && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleAnswerQuestion(qaItem);
                                }}
                                className="w-full sm:w-auto"
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Answer
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Inline Question Form */}
      {showQuestionForm && (
        <Card className="mt-4 border-2 border-blue-200 dark:border-blue-800">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm sm:text-base">
                {editingQA ? 'Edit Question' : (canEditQA ? 'Add New Question & Answer' : 'Add New Question')}
              </h4>
            </div>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSubmitQA(e);
              }} 
              className="space-y-4"
              onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSubmitQA(e);
                }
              }}
            >
              <div>
                <Label htmlFor="question" className="text-right block">السؤال / Question</Label>
                <Textarea
                  id="question"
                  value={questionForm.question}
                  onChange={(e) => setQuestionForm(prev => ({ ...prev, question: e.target.value }))}
                  placeholder="ما الذي تود معرفته عن هذا الحدث؟ / What would you like to know about this event?"
                  rows={3}
                  required
                  className="mt-2 text-right dir-rtl"
                  dir="rtl"
                  style={{ textAlign: 'right', direction: 'rtl' }}
                />
              </div>

              {(editingQA || (!editingQA && canEditQA)) && (
                <div>
                  <Label htmlFor="answer" className="text-right block">الإجابة (اختياري) / Answer (Optional)</Label>
                  <Textarea
                    id="answer"
                    value={questionForm.answer}
                    onChange={(e) => setQuestionForm(prev => ({ ...prev, answer: e.target.value }))}
                    placeholder="قدم إجابة على هذا السؤال... / Provide an answer to this question..."
                    rows={3}
                    className="mt-2 text-right dir-rtl"
                    dir="rtl"
                    style={{ textAlign: 'right', direction: 'rtl' }}
                  />
                  {!editingQA && (
                    <p className="text-xs text-muted-foreground mt-1 text-right" dir="rtl">
                      يمكنك إضافة السؤال والإجابة معاً، أو السؤال فقط والإجابة لاحقاً / You can add both question and answer at the same time, or just the question and answer it later.
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
                <Button 
                  type="submit" 
                  disabled={isLoading || !questionForm.question.trim()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSubmitQA(e);
                  }}
                  className="w-full sm:w-auto"
                >
                  {isLoading ? 'Saving...' : (editingQA ? 'Update' : (questionForm.answer.trim() ? 'Add Question & Answer' : 'Add Question'))}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent bubbling
                    setShowQuestionForm(false);
                    setEditingQA(null);
                    setQuestionForm({ question: '', answer: '' });
                  }}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EventQAComponent; 