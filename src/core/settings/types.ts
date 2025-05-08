// src/core/settings/types.ts
/**
 * Settings types for Al-Rawi plugin
 */

/**
 * Table column configuration
 */
export interface TableColumnConfig {
    /** Unique identifier for the column */
    id: string;
    /** Whether the column is visible */
    enabled: boolean;
    /** Order in the table (0-based index) */
    order: number;
    /** Display label for the column */
    label: string;
    /** Key used for sorting (if different from id) */
    sortKey?: string;
}

/**
 * Progress tracking settings
 */
export interface ProgressTrackingSettings {
    /** Default status for new content */
    defaultStatus: string;
    /** Available status options */
    statusOptions: string[];
}

/**
 * Folder rules settings
 */
export interface FolderRulesSettings {
    /** Whether automatic folder organization is enabled */
    enabled: boolean;
    /** Folder structure pattern */
    structure: string;
    /** Default folder structure pattern */
    defaultStructure: string;
    /** Whether to show example previews */
    showExamples: boolean;
}

/**
 * Book-specific settings
 */
export interface BookSettings {
    /** Default folder for books */
    defaultFolder: string;
    /** Default author name */
    defaultAuthor: string;
    /** Whether to show book covers */
    showCovers: boolean;
    /** Reading goal settings */
    readingGoal: {
        /** Whether reading goals are enabled */
        enabled: boolean;
        /** Annual book reading target */
        booksPerYear: number;
        /** Daily pages reading target */
        pagesPerDay: number;
    };
    /** Available status options for books */
    bookStatusOptions: string[];
    /** Default status for new books */
    defaultStatus: string;
    /** Folder structure pattern for books */
    folderStructure: string;
}

/**
 * Template settings
 */
export interface TemplateSettings {
    /** Template for single videos */
    video: string;
    /** Template for playlists */
    playlist: string;
    /** Template for books */
    book: string;
}

/**
 * Main settings interface for Al-Rawi plugin
 */
export interface AlRawiSettings {
    /** YouTube API key for metadata fetching */
    youtubeApiKey: string;
    /** Default folder for videos */
    defaultFolder: string;
    /** Default presenter name */
    defaultPresenter: string;
    /** Date format for timestamps */
    dateFormat: string;
    /** Whether to show thumbnails in statistics view */
    showThumbnailsInStats: boolean;
    /** Maximum length for titles */
    maxTitleLength: number;
    /** Table column configurations */
    tableColumns: {
        videos: TableColumnConfig[];
        books: TableColumnConfig[];
    };
    /** Progress tracking settings */
    progressTracking: ProgressTrackingSettings;
    /** Template settings */
    templates: TemplateSettings;
    /** Folder organization rules */
    folderRules: FolderRulesSettings;
    /** View mode (table or card) */
    viewMode: 'table' | 'card';
    /** Book-specific settings */
    booksSettings: BookSettings;
}

/**
 * Template placeholder documentation
 */
export interface PlaceholderDoc {
    /** Placeholder text */
    placeholder: string;
    /** Description of the placeholder */
    description: string;
}