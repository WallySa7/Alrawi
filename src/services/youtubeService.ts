import { request } from "obsidian";
import {
	parseYouTubeDuration,
	secondsToHMS,
	parseDurationText,
} from "../utils/durationUtils";
import { VideoDetails, PlaylistDetails, APIResponse } from "../types";

/**
 * Service for interacting with YouTube API and retrieving video information
 */
export class YouTubeService {
	private apiKey: string;
	private cache: Map<string, { data: any; timestamp: number }> = new Map();
	private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour cache time

	/**
	 * Creates a new YouTube service
	 * @param apiKey - YouTube API key
	 */
	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	/**
	 * Updates the API key and clears cache
	 * @param apiKey - New YouTube API key
	 */
	setApiKey(apiKey: string): void {
		this.apiKey = apiKey;
		this.clearCache();
	}

	/**
	 * Retrieves video details from YouTube
	 * @param videoId - YouTube video ID
	 * @returns Response containing video details or error
	 */
	async getVideoDetails(videoId: string): Promise<APIResponse<VideoDetails>> {
		try {
			if (!videoId) {
				return { success: false, error: "Invalid video ID" };
			}

			// Try cache first
			const cacheKey = `video:${videoId}`;
			const cached = this.getFromCache<VideoDetails>(cacheKey);
			if (cached) {
				return { success: true, data: cached };
			}

			// Use API if available, otherwise fallback
			if (!this.apiKey) {
				return await this.getVideoDetailsFallback(videoId);
			}

			// Make API request
			const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${this.apiKey}&part=snippet,contentDetails`;
			const response = await this.makeApiRequest(apiUrl);

			if (!response.ok) {
				console.warn(
					"YouTube API request failed:",
					await response.text()
				);
				return await this.getVideoDetailsFallback(videoId);
			}

			const data = await response.json();
			if (!data.items?.length) {
				return { success: false, error: "Video not found" };
			}

			// Extract relevant details
			const item = data.items[0];
			const details: VideoDetails = {
				title: item.snippet.title,
				duration: parseYouTubeDuration(item.contentDetails.duration),
				thumbnailUrl: this.getBestThumbnail(item.snippet.thumbnails),
			};

			// Save to cache
			this.saveToCache(cacheKey, details);

			return { success: true, data: details };
		} catch (error) {
			console.error("Error fetching video details:", error);
			return { success: false, error: "Failed to fetch video details" };
		}
	}

	/**
	 * Retrieves playlist details from YouTube
	 * @param playlistId - YouTube playlist ID
	 * @returns Response containing playlist details or error
	 */
	async getPlaylistDetails(
		playlistId: string
	): Promise<APIResponse<PlaylistDetails>> {
		try {
			if (!playlistId) {
				return { success: false, error: "Invalid playlist ID" };
			}

			// Try cache first
			const cacheKey = `playlist:${playlistId}`;
			const cached = this.getFromCache<PlaylistDetails>(cacheKey);
			if (cached) {
				return { success: true, data: cached };
			}

			// Use API if available, otherwise fallback
			if (!this.apiKey) {
				return await this.getPlaylistDetailsFallback(playlistId);
			}

			// Make API request
			const apiUrl = `https://www.googleapis.com/youtube/v3/playlists?id=${playlistId}&key=${this.apiKey}&part=snippet,contentDetails`;
			const response = await this.makeApiRequest(apiUrl);

			if (!response.ok) {
				console.warn(
					"YouTube API request failed:",
					await response.text()
				);
				return await this.getPlaylistDetailsFallback(playlistId);
			}

			const data = await response.json();
			if (!data.items?.length) {
				return { success: false, error: "Playlist not found" };
			}

			const item = data.items[0];

			// Get additional details
			let duration = "00:00:00";
			let thumbnailUrl = "";

			try {
				// Try to get duration (optional)
				const durationResponse = await this.getPlaylistDuration(
					playlistId
				);
				if (durationResponse.success && durationResponse.data) {
					duration = durationResponse.data;
				}

				// Try to get thumbnail from first video
				const videosResponse = await this.getPlaylistVideos(
					playlistId,
					1
				);
				if (videosResponse.success && videosResponse.data && videosResponse.data.length > 0) {
					thumbnailUrl = videosResponse.data[0].thumbnailUrl;
				}
			} catch (error) {
				console.warn(
					"Error getting playlist additional details:",
					error
				);
			}

			// Create playlist details object
			const details: PlaylistDetails = {
				title: item.snippet.title,
				itemCount: item.contentDetails.itemCount,
				duration,
				thumbnailUrl:
					thumbnailUrl ||
					this.getBestThumbnail(item.snippet.thumbnails),
			};

			// Save to cache
			this.saveToCache(cacheKey, details);

			return { success: true, data: details };
		} catch (error) {
			console.error("Error fetching playlist details:", error);
			return {
				success: false,
				error: "Failed to fetch playlist details",
			};
		}
	}

	/**
	 * Retrieves videos in a playlist
	 * @param playlistId - YouTube playlist ID
	 * @param maxResults - Maximum number of results (defaults to 50)
	 * @returns Response containing playlist videos or error
	 */
	async getPlaylistVideos(
		playlistId: string,
		maxResults = 50
	): Promise<APIResponse<any[]>> {
		try {
			if (!playlistId) {
				return { success: false, error: "Invalid playlist ID" };
			}

			if (!this.apiKey) {
				return {
					success: false,
					error: "API key required for this operation",
				};
			}

			// Try cache first
			const cacheKey = `playlistVideos:${playlistId}:${maxResults}`;
			const cached = this.getFromCache<any[]>(cacheKey);
			if (cached) {
				return { success: true, data: cached };
			}

			// Make API request
			const apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${playlistId}&key=${this.apiKey}&part=snippet,contentDetails&maxResults=${maxResults}`;
			const response = await this.makeApiRequest(apiUrl);

			if (!response.ok) {
				console.warn(
					"YouTube API request failed:",
					await response.text()
				);
				return {
					success: false,
					error: "Failed to fetch playlist videos",
				};
			}

			const data = await response.json();
			const videos = data.items.map((item: any) => ({
				title: item.snippet.title,
				videoId: item.contentDetails.videoId,
				thumbnailUrl: this.getBestThumbnail(item.snippet.thumbnails),
				position: item.snippet.position,
			}));

			// Save to cache
			this.saveToCache(cacheKey, videos);

			return { success: true, data: videos };
		} catch (error) {
			console.error("Error fetching playlist videos:", error);
			return { success: false, error: "Failed to fetch playlist videos" };
		}
	}

	/**
	 * Retrieves the total duration of a playlist
	 * @param playlistId - YouTube playlist ID
	 * @returns Response containing playlist duration or error
	 */
	async getPlaylistDuration(
		playlistId: string
	): Promise<APIResponse<string>> {
		try {
			if (!playlistId) {
				return { success: false, error: "Invalid playlist ID" };
			}

			// Try cache first
			const cacheKey = `playlistDuration:${playlistId}`;
			const cached = this.getFromCache<string>(cacheKey);
			if (cached) {
				return { success: true, data: cached };
			}

			// Try external services to get duration
			let duration: string | null = null;

			// Try createthat.ai service
			try {
				duration = await this.getDurationFromCreatethat(playlistId);
				if (duration) {
					this.saveToCache(cacheKey, duration);
					return { success: true, data: duration };
				}
			} catch (error) {
				console.warn(
					"Failed to get duration from createthat.ai:",
					error
				);
			}

			// Try lenostube service as fallback
			try {
				duration = await this.getDurationFromLenostube(playlistId);
				if (duration) {
					this.saveToCache(cacheKey, duration);
					return { success: true, data: duration };
				}
			} catch (error) {
				console.warn(
					"Failed to get duration from lenostube.com:",
					error
				);
			}

			return {
				success: false,
				error: "Could not retrieve playlist duration",
			};
		} catch (error) {
			console.error("Error fetching playlist duration:", error);
			return {
				success: false,
				error: "Failed to fetch playlist duration",
			};
		}
	}

	/**
	 * Makes an API request with error handling
	 * @param url - API URL to fetch
	 * @returns Fetch response
	 */
	private async makeApiRequest(url: string): Promise<Response> {
		try {
			return await fetch(url);
		} catch (error) {
			console.error("API request failed:", error);
			throw new Error(`API request failed: ${error.message}`);
		}
	}

	/**
	 * Retrieves data from cache if available and not expired
	 * @param key - Cache key
	 * @returns Cached data or null if expired/not found
	 */
	private getFromCache<T>(key: string): T | null {
		const cached = this.cache.get(key);
		if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
			return cached.data as T;
		}
		return null;
	}

	/**
	 * Saves data to the cache
	 * @param key - Cache key
	 * @param data - Data to cache
	 */
	private saveToCache(key: string, data: any): void {
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
		});
	}

	/**
	 * Clears all cached data
	 */
	private clearCache(): void {
		this.cache.clear();
	}

	/**
	 * Gets video details using fallback method (without API key)
	 * @param videoId - YouTube video ID
	 * @returns Response containing basic video details
	 */
	private async getVideoDetailsFallback(
		videoId: string
	): Promise<APIResponse<VideoDetails>> {
		try {
			// Use YouTube oEmbed API (doesn't require API key)
			const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
			const response = await fetch(oembedUrl);

			if (!response.ok) {
				return {
					success: false,
					error: "Video not found (fallback failed)",
				};
			}

			const oembedData = await response.json();

			// Create video details with available info
			const details: VideoDetails = {
				title: oembedData.title,
				duration: "00:00:00", // Unknown without API key
				thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
			};

			return { success: true, data: details };
		} catch (error) {
			console.error("Error in fallback video details fetch:", error);
			return {
				success: false,
				error: "Failed to fetch video details (fallback)",
			};
		}
	}

	/**
	 * Gets playlist details using fallback method (without API key)
	 * @param playlistId - YouTube playlist ID
	 * @returns Response containing basic playlist details
	 */
	private async getPlaylistDetailsFallback(
		playlistId: string
	): Promise<APIResponse<PlaylistDetails>> {
		try {
			// Try to scrape playlist page
			const html = await request({
				url: `https://www.youtube.com/playlist?list=${playlistId}`,
				method: "GET",
			});

			// Extract title from HTML
			const titleMatch = html.match(/<title>(.*?)<\/title>/);
			const title = titleMatch
				? titleMatch[1].replace(" - YouTube", "").trim()
				: "Unknown Playlist";

			return {
				success: true,
				data: {
					title,
					itemCount: 0, // Unknown without API
					duration: "00:00:00", // Unknown without API
					thumbnailUrl: "", // Can't get without API
				},
			};
		} catch (error) {
			console.error("Error in fallback playlist details fetch:", error);
			return {
				success: false,
				error: "Failed to fetch playlist details (fallback)",
			};
		}
	}

	/**
	 * Gets playlist duration from createthat.ai service
	 * @param playlistId - YouTube playlist ID
	 * @returns Formatted duration string or null
	 */
	private async getDurationFromCreatethat(
		playlistId: string
	): Promise<string | null> {
		const response = await request({
			url: `https://www.createthat.ai/api/youtube-playlist-length?playlistId=${playlistId}`,
			method: "GET",
		});

		try {
			const data = JSON.parse(response);

			if (data.totalDuration) {
				const hours = data.totalDuration.hours
					.toString()
					.padStart(2, "0");
				const minutes = data.totalDuration.minutes
					.toString()
					.padStart(2, "0");
				const seconds = data.totalDuration.seconds
					.toString()
					.padStart(2, "0");

				return `${hours}:${minutes}:${seconds}`;
			}
		} catch (error) {
			console.warn("Failed to parse createthat.ai response:", error);
		}

		return null;
	}

	/**
	 * Gets playlist duration from lenostube.com service
	 * @param playlistId - YouTube playlist ID
	 * @returns Formatted duration string or null
	 */
	private async getDurationFromLenostube(
		playlistId: string
	): Promise<string | null> {
		const response = await request({
			url: `https://www.lenostube.com/en/youtube-playlist-length-calculator/?playlist_id=${playlistId}`,
			method: "GET",
		});

		try {
			return this.parseLenostubeResponse(response);
		} catch (error) {
			console.warn("Failed to parse lenostube.com response:", error);
			return null;
		}
	}

	/**
	 * Parses HTML response from lenostube.com to extract duration
	 * @param html - HTML response
	 * @returns Formatted duration string or null
	 */
	private parseLenostubeResponse(html: string): string | null {
		const totalDurationMatch = html.match(
			/Total Duration: <strong>(.*?)<\/strong>/
		);
		if (totalDurationMatch && totalDurationMatch[1]) {
			// Convert to HH:MM:SS format
			const durationParts = totalDurationMatch[1].split(":");
			if (durationParts.length === 3) {
				return durationParts
					.map((part) => part.padStart(2, "0"))
					.join(":");
			}
		}

		// If the direct approach fails, use table parsing
		try {
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, "text/html");

			const table = doc.querySelector("#playlist-table");
			if (!table) {
				return null;
			}

			const rows = table.querySelectorAll("tbody tr");
			let totalSeconds = 0;

			for (const row of Array.from(rows)) {
				const durationCell = row.querySelector("td:nth-child(3)");
				if (!durationCell) continue;

				const durationText = durationCell.textContent?.trim();
				if (!durationText) continue;

				try {
					const seconds = parseDurationText(durationText);
					totalSeconds += seconds;
				} catch (e) {
					console.warn(
						`Could not parse duration: ${durationText}`,
						e
					);
				}
			}

			return secondsToHMS(totalSeconds);
		} catch (error) {
			console.warn("Failed to parse lenostube table", error);
			return null;
		}
	}

	/**
	 * Gets the best available thumbnail from YouTube thumbnails object
	 * @param thumbnails - YouTube thumbnails object
	 * @returns URL of the best quality thumbnail
	 */
	private getBestThumbnail(thumbnails: any): string {
		if (!thumbnails) return "";

		// Try thumbnails in descending quality order
		if (thumbnails.maxres) return thumbnails.maxres.url;
		if (thumbnails.high) return thumbnails.high.url;
		if (thumbnails.medium) return thumbnails.medium.url;
		if (thumbnails.standard) return thumbnails.standard.url;
		if (thumbnails.default) return thumbnails.default.url;

		return "";
	}
}
