/**
 * File Upload Security Constants
 * Critical security settings to prevent malicious file uploads
 */

// Maximum file sizes (in bytes)
export const MAX_FILE_SIZES = {
  PROFILE_PICTURE: 50 * 1024 * 1024,    // 5MB for profile pictures
  PROJECT_FILE: 50 * 1024 * 1024,      // 50MB for project files
  DEFAULT: 10 * 1024 * 1024            // 10MB default
} as const;

// Allowed MIME types for different upload contexts
export const ALLOWED_MIME_TYPES = {
  PROFILE_PICTURE: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ],
  PROJECT_FILE: [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'text/plain',
    'text/csv',
    'application/json',
    
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    
    // Videos (limited)
    'video/mp4',
    'video/quicktime', // .mov
    
    // Archives
    'application/zip',
    'application/x-zip-compressed'
  ]
} as const;

// File extensions whitelist (as backup validation)
export const ALLOWED_EXTENSIONS = {
  PROFILE_PICTURE: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  PROJECT_FILE: [
    // Documents
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'json',
    // Images
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
    // Videos
    'mp4', 'mov',
    // Archives
    'zip'
  ]
} as const;

// Blocked filename patterns (regex)
export const BLOCKED_FILENAME_PATTERNS = [
  /\.\./,                    // Path traversal
  /[<>:"|?*]/,              // Windows invalid characters
  /^\./, // Hidden files
  /\0/,                      // Null bytes
  /[^\x20-\x7E]/,           // Non-printable ASCII
] as const;

// Security error messages
export const FILE_SECURITY_ERRORS = {
  FILE_TOO_LARGE: 'File size exceeds maximum allowed limit',
  INVALID_FILE_TYPE: 'File type is not allowed',
  INVALID_FILENAME: 'Filename contains invalid characters',
  NO_FILE_EXTENSION: 'File must have a valid extension',
  BLOCKED_EXTENSION: 'This file extension is not allowed',
  UPLOAD_FAILED: 'File upload failed for security reasons'
} as const;

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  // Remove any path components
  let sanitized = filename.split(/[/\\]/).pop() || 'unnamed';
  
  // Replace spaces with underscores
  sanitized = sanitized.replace(/\s+/g, '_');
  
  // Remove special characters but keep dots and common chars
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '');
  
  // Ensure it doesn't start with a dot (hidden file)
  if (sanitized.startsWith('.')) {
    sanitized = sanitized.substring(1);
  }
  
  // Limit length
  const maxLength = 255;
  if (sanitized.length > maxLength) {
    const ext = sanitized.split('.').pop();
    const base = sanitized.substring(0, maxLength - (ext?.length || 0) - 1);
    sanitized = ext ? `${base}.${ext}` : base;
  }
  
  // Ensure we have a filename
  if (!sanitized || sanitized === '') {
    sanitized = 'unnamed_file';
  }
  
  return sanitized;
}

/**
 * Validate file for upload
 */
export function validateFile(
  file: { name?: string; size?: number; type?: string },
  context: 'PROFILE_PICTURE' | 'PROJECT_FILE' = 'PROJECT_FILE'
): { valid: boolean; error?: string } {
  // Check file size
  const maxSize = MAX_FILE_SIZES[context];
  if (file.size && file.size > maxSize) {
    return {
      valid: false,
      error: `${FILE_SECURITY_ERRORS.FILE_TOO_LARGE} (${Math.round(maxSize / 1024 / 1024)}MB)`
    };
  }
  
  // Check MIME type
  const allowedTypes = ALLOWED_MIME_TYPES[context];
  if (file.type && !allowedTypes.includes(file.type as any)) {
    return {
      valid: false,
      error: FILE_SECURITY_ERRORS.INVALID_FILE_TYPE
    };
  }
  
  // Check file extension
  if (file.name) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ALLOWED_EXTENSIONS[context];
    
    if (!extension) {
      return {
        valid: false,
        error: FILE_SECURITY_ERRORS.NO_FILE_EXTENSION
      };
    }
    
    if (!allowedExtensions.includes(extension as any)) {
      return {
        valid: false,
        error: FILE_SECURITY_ERRORS.BLOCKED_EXTENSION
      };
    }
    
    // Check for blocked patterns
    for (const pattern of BLOCKED_FILENAME_PATTERNS) {
      if (pattern.test(file.name)) {
        return {
          valid: false,
          error: FILE_SECURITY_ERRORS.INVALID_FILENAME
        };
      }
    }
  }
  
  return { valid: true };
}