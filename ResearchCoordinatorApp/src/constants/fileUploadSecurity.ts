/**
 * File Upload Security Constants
 * 
 * Comprehensive file type support for research collaboration while maintaining security.
 * Supports academic, scientific, statistical, and creative file formats.
 * 
 * Security Notes:
 * - Script files (Python, R, MATLAB, etc.) are allowed for research sharing
 * - These files should NEVER be executed automatically by the application
 * - Files are stored in isolated storage buckets with no execution permissions
 * - All files go through filename sanitization to prevent path traversal
 * - Size limits prevent DoS attacks
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
    'text/markdown',
    'application/rtf',
    'text/rtf',
    
    // Statistical & Data Science Files
    'application/x-sas', // SAS files
    'application/x-sas-data', // .sas7bdat
    'application/x-stata', // Stata files
    'application/x-stata-dta', // .dta files
    'application/x-spss', // SPSS files
    'application/x-spss-sav', // .sav files
    'text/x-r', // R scripts
    'text/x-r-source', // .R files
    'application/x-r-data', // .RData, .rda
    'text/x-matlab', // MATLAB scripts
    'application/matlab', // .mat files
    'text/x-python', // Python scripts
    'application/x-python-code', // .py files
    'application/x-ipynb+json', // Jupyter notebooks
    'text/x-julia', // Julia scripts
    'application/x-hdf', // HDF5 data files
    'application/x-netcdf', // NetCDF files
    
    // Programming & Scripts (for research)
    'text/x-c',
    'text/x-c++',
    'text/x-java',
    'text/javascript',
    'application/javascript',
    'text/x-sql',
    'application/sql',
    'text/x-latex',
    'application/x-latex',
    'application/x-tex',
    'text/x-bibtex',
    'text/html',
    'text/css',
    'application/xml',
    'text/xml',
    'application/x-yaml',
    'text/yaml',
    
    // Adobe Creative Suite
    'application/x-photoshop', // .psd
    'image/vnd.adobe.photoshop',
    'application/x-indesign', // .indd
    'application/x-illustrator', // .ai
    'application/postscript', // .eps, .ai
    'application/x-adobe-acrobat', // .pdf (Adobe specific)
    'application/vnd.adobe.aftereffects.project', // .aep
    'application/vnd.adobe.premiere.project', // .prproj
    'application/vnd.adobe.xd', // Adobe XD
    
    // Images (expanded)
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/tiff',
    'image/bmp',
    'image/x-icon',
    'image/heic',
    'image/heif',
    'image/raw', // RAW photo formats
    
    // Videos & Audio (for presentations/research)
    'video/mp4',
    'video/quicktime', // .mov
    'video/x-msvideo', // .avi
    'video/x-ms-wmv', // .wmv
    'video/webm',
    'audio/mpeg', // .mp3
    'audio/wav',
    'audio/x-wav',
    'audio/mp4',
    'audio/x-m4a',
    
    // Scientific & Medical formats
    'application/dicom', // Medical imaging
    'chemical/x-pdb', // Protein Data Bank
    'chemical/x-mol', // Molecular files
    'application/x-gzip', // Compressed research data
    'application/gzip',
    
    // CAD & 3D Models (for engineering research)
    'application/x-autocad', // .dwg
    'application/dxf', // .dxf
    'model/stl', // 3D printing
    'model/obj', // 3D models
    
    // Archives (expanded)
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/x-tar',
    'application/x-gtar',
    
    // Other research/academic formats
    'application/vnd.google-earth.kml+xml', // KML for geographic data
    'application/vnd.google-earth.kmz', // KMZ
    'application/x-endnote-library', // EndNote
    'application/x-bibtex', // BibTeX
    'application/x-research-info-systems', // RIS citation format
    'application/marc', // Library catalog records
    
    // Fallback for unrecognized types (with caution)
    'application/octet-stream' // Binary files
  ]
} as const;

// File extensions whitelist (as backup validation)
export const ALLOWED_EXTENSIONS = {
  PROFILE_PICTURE: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  PROJECT_FILE: [
    // Documents
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'json', 
    'md', 'rtf', 'odt', 'ods', 'odp',
    
    // Statistical & Data Science
    'sas', 'sas7bdat', 'sas7bcat', 'sd2', 'sd7', 'sas7bndx', 'sas7bpgm',
    'dta', 'do', 'ado', // Stata
    'sav', 'spv', 'sps', 'spss', // SPSS
    'r', 'R', 'rda', 'rdata', 'rds', 'Rproj', 'Rmd', 'Rnw', // R
    'm', 'mat', 'mlx', 'mex', 'fig', 'mdl', 'slx', // MATLAB
    'py', 'ipynb', 'pyc', 'pyo', 'pyw', 'pyx', 'pyd', // Python
    'jl', // Julia
    'h5', 'hdf5', 'he5', // HDF5
    'nc', 'nc4', 'netcdf', // NetCDF
    
    // Programming & Scripts
    'c', 'cpp', 'cc', 'cxx', 'h', 'hpp', 'hxx',
    'java', 'class', 'jar',
    'js', 'jsx', 'ts', 'tsx', 'mjs',
    'sql', 'sqlite', 'db',
    'tex', 'latex', 'bib', 'cls', 'sty', 'bst',
    'html', 'htm', 'css', 'scss', 'sass', 'less',
    'xml', 'xsl', 'xslt', 'xsd',
    'yaml', 'yml',
    'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd',
    
    // Adobe Creative Suite
    'psd', 'psb', // Photoshop
    'ai', 'ait', 'eps', // Illustrator
    'indd', 'indt', 'indl', 'indb', 'inx', 'idml', // InDesign
    'aep', 'aepx', 'aet', // After Effects
    'prproj', 'ppj', // Premiere Pro
    'xd', // Adobe XD
    'fla', 'swf', // Flash/Animate
    
    // Images
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'tiff', 'tif', 'bmp', 
    'ico', 'heic', 'heif', 'raw', 'cr2', 'nef', 'arw', 'dng', 'orf',
    
    // Videos & Audio
    'mp4', 'mov', 'avi', 'wmv', 'flv', 'webm', 'mkv', 'mpg', 'mpeg',
    'mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'wma', 'aiff', 'ape',
    
    // Scientific & Medical
    'dcm', 'dicom', // Medical imaging
    'pdb', 'mol', 'mol2', 'sdf', // Chemistry
    'fasta', 'fastq', 'sam', 'bam', 'vcf', // Bioinformatics
    'fits', 'fit', // Astronomy
    
    // CAD & 3D
    'dwg', 'dxf', 'dwf', // AutoCAD
    'stl', 'obj', 'fbx', 'dae', '3ds', 'ply', // 3D models
    'step', 'stp', 'iges', 'igs', // CAD exchange
    
    // GIS & Mapping
    'kml', 'kmz', 'gpx', 'shp', 'shx', 'dbf', 'prj', 'geojson',
    
    // Archives
    'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'tgz',
    
    // Other academic/research
    'ris', 'enw', 'bib', 'nbib', // Citations
    'mm', 'mmap', 'xmind', // Mind maps
    'vsd', 'vsdx', 'vdx', // Visio
    'one', 'onepkg', 'onetoc2', // OneNote
    
    // Data files
    'parquet', 'feather', 'arrow', 'avro', 'orc' // Big data formats
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