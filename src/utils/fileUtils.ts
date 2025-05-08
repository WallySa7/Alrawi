/**
 * Utilities for file operations
 */

/**
 * Sanitizes a filename to ensure it's compatible with file systems
 * by removing invalid characters and truncating if needed
 *
 * @param name - The raw filename to sanitize
 * @param maxLength - Maximum allowed length (default: 100)
 * @returns Sanitized filename safe for file system use
 * @example
 * // Returns "My Document"
 * sanitizeFileName("My Document?*");
 */
export function sanitizeFileName(name: string, maxLength = 100): string {
	if (!name || typeof name !== "string") {
		return `file-${new Date().getTime()}`;
	}

	// Remove invalid file characters
	const invalidChars = /[*"\\/<>:|?#]/g;
	let sanitized = name.replace(invalidChars, "");

	// Clean up whitespace
	sanitized = sanitized.trim();
	sanitized = sanitized.replace(/\s+/g, " ");

	// Truncate if too long
	if (sanitized.length > maxLength) {
		sanitized = sanitized.substring(0, maxLength).trim();
	}

	// Ensure we have a valid name (non-empty)
	if (!sanitized) {
		sanitized = `file-${new Date().getTime()}`;
	}

	return sanitized;
}

/**
 * Creates a path by joining segments with proper separators
 *
 * @param segments - Path segments to join
 * @returns Combined path with proper separators
 * @example
 * // Returns "folder/subfolder/file.txt"
 * createPath("folder", "subfolder", "file.txt");
 */
export function createPath(...segments: string[]): string {
	// Filter out empty segments and join with forward slash
	return segments
		.filter((segment) => segment && typeof segment === "string")
		.join("/");
}

/**
 * Extracts the file extension from a filename
 *
 * @param filename - The filename to process
 * @returns The file extension (lowercase, without the dot) or empty string if none
 * @example
 * // Returns "txt"
 * getFileExtension("document.txt");
 */
export function getFileExtension(filename: string): string {
	if (!filename || typeof filename !== "string") {
		return "";
	}

	const parts = filename.split(".");
	return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

/**
 * Gets the base name of a file (without extension)
 *
 * @param filename - The filename to process
 * @returns The base name without extension
 * @example
 * // Returns "document"
 * getBaseName("document.txt");
 */
export function getBaseName(filename: string): string {
	if (!filename || typeof filename !== "string") {
		return "";
	}

	// Get the last part of the path (handle both / and \ separators)
	const name = filename.split(/[\/\\]/).pop() || "";

	// Remove extension
	const dotIndex = name.lastIndexOf(".");
	return dotIndex > 0 ? name.substring(0, dotIndex) : name;
}
