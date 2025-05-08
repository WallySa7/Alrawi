// src/utils/youtubeUtils.ts
/**
 * Utility functions for handling YouTube URLs and IDs
 */


/**
 * Determines if a URL should be treated as a video or playlist
 * @param url The YouTube URL to analyze
 * @returns 'video' if it should be treated as a video, 'playlist' if it should be treated as a playlist
 */
export function determineYoutubeUrlType(url: string): 'video' | 'playlist' | 'invalid' {
    // First check if it's a video URL (contains 'watch?v=')
    if (url.includes('watch?v=')) {
      return 'video';
    }
    
    // If it's a pure playlist URL (no video parameter)
    if (url.includes('playlist?list=') || url.includes('&list=')) {
      // Only treat as playlist if it's NOT also a video
      if (!url.includes('watch?v=')) {
        return 'playlist';
      }
    }
    
    // Not a valid YouTube URL we can process
    if (!extractVideoId(url) && !extractPlaylistId(url)) {
      return 'invalid';
    }
    
    return 'video'; // Default to video for any other valid YouTube URL
  }



/**
 * Extracts YouTube video ID from a URL
 * @param url YouTube video URL
 * @returns Video ID or null if invalid
 */
export function extractVideoId(url: string): string | null {
    // Match v= parameter from URL
    const match = url.match(/(?:v=|\/)([\w-]{11})(?:\&|\?|$)/);
    return match ? match[1] : null;
}

/**
 * Extracts YouTube playlist ID from a URL
 * @param url YouTube playlist URL
 * @returns Playlist ID or null if invalid
 */
export function extractPlaylistId(url: string): string | null {
    if (!url) return null;
    
    try {
        const parsed = new URL(url);
        return parsed.searchParams.get('list');
    } catch (error) {
        console.warn('Invalid YouTube URL', url);
        return null;
    }
}

/**
 * Creates a YouTube video URL from a video ID
 * @param videoId YouTube video ID
 * @returns Full YouTube video URL
 */
export function createVideoUrl(videoId: string): string {
    if (!videoId) return '';
    return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Creates a YouTube playlist URL from a playlist ID
 * @param playlistId YouTube playlist ID
 * @returns Full YouTube playlist URL
 */
export function createPlaylistUrl(playlistId: string): string {
    if (!playlistId) return '';
    return `https://www.youtube.com/playlist?list=${playlistId}`;
}