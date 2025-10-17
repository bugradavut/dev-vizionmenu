/**
 * Supabase Storage Service
 * Direct frontend-to-Supabase photo upload service
 * Bypasses backend multer middleware for optimized photos
 */

import { supabase } from '@/lib/supabase';

export interface UploadResult {
  url: string;
  path: string;
  size: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Upload template photo for chain templates
 */
export async function uploadTemplatePhoto(
  file: File,
  chainId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `chain-templates/${chainId}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('menu-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    if (!data?.path) {
      throw new Error('Upload completed but no path returned');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('menu-images')
      .getPublicUrl(data.path);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to generate public URL');
    }

    // Simulate progress for user feedback
    if (onProgress) {
      onProgress({ loaded: file.size, total: file.size, percentage: 100 });
    }

    return {
      url: urlData.publicUrl,
      path: data.path,
      size: file.size
    };

  } catch (error) {
    console.error('Template photo upload failed:', error);
    throw error instanceof Error ? error : new Error('Upload failed');
  }
}

/**
 * Upload optimized photo directly to Supabase Storage
 */
export async function uploadMenuItemPhoto(
  file: File,
  branchId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `menu-items/${branchId}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('menu-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    if (!data?.path) {
      throw new Error('Upload completed but no path returned');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('menu-images')
      .getPublicUrl(data.path);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to generate public URL');
    }

    // Simulate progress for user feedback
    if (onProgress) {
      onProgress({ loaded: file.size, total: file.size, percentage: 100 });
    }

    return {
      url: urlData.publicUrl,
      path: data.path,
      size: file.size
    };

  } catch (error) {
    console.error('Photo upload failed:', error);
    throw error instanceof Error ? error : new Error('Upload failed');
  }
}

/**
 * Delete photo from Supabase Storage
 */
export async function deleteMenuItemPhoto(path: string): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from('menu-images')
      .remove([path]);

    if (error) {
      console.error('Photo deletion failed:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }
  } catch (error) {
    console.error('Photo deletion error:', error);
    throw error instanceof Error ? error : new Error('Delete failed');
  }
}

/**
 * Replace existing photo (delete old, upload new)
 */
export async function replaceMenuItemPhoto(
  oldPath: string,
  newFile: File,
  branchId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    // Upload new photo first
    const uploadResult = await uploadMenuItemPhoto(newFile, branchId, onProgress);

    // Delete old photo after successful upload
    try {
      await deleteMenuItemPhoto(oldPath);
    } catch (deleteError) {
      console.warn('Failed to delete old photo:', deleteError);
      // Don't fail the operation if old photo deletion fails
    }

    return uploadResult;
  } catch (error) {
    console.error('Photo replacement failed:', error);
    throw error instanceof Error ? error : new Error('Replace failed');
  }
}

/**
 * Get storage usage for branch
 */
export async function getBranchStorageUsage(branchId: string): Promise<{
  totalFiles: number;
  totalSize: number;
  formattedSize: string;
}> {
  try {
    const { data: files, error } = await supabase.storage
      .from('menu-images')
      .list(`menu-items/${branchId}`, {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error('Storage usage check failed:', error);
      return { totalFiles: 0, totalSize: 0, formattedSize: '0 KB' };
    }

    const totalFiles = files?.length || 0;
    const totalSize = files?.reduce((sum, file) => sum + (file.metadata?.size || 0), 0) || 0;

    return {
      totalFiles,
      totalSize,
      formattedSize: formatFileSize(totalSize)
    };
  } catch (error) {
    console.error('Storage usage error:', error);
    return { totalFiles: 0, totalSize: 0, formattedSize: '0 KB' };
  }
}

/**
 * Copy template image to branch storage during import
 */
export async function copyTemplateImageToBranch(
  templateImageUrl: string,
  branchId: string
): Promise<UploadResult | null> {
  try {
    // Extract path from template image URL
    const urlParts = templateImageUrl.split('/storage/v1/object/public/menu-images/');
    if (urlParts.length !== 2) {
      console.warn('Invalid template image URL format:', templateImageUrl);
      return null;
    }

    const templatePath = urlParts[1];

    // Download the template image
    const { data: imageData, error: downloadError } = await supabase.storage
      .from('menu-images')
      .download(templatePath);

    if (downloadError || !imageData) {
      console.error('Failed to download template image:', downloadError);
      return null;
    }

    // Generate new file path for branch
    const originalFileName = templatePath.split('/').pop() || 'template-image';
    const fileExt = originalFileName.split('.').pop();
    const newFileName = `imported_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const branchPath = `menu-items/${branchId}/${newFileName}`;

    // Upload to branch storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(branchPath, imageData, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError || !uploadData?.path) {
      console.error('Failed to upload copied image:', uploadError);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('menu-images')
      .getPublicUrl(uploadData.path);

    if (!urlData?.publicUrl) {
      console.error('Failed to generate public URL for copied image');
      return null;
    }

    return {
      url: urlData.publicUrl,
      path: uploadData.path,
      size: imageData.size
    };

  } catch (error) {
    console.error('Template image copy failed:', error);
    return null;
  }
}

/**
 * Check if storage bucket is accessible
 */
export async function checkStorageAccess(): Promise<{ accessible: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from('menu-images')
      .list('', { limit: 1 });

    if (error) {
      return { accessible: false, error: error.message };
    }

    return { accessible: true };
  } catch (error) {
    return {
      accessible: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Upload branch banner image
 * Optimized for hero banners (1920x1080)
 */
export async function uploadBranchBanner(
  file: File,
  branchId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    // Generate file path (always webp after optimization)
    const fileName = `banner_${Date.now()}.webp`;
    const filePath = `branch-banners/${branchId}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('menu-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // Replace existing banner
      });

    if (error) {
      console.error('Banner upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    if (!data?.path) {
      throw new Error('Upload completed but no path returned');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('menu-images')
      .getPublicUrl(data.path);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to generate public URL');
    }

    // Progress feedback
    if (onProgress) {
      onProgress({ loaded: file.size, total: file.size, percentage: 100 });
    }

    return {
      url: urlData.publicUrl,
      path: data.path,
      size: file.size
    };

  } catch (error) {
    console.error('Branch banner upload failed:', error);
    throw error instanceof Error ? error : new Error('Upload failed');
  }
}

/**
 * Delete branch banner image
 */
export async function deleteBranchBanner(path: string): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from('menu-images')
      .remove([path]);

    if (error) {
      console.error('Banner deletion failed:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }
  } catch (error) {
    console.error('Banner deletion error:', error);
    throw error instanceof Error ? error : new Error('Delete failed');
  }
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 KB';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}