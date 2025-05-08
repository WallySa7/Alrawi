// src/utils/fileUtils.ts
/**
 * Utility functions for file operations
 */

/**
 * Sanitizes a filename, removing invalid characters and truncating if needed
 * @param name Raw filename
 * @param maxLength Maximum allowed length
 * @returns Sanitized filename
 */
export function sanitizeFileName(name: string, maxLength = 100): string {
    if (!name) {
        return `file-${new Date().getTime()}`;
    }
    
    // Remove invalid file characters
    const invalidChars = /[*"\\/<>:|?]/g;
    let sanitized = name.replace(invalidChars, '');
    
    // Clean up whitespace
    sanitized = sanitized.trim();
    sanitized = sanitized.replace(/\s+/g, ' ');
    
    // Truncate if too long
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }
    
    // Ensure we have a valid name
    if (!sanitized) {
        sanitized = `file-${new Date().getTime()}`;
    }
    
    return sanitized;
}

/**
 * Creates a path with proper separators
 * @param segments Path segments to join
 */
export function createPath(...segments: string[]): string {
    return segments
        .filter(segment => segment) // Remove empty segments
        .join('/');
}