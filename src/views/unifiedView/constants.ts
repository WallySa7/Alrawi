// src/views/unifiedView/constants.ts
// Constants used throughout the UnifiedView component

/**
 * View type identifier for the unified view
 */
export const VIEW_TYPE_ALRAWI_UNIFIED = "alrawi-unified-view";

// Content type constants
export const CONTENT_TYPE = {
  VIDEOS: 'videos' as const,
  BOOKS: 'books' as const,
  BENEFITS: 'benefits' as const
};

// View mode constants
export const VIEW_MODE = {
  TABLE: 'table' as const,
  CARD: 'card' as const
};

// Default page size options
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Local storage keys
export const LOCAL_STORAGE_KEYS = {
  CONTENT_TYPE: 'alrawi-content-type'
};