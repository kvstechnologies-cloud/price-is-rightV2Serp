/**
 * File type detection utility for the audit system (JavaScript version)
 * Maps MIME types and filenames to display-friendly type names
 */

function getDisplayType(mimeType, filename) {
  const mt = (mimeType || '').toLowerCase();
  const name = (filename || '').toLowerCase();

  // Excel MIME types - all should map to 'Excel'
  const excelMimes = new Set([
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // old .xls
    'application/vnd.ms-excel.sheet.macroenabled.12' // .xlsm
  ]);

  if (excelMimes.has(mt)) return 'Excel';
  
  // Handle octet-stream with specific file extensions
  if (mt === 'application/octet-stream') {
    if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.xlsm')) {
      return 'Excel';
    }
    if (name.endsWith('.csv')) {
      return 'CSV';
    }
    if (/\.(png|jpe?g|gif|webp|bmp|tiff)$/i.test(name)) {
      return 'Image';
    }
    // For octet-stream with unrecognized extensions, return Unknown
    return 'Unknown';
  }
  
  // CSV files
  if (mt === 'text/csv' || name.endsWith('.csv')) return 'CSV';
  
  // Image files
  if (mt.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|tiff)$/i.test(name)) return 'Image';
  
  // Excel files by extension (fallback for when MIME type is missing or generic)
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.xlsm')) return 'Excel';
  
  // PDF files
  if (mt === 'application/pdf' || name.endsWith('.pdf')) return 'PDF';
  
  // Text files (but not if it has other specific extensions)
  if (mt.startsWith('text/') && !name.match(/\.(xlsx?|xlsm|csv|png|jpe?g|gif|webp|bmp|tiff|pdf)$/i)) return 'Text';
  if (name.endsWith('.txt')) return 'Text';
  
  // Word documents
  if (mt === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx')) {
    return 'Word';
  }
  if (mt === 'application/msword' || name.endsWith('.doc')) {
    return 'Word';
  }
  
  // PowerPoint
  if (mt === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || name.endsWith('.pptx')) {
    return 'PowerPoint';
  }
  if (mt === 'application/vnd.ms-powerpoint' || name.endsWith('.ppt')) {
    return 'PowerPoint';
  }

  return 'Unknown';
}

/**
 * Determine job type based on file type (for backward compatibility)
 */
function determineJobType(mimeType, filename) {
  const displayType = getDisplayType(mimeType, filename);
  
  switch (displayType) {
    case 'Excel':
      return 'EXCEL';
    case 'CSV':
      return 'CSV';
    case 'Image':
      return 'IMAGE';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Get file type for database storage (maps to schema enum)
 */
function getFileTypeForDB(mimeType, filename) {
  const jobType = determineJobType(mimeType, filename);
  
  switch (jobType) {
    case 'EXCEL':
      return 'xlsx';
    case 'CSV':
      return 'csv';
    case 'IMAGE':
      return 'image';
    default:
      // Default to xlsx for unknown types to satisfy DB constraint
      return 'xlsx';
  }
}

module.exports = {
  getDisplayType,
  determineJobType,
  getFileTypeForDB
};
