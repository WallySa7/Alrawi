// src/types/contentTypes.ts
/**
 * Types for video and playlist content
 */

/**
 * Represents a video item
 */
export interface VideoItem {
    /** Video title */
    title: string;
    /** Name of the presenter or lecturer */
    presenter: string;
    /** Duration in HH:MM:SS format */
    duration: string;
    /** Duration in seconds */
    durationSeconds: number;
    /** Full YouTube URL */
    url: string;
    /** URL to the video thumbnail image */
    thumbnailUrl?: string;
    /** YouTube video ID */
    videoId?: string;
    /** Path to the note file */
    filePath: string;
    /** Content type (مقطع/سلسلة) */
    type: string;
    /** Viewing status */
    status?: string;
    /** Date added (formatted) */
    dateAdded?: string;
    /** Associated tags */
    tags?: string[];
    categories?: string[];
}

/**
 * Represents a playlist item
 */
export interface PlaylistItem {
    /** Playlist title */
    title: string;
    /** Name of the presenter or lecturer */
    presenter: string;
    /** Number of videos in the playlist */
    itemCount: number;
    /** Total duration in HH:MM:SS format */
    duration: string;
    /** Full YouTube URL */
    url: string;
    /** Path to the note file */
    filePath: string;
    /** Content type (سلسلة) */
    type: string;
    /** Viewing status */
    status?: string;
    /** Date added (formatted) */
    dateAdded?: string;
    /** URL to the playlist thumbnail image */
    thumbnailUrl?: string;
    /** Associated tags */
    tags?: string[];
    categories?: string[];
}

/**
 * Represents a book item
 */
export interface BookItem {
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
    /** Path to the note file */
    filePath: string;
    /** Content type (will be "كتاب") */
    type: string;
    /** Reading status */
    status?: string;
    /** Date added (formatted) */
    dateAdded?: string;
    /** Associated tags */
    tags?: string[];
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
 * Represents a benefit entry extracted from content
 */
export interface Benefit {
    /** Unique identifier for the benefit */
    id: string;
    /** Optional benefit title */
    title?: string;
    /** Main benefit text */
    text: string;
    /** Category/classification */
    category: string;
    /** Title of the source (book or video) */
    sourceTitle: string;
    /** Path to the source file */
    sourcePath: string;
    /** Type of source (book or video) */
    sourceType: 'book' | 'video';
    /** Date when benefit was added */
    dateAdded: string;
    /** Optional tags */
    tags?: string[];
    /** Page numbers (for books) */
    pages?: string;
    /** Volume number (for books) */
    volume?: string;
}