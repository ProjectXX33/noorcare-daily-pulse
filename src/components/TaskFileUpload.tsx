
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, X, FileIcon, FilePlus } from "lucide-react";
import { uploadTaskAttachment } from '@/lib/taskAttachmentsApi';

interface TaskFileUploadProps {
  taskId: string;
  userId: string;
  onUploadComplete: () => void;
  language: string;
}

const TaskFileUpload: React.FC<TaskFileUploadProps> = ({ 
  taskId, 
  userId,
  onUploadComplete,
  language 
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Translation object for multilingual support
  const translations = {
    en: {
      dragDrop: "Drag and drop file here or click to browse",
      fileSelected: "File selected",
      upload: "Upload",
      cancel: "Cancel",
      uploading: "Uploading...",
      fileUploaded: "File uploaded successfully!",
      fileUploadFailed: "Failed to upload file",
      maxSize: "File size must be less than 5MB"
    },
    ar: {
      dragDrop: "اسحب وأفلت الملف هنا أو انقر للاستعراض",
      fileSelected: "تم تحديد الملف",
      upload: "رفع",
      cancel: "إلغاء",
      uploading: "جاري الرفع...",
      fileUploaded: "تم رفع الملف بنجاح!",
      fileUploadFailed: "فشل في رفع الملف",
      maxSize: "يجب أن يكون حجم الملف أقل من 5 ميجابايت"
    }
  };

  const t = translations[language as keyof typeof translations] || translations.en;
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t.maxSize);
        return;
      }
      
      setSelectedFile(file);
    }
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t.maxSize);
        return;
      }
      
      setSelectedFile(file);
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  
  const handleUpload = async () => {
    if (!selectedFile || !taskId || !userId) return;
    
    setIsUploading(true);
    console.log('Starting upload with:', { taskId, userId, fileName: selectedFile.name });
    
    try {
      const result = await uploadTaskAttachment(taskId, selectedFile, userId);
      
      if (result) {
        toast.success(t.fileUploaded);
        console.log('Upload successful:', result);
        setSelectedFile(null);
        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        console.error('Upload returned null result');
        toast.error(t.fileUploadFailed);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(t.fileUploadFailed);
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      {!selectedFile ? (
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
          onClick={() => document.getElementById('file-upload')?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <input
            id="file-upload"
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">{t.dragDrop}</p>
        </div>
      ) : (
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileIcon className="h-6 w-6 text-blue-500 mr-2" />
              <div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedFile(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex justify-end mt-4 gap-2">
            <Button
              variant="outline"
              disabled={isUploading}
              onClick={() => setSelectedFile(null)}
            >
              {t.cancel}
            </Button>
            <Button
              disabled={isUploading}
              onClick={handleUpload}
              className="relative"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  {t.uploading}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t.upload}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskFileUpload;
