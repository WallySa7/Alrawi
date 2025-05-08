// src/utils/arrayUtils.ts
/**
 * Utility functions for array operations
 */

/**
 * Returns unique values from an array
 * @param array Input array
 * @returns New array with unique values
 */
export function uniqueValues<T>(array: T[]): T[] {
    if (!array || !Array.isArray(array)) return [];
    return [...new Set(array)];
}

/**
 * Groups array items by a key
 * @param array Array to group
 * @param keyFn Function to extract the key from each item
 * @returns Object with keys grouped by the keyFn result
 */
export function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
    if (!array || !Array.isArray(array)) return {};
    
    return array.reduce((result, item) => {
        const key = keyFn(item);
        if (!result[key]) {
            result[key] = [];
        }
        result[key].push(item);
        return result;
    }, {} as Record<string, T[]>);
}

/**
 * Creates a debounced version of a function
 * @param func Function to debounce
 * @param waitFor Debounce delay in milliseconds
 * @returns Debounced function
 */
export function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
    let timeout: number | null = null;
    
    return (...args: Parameters<F>): Promise<ReturnType<F>> => {
        if (timeout !== null) {
            clearTimeout(timeout);
            timeout = null;
        }
        
        return new Promise(resolve => {
            timeout = window.setTimeout(() => {
                resolve(func(...args));
            }, waitFor);
        });
    };
}