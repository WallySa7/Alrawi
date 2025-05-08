// src/types/serviceTypes.ts
/**
 * Types for service-related operations
 */

/**
 * API response wrapper
 */
export interface APIResponse<T> {
    /** Whether the operation was successful */
    success: boolean;
    /** Response data (if successful) */
    data?: T;
    /** Error message (if not successful) */
    error?: string;
}

/**
 * YouTube video details response
 */
export interface VideoDetails {
    /** Video title */
    title: string;
    /** Duration in HH:MM:SS format */
    duration: string;
    /** URL to the video thumbnail */
    thumbnailUrl: string;
}

/**
 * YouTube playlist details response
 */
export interface PlaylistDetails {
    /** Playlist title */
    title: string;
    /** Number of videos in the playlist */
    itemCount: number;
    /** Total duration in HH:MM:SS format */
    duration: string;

    thumbnailUrl?: string;
}

/**
 * Data for creating a video note
 */
export interface VideoData {
    /** Full YouTube URL */
    url: string;
    /** YouTube video ID */
    videoId: string;
    /** Video title */
    title: string;
    /** Duration in HH:MM:SS format */
    duration: string;
    /** Name of the presenter or lecturer */
    presenter: string;
    /** Content type (مقطع/سلسلة) */
    type: string;
    /** Video description */
    description: string;
    /** Associated tags */
    tags: string[];
    /** URL to the video thumbnail */
    thumbnailUrl: string;
    /** Viewing status */
    status?: string;
    categories?: string[];
}

/**
 * Data for creating a playlist note
 */
export interface PlaylistData {
    /** Full YouTube URL */
    url: string;
    /** YouTube playlist ID */
    playlistId: string;
    /** Playlist title */
    title: string;
    /** Name of the presenter or lecturer */
    presenter: string;
    /** Content type (سلسلة) */
    type: string;
    /** Number of videos in the playlist */
    itemCount: number;
    /** Total duration in HH:MM:SS format */
    duration: string;
    /** Viewing status */
    status?: string;
    /** URL to the playlist thumbnail */
    thumbnailUrl?: string;
    /** Associated tags */
    tags?: string[];
    categories?: string[];
}

/**
 * Data for creating or updating a book note
 */
export interface BookData {
    /** Book title */
    title: string;
    /** Author name */
    author: string;
    /** ISBN number */
    isbn?: string;
    /** Total number of pages */
    pages: number;
    /** Number of pages read */
    pagesRead: number;
    /** Date when reading started */
    startDate?: string;
    /** Date when reading completed */
    completionDate?: string;
    /** Publisher name */
    publisher?: string;
    /** Year of publication */
    publishYear?: number;
    /** URL to the book cover image */
    coverUrl?: string;
    /** Content type (will be "كتاب") */
    type: string;
    /** Reading status */
    status?: string;
    /** Associated tags */
    tags: string[];
    /** Book language */
    language?: string;
    /** Rating (1-5) */
    rating?: number;
    /** Subject categories */
    categories?: string[];
    /** Additional notes */
    notes?: string;
}

/**
 * Folder data for path resolution
 */
export interface FolderData {
    /** Content type */
    type: string;
    /** presenter name */
    presenter: string;
    /** Formatted date */
    date?: string;
}

/**
 * Template data for rendering
 */
export interface TemplateData extends Record<string, any> {
    title?: string;
    presenter?: string;
    type?: string;
    duration?: string;
    url?: string;
    date?: string;
    dateAdded?: string;
    videoId?: string;
    playlistId?: string;
    tags?: string[] | string;
    description?: string;
    thumbnailUrl?: string;
    itemCount?: number;
    status?: string;
}

/**
 * Bulk operation for processing multiple items
 */
export interface BulkOperation {
    type: 'status' | 'tag' | 'category' | 'delete'; // Add 'category' to the type
    value?: string; // For status, tag, or category operations
    itemPaths: string[];
}