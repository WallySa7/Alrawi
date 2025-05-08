/**
 * Central export point for all utility functions
 */

// Array utilities
export * from "./arrayUtils";

// Async utilities
export * from "./asyncUtils";

// Date utilities
export * from "./dateUtils";

// File utilities
export * from "./fileUtils";

// Template utilities
export * from "./templateUtils";

// Media utilities
export * from "./durationUtils";
export * from "./youtubeUtils";

/**
 * For backward compatibility, we re-export some functions with their original names.
 * This helps prevent breaking changes when migrating to the new structure.
 */
import { sanitizeFileName, createPath } from "./fileUtils";
import { formatDate } from "./dateUtils";
import { renderTemplate } from "./templateUtils";
import {
	determineYoutubeUrlType,
	extractVideoId,
	extractPlaylistId,
} from "./youtubeUtils";

// Export functions with legacy names for backward compatibility
export {
	sanitizeFileName,
	createPath,
	formatDate,
	renderTemplate,
	determineYoutubeUrlType,
	extractVideoId,
	extractPlaylistId,
};
