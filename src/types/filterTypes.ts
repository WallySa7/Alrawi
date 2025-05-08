// src/types/filterTypes.ts
/**
 * Types for filtering and sorting content
 */

/**
 * Filter state for video/playlist content
 */
export interface FilterState {
    /** Selected status values */
    statuses: string[];
    /** Selected presenter values */
    presenters: string[];
    /** Selected content types */
    types: string[];
    categories: string[];
    /** Selected tags */
    tags: string[];
    /** Date range filter */
    dateRange: {
        from: string | null;
        to: string | null;
    };
    /** Search query text */
    searchQuery: string;
    /** Current page number (for pagination) */
    page: number;
    /** Number of items per page */
    itemsPerPage: number;
    /** Field to sort by */
    sortBy: string;
    /** Sort direction */
    sortOrder: 'asc' | 'desc';
}

/**
 * Filter state for benefits
 */
export interface BenefitFilterState {
    /** Selected categories */
    categories: string[];
    /** Selected source types */
    sourceTypes: string[];
    /** Selected tags */
    tags: string[];
    /** Selected sources */
    sources: string[];
    /** Date range filter */
    dateRange: {
        from: string | null;
        to: string | null;
    };
    /** Search query text */
    searchQuery: string;
    /** Current page number (for pagination) */
    page: number;
    /** Number of items per page */
    itemsPerPage: number;
    /** Field to sort by */
    sortBy: string;
    /** Sort direction */
    sortOrder: 'asc' | 'desc';
}