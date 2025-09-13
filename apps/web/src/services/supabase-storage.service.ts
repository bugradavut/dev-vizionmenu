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
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 KB';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}