// src/utils/dateUtils.ts
/**
 * Utility functions for date and time operations
 */

/**
 * Formats a date according to the specified format string
 * @param date The date to format
 * @param format Format string (e.g., 'YYYY-MM-DD', 'YYYY/MM/DD HH:mm:ss')
 * @returns Formatted date string
 */
export function formatDate(date: Date, format: string): string {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        console.warn('Invalid date provided to formatDate', date);
        return '';
    }

    const pad = (num: number): string => num.toString().padStart(2, '0');
    
    const replacements: Record<string, string> = {
        'YYYY': date.getFullYear().toString(),
        'MM': pad(date.getMonth() + 1),
        'DD': pad(date.getDate()),
        'HH': pad(date.getHours()),
        'mm': pad(date.getMinutes()),
        'ss': pad(date.getSeconds())
    };
    
    let result = format;
    for (const [key, value] of Object.entries(replacements)) {
        result = result.replace(new RegExp(key, 'g'), value);
    }
    
    return result;
}

/**
 * Parses a date string in YYYY-MM-DD format
 * @param dateStr Date string in YYYY-MM-DD format
 * @returns Date object or null if invalid
 */
export function parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    
    const year = parseInt(match[1]);
    const month = parseInt(match[2]) - 1; // JS months are 0-based
    const day = parseInt(match[3]);
    
    const date = new Date(year, month, day);
    
    // Validate date components (handles invalid dates like 2023-02-31)
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
        return null;
    }
    
    return date;
}

/**
 * Gets today's date in YYYY-MM-DD format
 */
export function getTodayFormatted(): string {
    return formatDate(new Date(), 'YYYY-MM-DD');
}