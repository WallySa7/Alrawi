/**
 * Utilities for handling YouTube URLs and IDs
 */

/**
 * Type for YouTube URL classification
 */
export type YouTubeUrlType = "video" | "playlist" | "invalid";

/**
 * Determines if a URL should be treated as a video or playlist
 *
 * @param url - The YouTube URL to analyze
 * @returns Classification of the URL (video, playlist, or invalid)
 * @example
 * // Returns "video"
 * determineYoutubeUrlType("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
 */
export function determineYoutubeUrlType(url: string): YouTubeUrlType {
	if (!url || typeof url !== "string") {
		return "invalid";
	}

	// First check if it's a video URL (contains 'watch?v=')
	if (url.includes("watch?v=")) {
		return "video";
	}

	// If it's a pure playlist URL (no video parameter)
	if (
		(url.includes("playlist?list=") || url.includes("&list=")) &&
		!url.includes("watch?v=")
	) {
		return "playlist";
	}

	// Verify if it contains a valid video or playlist ID
	if (extractVideoId(url) || extractPlaylistId(url)) {
		return "video"; // Default to video for other valid YouTube URLs
	}

	return "invalid";
}

/**
 * Regular expression to match YouTube video IDs
 * YouTube video IDs are 11 characters composed of alphanumeric, dash, and underscore
 */
const VIDEO_ID_REGEX = /(?:v=|\/)([\w-]{11})(?:\&|\?|$)/;

/**
 * Extracts YouTube video ID from a URL
 *
 * @param url - YouTube video URL
 * @returns Video ID or null if invalid
 * @example
 * // Returns "dQw4w9WgXcQ"
 * extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
 */
export function extractVideoId(url: string): string | null {
	if (!url || typeof url !== "string") {
		return null;
	}

	const match = url.match(VIDEO_ID_REGEX);
	return match ? match[1] : null;
}

/**
 * Extracts YouTube playlist ID from a URL
 *
 * @param url - YouTube playlist URL
 * @returns Playlist ID or null if invalid
 * @example
 * // Returns "PLlaN88a7y2_plecYoJxvRFTLHVbIVAOoS"
 * extractPlaylistId("https://www.youtube.com/playlist?list=PLlaN88a7y2_plecYoJxvRFTLHVbIVAOoS");
 */
export function extractPlaylistId(url: string): string | null {
	if (!url || typeof url !== "string") {
		return null;
	}

	try {
		const parsed = new URL(url);
		return parsed.searchParams.get("list");
	} catch (error) {
		// Fall back to regex if URL parsing fails
		const match = url.match(/[?&]list=([^&]+)/);
		return match ? match[1] : null;
	}
}

/**
 * Creates a YouTube video URL from a video ID
 *
 * @param videoId - YouTube video ID
 * @returns Full YouTube video URL
 * @example
 * // Returns "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
 * createVideoUrl("dQw4w9WgXcQ");
 */
export function createVideoUrl(videoId: string): string {
	if (!videoId || typeof videoId !== "string") {
		return "";
	}

	return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Creates a YouTube playlist URL from a playlist ID
 *
 * @param playlistId - YouTube playlist ID
 * @returns Full YouTube playlist URL
 * @example
 * // Returns "https://www.youtube.com/playlist?list=PLlaN88a7y2_plecYoJxvRFTLHVbIVAOoS"
 * createPlaylistUrl("PLlaN88a7y2_plecYoJxvRFTLHVbIVAOoS");
 */
export function createPlaylistUrl(playlistId: string): string {
	if (!playlistId || typeof playlistId !== "string") {
		return "";
	}

	return `https://www.youtube.com/playlist?list=${playlistId}`;
}

/**
 * Extracts YouTube thumbnail URL for a video
 *
 * @param videoId - YouTube video ID
 * @param quality - Thumbnail quality (default, medium, high, maxres)
 * @returns URL to the video thumbnail
 * @example
 * // Returns "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
 * getVideoThumbnailUrl("dQw4w9WgXcQ", "high");
 */
export function getVideoThumbnailUrl(
	videoId: string,
	quality: "default" | "medium" | "high" | "maxres" = "high"
): string {
	if (!videoId || typeof videoId !== "string") {
		return "";
	}

	const qualityMap = {
		default: "default",
		medium: "mqdefault",
		high: "hqdefault",
		maxres: "maxresdefault",
	};

	return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

/**
 * Checks if a string is a valid YouTube video ID
 *
 * @param id - String to check
 * @returns Whether the string is a valid YouTube video ID
 * @example
 * // Returns true
 * isValidVideoId("dQw4w9WgXcQ");
 */
export function isValidVideoId(id: string): boolean {
	if (!id || typeof id !== "string") {
		return false;
	}

	// YouTube video IDs are 11 characters of alphanumeric, dash, and underscore
	return /^[\w-]{11}$/.test(id);
}
