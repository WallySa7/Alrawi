// src/services/youtubeService.ts
import { request } from 'obsidian';
import { parseYouTubeDuration, secondsToHMS, parseDurationText } from '../utils/durationUtils';
import { VideoDetails, PlaylistDetails, APIResponse } from '../types';

/**
 * Service for interacting with the YouTube API and obtaining video information
 */
export class YouTubeService {
    private apiKey: string;
    private cache: Map<string, { data: any, timestamp: number }> = new Map();
    private cacheTTL = 1000 * 60 * 60; // 1 hour cache time
    
    /**
     * Creates a new YouTube service
     * @param apiKey YouTube API key
     */
    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }
    
    /**
     * Updates the YouTube API key
     * @param apiKey New API key
     */
    setApiKey(apiKey: string): void {
        this.apiKey = apiKey;
        // Clear cache when API key changes
        this.clearCache();
    }
    
    /**
     * Fetches video details from YouTube
     * @param videoId YouTube video ID
     * @returns Video details response
     */
    async fetchVideoDetails(videoId: string): Promise<APIResponse<VideoDetails>> {
        try {
            // Validate input
            if (!videoId) {
                return { success: false, error: 'Invalid video ID' };
            }
            
            // Check cache first
            const cacheKey = `video:${videoId}`;
            const cached = this.getCachedData<VideoDetails>(cacheKey);
            if (cached) {
                return { success: true, data: cached };
            }
            
            // If no API key, use fallback
            if (!this.apiKey) {
                return await this.fetchVideoDetailsFallback(videoId);
            }
            
            // Make API request
            const response = await this.makeApiRequest(
                `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${this.apiKey}&part=snippet,contentDetails`
            );
            
            // Handle API errors
            if (!response.ok) {
                console.warn('YouTube API request failed:', await response.text());
                return await this.fetchVideoDetailsFallback(videoId);
            }
            
            // Parse response
            const data = await response.json();
            if (!data.items?.length) {
                return { success: false, error: 'Video not found' };
            }
            
            // Extract video details
            const item = data.items[0];
            const details: VideoDetails = {
                title: item.snippet.title,
                duration: parseYouTubeDuration(item.contentDetails.duration),
                thumbnailUrl: this.getBestThumbnail(item.snippet.thumbnails)
            };
            
            // Cache the result
            this.setCachedData(cacheKey, details);
            
            return { success: true, data: details };
        } catch (error) {
            console.error('Error fetching video details:', error);
            return { success: false, error: 'Failed to fetch video details' };
        }
    }
    
    /**
     * Fetches playlist details from YouTube
     * @param playlistId YouTube playlist ID
     * @returns Playlist details response
     */
    async fetchPlaylistDetails(playlistId: string): Promise<APIResponse<PlaylistDetails>> {
        try {
            // Validate input
            if (!playlistId) {
                return { success: false, error: 'Invalid playlist ID' };
            }
            
            // Check cache first
            const cacheKey = `playlist:${playlistId}`;
            const cached = this.getCachedData<PlaylistDetails>(cacheKey);
            if (cached) {
                return { success: true, data: cached };
            }
            
            // If no API key, use fallback
            if (!this.apiKey) {
                return await this.fetchPlaylistDetailsFallback(playlistId);
            }
            
            // Make API request
            const apiUrl = `https://www.googleapis.com/youtube/v3/playlists?id=${playlistId}&key=${this.apiKey}&part=snippet,contentDetails`;
            const response = await this.makeApiRequest(apiUrl);
            
            // Handle API errors
            if (!response.ok) {
                console.warn('YouTube API request failed:', await response.text());
                return await this.fetchPlaylistDetailsFallback(playlistId);
            }
            
            // Parse response
            const data = await response.json();
            if (!data.items?.length) {
                return { success: false, error: 'Playlist not found' };
            }
            
            const item = data.items[0];
            
            // Fetch duration (optional)
            let duration = "00:00:00";
            try {
                const durationResponse = await this.fetchPlaylistDuration(playlistId);
                if (durationResponse.success && durationResponse.data) {
                    duration = durationResponse.data;
                }
            } catch (error) {
                console.warn("Couldn't fetch playlist duration:", error);
            }
            
            let thumbnailUrl = '';
            try {
                const videosResponse = await this.fetchPlaylistVideos(playlistId, 1);
                if (videosResponse.success && videosResponse.data && videosResponse.data.length > 0) {
                    thumbnailUrl = videosResponse.data[0].thumbnailUrl;
                }
            } catch (error) {
                console.warn("Couldn't fetch playlist thumbnail:", error);
            }


            // Create playlist details
            const details: PlaylistDetails = {
                title: item.snippet.title,
                itemCount: item.contentDetails.itemCount,
                duration,
                thumbnailUrl
            };
            
            // Cache the result
            this.setCachedData(cacheKey, details);
            
            return { success: true, data: details };
        } catch (error) {
            console.error('Error fetching playlist details:', error);
            return { success: false, error: 'Failed to fetch playlist details' };
        }
    }
    
    /**
     * Fetches videos in a playlist
     * @param playlistId YouTube playlist ID
     * @param maxResults Maximum number of results to return
     * @returns Playlist videos response
     */
    async fetchPlaylistVideos(playlistId: string, maxResults = 50): Promise<APIResponse<any[]>> {
        try {
            // Validate input
            if (!playlistId) {
                return { success: false, error: 'Invalid playlist ID' };
            }
            
            if (!this.apiKey) {
                return { success: false, error: 'API key required for this operation' };
            }
            
            // Check cache
            const cacheKey = `playlistVideos:${playlistId}:${maxResults}`;
            const cached = this.getCachedData<any[]>(cacheKey);
            if (cached) {
                return { success: true, data: cached };
            }
            
            // Make API request
            const apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${playlistId}&key=${this.apiKey}&part=snippet,contentDetails&maxResults=${maxResults}`;
            const response = await this.makeApiRequest(apiUrl);
            
            // Handle API errors
            if (!response.ok) {
                console.warn('YouTube API request failed:', await response.text());
                return { success: false, error: 'Failed to fetch playlist videos' };
            }
            
            // Parse response
            const data = await response.json();
            const videos = data.items.map((item: any) => ({
                title: item.snippet.title,
                videoId: item.contentDetails.videoId,
                thumbnailUrl: this.getBestThumbnail(item.snippet.thumbnails),
                position: item.snippet.position
            }));
            
            // Cache results
            this.setCachedData(cacheKey, videos);
            return { success: true, data: videos };
        } catch (error) {
            console.error('Error fetching playlist videos:', error);
            return { success: false, error: 'Failed to fetch playlist videos' };
        }
    }
    
    /**
     * Fetches the total duration of a playlist
     * @param playlistId YouTube playlist ID
     * @returns Playlist duration response
     */
    async fetchPlaylistDuration(playlistId: string): Promise<APIResponse<string>> {
        try {
            // Validate input
            if (!playlistId) {
                return { success: false, error: 'Invalid playlist ID' };
            }
            
            // Check cache
            const cacheKey = `playlistDuration:${playlistId}`;
            const cached = this.getCachedData<string>(cacheKey);
            if (cached) {
                return { success: true, data: cached };
            }
            
            // Try createthat.ai service first (external service)
            try {
                const duration = await this.fetchDurationFromCreatethat(playlistId);
                if (duration) {
                    this.setCachedData(cacheKey, duration);
                    return { success: true, data: duration };
                }
            } catch (error) {
                console.warn("createthat.ai failed:", error);
            }
            
            // Fallback to lenostube (external service)
            try {
                const duration = await this.fetchDurationFromLenostube(playlistId);
                if (duration) {
                    this.setCachedData(cacheKey, duration);
                    return { success: true, data: duration };
                }
            } catch (error) {
                console.warn("lenostube.com failed:", error);
            }
            
            // If we have an API key, we could implement our own calculation
            // by fetching all videos and summing their durations
            // if (this.apiKey && false) { // Disabled for now
            //     try {
            //         const duration = await this.calculatePlaylistDuration(playlistId);
            //         if (duration) {
            //             this.setCachedData(cacheKey, duration);
            //             return { success: true, data: duration };
            //         }
            //     } catch (error) {
            //         console.warn("Own calculation failed:", error);
            //     }
            // }
            
            return { success: false, error: "No duration data available" };
        } catch (error) {
            console.error('Error fetching playlist duration:', error);
            return { success: false, error: 'Failed to fetch playlist duration' };
        }
    }
    
    /**
     * Makes an API request with error handling
     * @param url API URL
     * @returns Fetch response
     */
    private async makeApiRequest(url: string): Promise<Response> {
        try {
            return await fetch(url);
        } catch (error) {
            console.error('API request failed:', error);
            throw new Error(`API request failed: ${error.message}`);
        }
    }
    
    /**
     * Gets data from cache if available and not expired
     * @param key Cache key
     * @returns Cached data or null
     */
    private getCachedData<T>(key: string): T | null {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp < this.cacheTTL)) {
            return cached.data as T;
        }
        return null;
    }
    
    /**
     * Stores data in cache
     * @param key Cache key
     * @param data Data to cache
     */
    private setCachedData(key: string, data: any): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    
    /**
     * Clears all cached data
     */
    private clearCache(): void {
        this.cache.clear();
    }
    
    /**
     * Fetches video details using fallback method (no API key)
     * @param videoId YouTube video ID
     * @returns Video details
     */
    private async fetchVideoDetailsFallback(videoId: string): Promise<APIResponse<VideoDetails>> {
        try {
            // Try oEmbed API (doesn't require API key)
            const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
            const response = await fetch(oembedUrl);
            
            if (!response.ok) {
                return { success: false, error: 'Video not found (fallback failed)' };
            }
            
            const oembedData = await response.json();
            
            // Create video details with available info
            const details: VideoDetails = {
                title: oembedData.title,
                duration: '00:00:00', // Unknown duration without API key
                thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
            };
            
            return { success: true, data: details };
        } catch (error) {
            console.error('Error in fallback video details fetch:', error);
            return { success: false, error: 'Failed to fetch video details (fallback)' };
        }
    }
    
    /**
     * Fetches playlist details using fallback method (no API key)
     * @param playlistId YouTube playlist ID
     * @returns Playlist details
     */
    private async fetchPlaylistDetailsFallback(playlistId: string): Promise<APIResponse<PlaylistDetails>> {
        try {
            // Try to scrape playlist page
            const html = await request({
                url: `https://www.youtube.com/playlist?list=${playlistId}`,
                method: 'GET'
            });
            
            // Extract title from HTML
            const titleMatch = html.match(/<title>(.*?)<\/title>/);
            const title = titleMatch 
                ? titleMatch[1].replace(' - YouTube', '').trim()
                : 'Unknown Playlist';
            
            return {
                success: true,
                data: {
                    title,
                    itemCount: 0, // Unknown without API key
                    duration: '00:00:00' // Unknown without API key
                }
            };
        } catch (error) {
            console.error('Error in fallback playlist details fetch:', error);
            return { success: false, error: 'Failed to fetch playlist details (fallback)' };
        }
    }
    
    /**
     * Fetches duration from createthat.ai service
     * @param playlistId YouTube playlist ID
     * @returns Formatted duration string or null
     */
    private async fetchDurationFromCreatethat(playlistId: string): Promise<string | null> {
        const response = await request({
            url: `https://www.createthat.ai/api/youtube-playlist-length?playlistId=${playlistId}`,
            method: 'GET'
        });
        
        try {
            const data = JSON.parse(response);
            
            if (data.totalDuration) {
                const hours = data.totalDuration.hours.toString().padStart(2, '0');
                const minutes = data.totalDuration.minutes.toString().padStart(2, '0');
                const seconds = data.totalDuration.seconds.toString().padStart(2, '0');
                
                return `${hours}:${minutes}:${seconds}`;
            }
        } catch (error) {
            console.warn("Failed to parse createthat.ai response:", error);
        }
        
        return null;
    }
    
    /**
     * Fetches duration from lenostube.com service
     * @param playlistId YouTube playlist ID
     * @returns Formatted duration string or null
     */
    private async fetchDurationFromLenostube(playlistId: string): Promise<string | null> {
        const response = await request({
            url: `https://www.lenostube.com/en/youtube-playlist-length-calculator/?playlist_id=${playlistId}`,
            method: 'GET'
        });
        
        try {
            return this.parseLenostubeTableResponse(response);
        } catch (error) {
            console.warn("Failed to parse lenostube.com response:", error);
            return null;
        }
    }
    
    /**
     * Parses lenostube.com HTML response to extract duration
     * @param html HTML response
     * @returns Formatted duration
     */
    private parseLenostubeTableResponse(html: string): string {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
    
        const table = doc.querySelector('#playlist-table');
        if (!table) {
            throw new Error("Could not find playlist table");
        }
    
        const rows = table.querySelectorAll('tbody tr');
        let totalSeconds = 0;
    
        for (const row of Array.from(rows)) {
            const durationCell = row.querySelector('td:nth-child(3)');
            if (!durationCell) continue;
    
            const durationText = durationCell.textContent?.trim();
            if (!durationText) continue;
    
            try {
                const seconds = parseDurationText(durationText);
                totalSeconds += seconds;
            } catch (e) {
                console.warn(`Could not parse duration: ${durationText}`, e);
            }
        }
    
        return secondsToHMS(totalSeconds);
    }
    
    /**
     * Calculates playlist duration by fetching all videos
     * @param playlistId YouTube playlist ID
     * @returns Formatted duration string or null
     */
    private async calculatePlaylistDuration(playlistId: string): Promise<string | null> {
        // Not implemented yet - would require multiple API calls
        // to get all videos and their durations
        return null;
    }
    
    /**
     * Gets the best available thumbnail from YouTube thumbnails object
     * @param thumbnails YouTube thumbnails object
     * @returns URL of the best thumbnail
     */
    private getBestThumbnail(thumbnails: any): string {
        if (!thumbnails) return '';
        
        // Try to get the highest quality thumbnail
        if (thumbnails.maxres) return thumbnails.maxres.url;
        if (thumbnails.high) return thumbnails.high.url;
        if (thumbnails.medium) return thumbnails.medium.url;
        if (thumbnails.standard) return thumbnails.standard.url;
        if (thumbnails.default) return thumbnails.default.url;
        
        // Fallback
        return '';
    }
}