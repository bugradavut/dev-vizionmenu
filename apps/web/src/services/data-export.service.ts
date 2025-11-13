// =====================================================
// DATA EXPORT SERVICE
// FO-120: Frontend service for data export
// =====================================================

import { supabase } from '@/lib/supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Export branch data as ZIP file
 * @returns {Promise<Blob>} ZIP file blob
 */
export async function exportBranchData(): Promise<Blob> {
  // Get session from Supabase
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Authentication session not found. Please login again.');
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/data-export`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Export failed: ${response.status} ${response.statusText}`
    );
  }

  // Get the blob from response
  const blob = await response.blob();
  return blob;
}

/**
 * Download blob as file
 * @param {Blob} blob - File blob
 * @param {string} filename - Filename
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Export and download branch data
 * @returns {Promise<void>}
 */
export async function exportAndDownloadData(): Promise<void> {
  try {
    console.log('[Data Export] Starting export...');

    const blob = await exportBranchData();

    // Generate filename with current date
    const date = new Date().toISOString().split('T')[0];
    const filename = `branch-data-export-${date}.zip`;

    downloadBlob(blob, filename);

    console.log('[Data Export] Export completed successfully');
  } catch (error) {
    console.error('[Data Export] Export failed:', error);
    throw error;
  }
}

export const dataExportService = {
  exportBranchData,
  downloadBlob,
  exportAndDownloadData,
};
