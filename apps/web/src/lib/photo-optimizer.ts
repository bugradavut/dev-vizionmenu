/**
 * Photo Optimization Utility
 * Compresses and optimizes photos for menu items before upload
 * Reduces file size from ~3MB to 100-200KB using WebP compression
 */

export interface PhotoOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  format?: 'webp' | 'jpeg';
}

export interface OptimizedPhoto {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  dimensions: {
    width: number;
    height: number;
  };
}

/**
 * Optimize photo for menu item upload
 * Default settings: 800x600px, 80% quality, WebP format
 */
export async function optimizePhoto(
  file: File,
  options: PhotoOptimizationOptions = {}
): Promise<OptimizedPhoto> {
  const {
    maxWidth = 800,
    maxHeight = 600,
    quality = 0.8,
    format = 'webp'
  } = options;

  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      reject(new Error('File must be an image'));
      return;
    }

    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      const { width: newWidth, height: newHeight } = calculateDimensions(
        img.width,
        img.height,
        maxWidth,
        maxHeight
      );

      // Set canvas dimensions
      canvas.width = newWidth;
      canvas.height = newHeight;

      // Draw and compress image
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // Convert to optimized format
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }

          // Create optimized file
          const optimizedFile = new File(
            [blob],
            getOptimizedFileName(file.name, format),
            {
              type: format === 'webp' ? 'image/webp' : 'image/jpeg',
              lastModified: Date.now()
            }
          );

          const compressionRatio = (1 - blob.size / file.size) * 100;

          resolve({
            file: optimizedFile,
            originalSize: file.size,
            compressedSize: blob.size,
            compressionRatio,
            dimensions: {
              width: newWidth,
              height: newHeight
            }
          });
        },
        format === 'webp' ? 'image/webp' : 'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load image
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate new dimensions maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;

  let newWidth = originalWidth;
  let newHeight = originalHeight;

  // Scale down if exceeds max dimensions
  if (newWidth > maxWidth) {
    newWidth = maxWidth;
    newHeight = newWidth / aspectRatio;
  }

  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = newHeight * aspectRatio;
  }

  return {
    width: Math.round(newWidth),
    height: Math.round(newHeight)
  };
}

/**
 * Generate optimized file name
 */
function getOptimizedFileName(originalName: string, format: 'webp' | 'jpeg'): string {
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
  const timestamp = Date.now();
  return `${nameWithoutExt}_optimized_${timestamp}.${format}`;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate photo file before optimization
 */
export function validatePhotoFile(file: File): { isValid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: 'File must be an image' };
  }

  // Check file size (max 10MB before optimization)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size must be less than 10MB' };
  }

  // Check supported formats
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!supportedTypes.includes(file.type)) {
    return { isValid: false, error: 'Supported formats: JPEG, PNG, WebP' };
  }

  return { isValid: true };
}

/**
 * Preview optimization results
 */
export function getOptimizationPreview(original: File, optimized: OptimizedPhoto) {
  const savings = ((original.size - optimized.compressedSize) / original.size) * 100;
  
  return {
    originalSize: formatFileSize(original.size),
    compressedSize: formatFileSize(optimized.compressedSize),
    savings: Math.round(savings),
    dimensions: `${optimized.dimensions.width}x${optimized.dimensions.height}`,
    format: optimized.file.type
  };
}