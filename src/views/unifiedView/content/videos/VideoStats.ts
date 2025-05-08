// src/views/unifiedView/content/videos/VideoStats.ts
import { VideoItem, PlaylistItem } from "../../../../types";
import { ComponentProps } from "../../types";
import { formatDuration } from "../../../../utils";

interface VideoStatsProps extends ComponentProps {
    videos: VideoItem[];
    playlists: PlaylistItem[];
}

interface VideoStatistics {
    videos: number;
    playlists: number;
    duration: string;
    totalWatchTime: string;
    percentageWatched: number;
}

/**
 * Renders statistics for videos
 */
export class VideoStats {
    private props: VideoStatsProps;
    
    constructor(props: VideoStatsProps) {
        this.props = props;
    }
    
    /**
     * Renders the video statistics
     */
    public render(container: HTMLElement): void {
        const stats = this.calculateStats();
        
        const statsContainer = container.createEl('div', { cls: 'alrawi-stats-cards' });
        
        this.createStatCard(statsContainer, 'عدد المقاطع', stats.videos.toString());
        this.createStatCard(statsContainer, 'عدد السلاسل', stats.playlists.toString());
        this.createStatCard(statsContainer, 'المدة الإجمالية', stats.duration);
        this.createStatCard(statsContainer, 'الوقت المشاهد', stats.totalWatchTime);
    }
    
    /**
     * Creates a single stat card
     */
    private createStatCard(container: HTMLElement, label: string, value: string): HTMLElement {
        const card = container.createEl('div', { cls: 'alrawi-stat-card' });
        card.createEl('div', { text: label, cls: 'alrawi-stat-label' });
        card.createEl('div', { text: value, cls: 'alrawi-stat-value' });
        return card;
    }
    
    /**
     * Calculates video statistics
     */
    private calculateStats(): VideoStatistics {
        let totalSeconds = 0;
        let watchedSeconds = 0;
        let playlistCount = 0;
        
        // Combine videos and playlists for statistics
        [...this.props.videos, ...this.props.playlists].forEach(item => {
            let durationSeconds = 0;
            
            if ('durationSeconds' in item) {
                // Regular video
                durationSeconds = item.durationSeconds;
            } else {
                // Playlist or series
                durationSeconds = this.getDurationSeconds(item.duration);
                
                if (item.type === 'سلسلة') {
                    playlistCount++;
                }
            }
            
            totalSeconds += durationSeconds;
            
            if (item.status === 'تمت المشاهدة') {
                watchedSeconds += durationSeconds;
            } else if (item.status === 'قيد المشاهدة') {
                // Estimate progress at 50% for "In Progress" items
                watchedSeconds += Math.round(durationSeconds * 0.5);
            }
        });
        
        return {
            videos: this.props.videos.length,
            playlists: playlistCount,
            duration: formatDuration(totalSeconds),
            totalWatchTime: formatDuration(watchedSeconds),
            percentageWatched: totalSeconds > 0 ? Math.round((watchedSeconds / totalSeconds) * 100) : 0
        };
    }
    
    /**
     * Converts duration string to seconds
     */
    private getDurationSeconds(duration: string): number {
        if (!duration) return 0;
        const [h = '0', m = '0', s = '0'] = duration.split(':');
        return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s);
    }
}