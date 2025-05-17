
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// Upload file to storage and create attachment record
export const uploadTaskAttachment = async (
  taskId: string, 
  file: File,
  userId: string
): Promise<{ id: string; fileName: string; filePath: string; fileType: string } | null> => {
  try {
    console.log('Starting file upload process for task:', taskId);
    
    // Generate a unique path for the file
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${userId}/${taskId}/${fileName}`;

    console.log('Generated file path:', filePath);

    // First check if the task-attachments bucket exists, if not create it
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === 'task-attachments');
    
    if (!bucketExists) {
      console.log('Creating task-attachments bucket');
      const { error: bucketError } = await supabase.storage.createBucket('task-attachments', {
        public: false,
        fileSizeLimit: 10485760, // 10MB
      });
      
      if (bucketError) {
        console.error('Error creating bucket:', bucketError);
        throw bucketError;
      }
    }

    // Upload the file to storage
    console.log('Uploading file to storage...');
    const { error: uploadError } = await supabase.storage
      .from('task-attachments')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw uploadError;
    }

    console.log('File uploaded successfully, creating database record');
    
    // Create an attachment record in the database
    const { data: attachment, error: dbError } = await supabase
      .from('task_attachments')
      .insert({
        task_id: taskId,
        file_path: filePath,
        file_name: file.name,
        file_type: file.type,
        created_by: userId
      })
      .select('*')
      .single();

    if (dbError) {
      console.error('Error creating attachment record:', dbError);
      throw dbError;
    }

    console.log('Attachment record created:', attachment);

    return {
      id: attachment.id,
      fileName: attachment.file_name,
      filePath: attachment.file_path,
      fileType: attachment.file_type
    };
  } catch (error) {
    console.error('Error in uploadTaskAttachment:', error);
    return null;
  }
};

// Get all attachments for a task
export const getTaskAttachments = async (taskId: string) => {
  try {
    const { data, error } = await supabase
      .from('task_attachments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching task attachments:', error);
      throw error;
    }

    // Get URLs for the files
    const attachmentsWithUrls = await Promise.all(
      data.map(async (attachment) => {
        const { data: urlData } = await supabase.storage
          .from('task-attachments')
          .createSignedUrl(attachment.file_path, 60 * 60); // Valid for 1 hour

        return {
          ...attachment,
          url: urlData?.signedUrl
        };
      })
    );

    return attachmentsWithUrls;
  } catch (error) {
    console.error('Error in getTaskAttachments:', error);
    return [];
  }
};

// Delete a task attachment
export const deleteTaskAttachment = async (attachmentId: string, filePath: string) => {
  try {
    // Delete the file from storage
    const { error: storageError } = await supabase.storage
      .from('task-attachments')
      .remove([filePath]);

    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
      throw storageError;
    }

    // Delete the attachment record
    const { error: dbError } = await supabase
      .from('task_attachments')
      .delete()
      .eq('id', attachmentId);

    if (dbError) {
      console.error('Error deleting attachment record:', dbError);
      throw dbError;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteTaskAttachment:', error);
    return false;
  }
};
