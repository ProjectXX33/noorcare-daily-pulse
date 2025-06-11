import { supabase } from './supabase';

export interface UploadResult {
  success: boolean;
  fileName?: string;
  publicUrl?: string;
  error?: string;
}

/**
 * Test storage connectivity and URL generation
 */
export const testStorage = async (): Promise<void> => {
  try {
    console.log('Testing storage connectivity...');
    
    // List files in attachments bucket
    const { data: files, error: listError } = await supabase.storage
      .from('attachments')
      .list('', { limit: 5 });
    
    if (listError) {
      console.error('Storage list error:', listError);
      return;
    }
    
    console.log('Files in attachments bucket:', files);
    
    // Test URL generation for first file
    if (files && files.length > 0) {
      const testFile = files[0];
      const { data: urlData } = supabase.storage
        .from('attachments')
        .getPublicUrl(testFile.name);
      
      console.log('Test URL generated:', urlData.publicUrl);
      
      // Try to fetch the URL
      try {
        const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
        console.log('URL accessibility test:', response.status, response.statusText);
      } catch (fetchError) {
        console.error('URL not accessible:', fetchError);
      }
    }
    
  } catch (error) {
    console.error('Storage test failed:', error);
  }
};

/**
 * Upload a file to the attachments bucket
 */
export const uploadFile = async (file: File, folder: string = 'visual-feeding'): Promise<UploadResult> => {
  try {
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    // Upload file to Supabase storage
    const { data, error } = await supabase.storage
      .from('attachments')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('attachments')
      .getPublicUrl(fileName);

    return {
      success: true,
      fileName,
      publicUrl: publicUrlData.publicUrl
    };

  } catch (error) {
    console.error('Upload service error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error'
    };
  }
};

/**
 * Delete a file from the attachments bucket
 */
export const deleteFile = async (fileName: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from('attachments')
      .remove([fileName]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete service error:', error);
    return false;
  }
};

/**
 * Get public URL for a file in the attachments bucket
 */
export const getFileUrl = (fileName: string): string => {
  // Try the standard public URL first
  const { data } = supabase.storage
    .from('attachments')
    .getPublicUrl(fileName);
  

  
  // Alternative: If you're having issues, you can try creating a signed URL instead
  // This creates a temporary URL that works even if the bucket isn't fully public
  // Uncomment the lines below if public URLs don't work:
  
  // const getSignedUrl = async () => {
  //   const { data: signedData, error } = await supabase.storage
  //     .from('attachments')
  //     .createSignedUrl(fileName, 60 * 60 * 24); // 24 hours
  //   
  //   if (error) {
  //     console.error('Signed URL error:', error);
  //     return data.publicUrl; // fallback to public URL
  //   }
  //   
  //   return signedData.signedUrl;
  // };
  
  return data.publicUrl;
};

/**
 * Check if a string is a valid image file
 */
export const isImageFile = (fileName: string): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const lowerFileName = fileName.toLowerCase();
  return imageExtensions.some(ext => lowerFileName.endsWith(ext));
}; 