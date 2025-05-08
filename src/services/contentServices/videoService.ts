// src/services/contentServices/videoService.ts
import { App, TFile, TFolder, Notice } from 'obsidian';
import { BaseDataService } from '../base/baseDataService';
import { AlRawiSettings } from '../../core/settings';
import { VideoItem, PlaylistItem, VideoData, PlaylistData, FolderData } from '../../types';
import { sanitizeFileName, formatDate, renderTemplate } from '../../utils';

/**
 * Service for video and playlist data operations
 */
export class VideoService extends BaseDataService {
    /**
     * Creates a new video service
     * @param app Obsidian app instance
     * @param settings Plugin settings
     */
    constructor(app: App, settings: AlRawiSettings) {
        super(app, settings);
    }
    
    /**
     * Loads all videos and playlists
     * @returns Object containing videos, playlists, and metadata
     */
    async loadVideosAndPlaylists(): Promise<{
        videos: VideoItem[];
        playlists: PlaylistItem[];
        presenters: string[];
        categories: string[];
        tags: string[];
    }> {
        const alrawiFolder = this.settings.defaultFolder || 'Al-Rawi Videos';
        const folder = this.app.vault.getAbstractFileByPath(alrawiFolder);
        
        if (!folder || !(folder instanceof TFolder)) {
            return {
                videos: [],
                playlists: [],
                presenters: [],
                categories: [],
                tags: []
            };
        }
    
        const files = this.getFilesInFolder(folder);
        const videos: VideoItem[] = [];
        const playlists: PlaylistItem[] = [];
        const presenterSet = new Set<string>();
        const categorySet = new Set<string>();
        const tagSet = new Set<string>();
    
        for (const file of files) {
            const cache = this.app.metadataCache.getFileCache(file);
            if (!cache?.frontmatter) continue;
    
            const fm = cache.frontmatter;
            const type = fm['النوع'];
            const presenter = fm['الملقي'] || 'غير معروف';
            const duration = fm['المدة'] || fm['المدة الإجمالية'] || '00:00:00';
            const url = fm['رابط'] || fm['رابط القائمة'] || fm['رابط السلسلة'];
            const title = fm['title'] || file.basename;
            const itemCount = fm['عدد المقاطع'];
            const videoId = fm['معرف الفيديو'];
            const thumbnailUrl = fm['الصورة المصغرة'];
            const status = fm['الحالة'] || this.settings.progressTracking.defaultStatus;
            const dateAdded = fm['تاريخ الإضافة'] || file.stat.ctime.toString();
            

            // Process categories
            const categories = this.processTags(fm['التصنيفات']);
            categories.forEach(cat => categorySet.add(cat));

            // Process tags
            const tags = this.processTags(fm['الوسوم']);
            
            // Track unique values
            presenterSet.add(presenter);
            tags.forEach(tag => tagSet.add(tag));
            
            // Add to appropriate collection
            if (type === 'سلسلة' || type === 'قائمة') {
                playlists.push({
                    title,
                    presenter,
                    itemCount: parseInt(itemCount) || 0,
                    duration,
                    url,
                    filePath: file.path,
                    type,
                    status,
                    dateAdded,
                    categories,
                    tags,
                    thumbnailUrl
                });
            } else {
                // Parse duration
                const [h = 0, m = 0, s = 0] = duration.split(':').map(Number);
                const durationSeconds = h * 3600 + m * 60 + s;
                
                videos.push({
                    title,
                    presenter,
                    duration,
                    durationSeconds,
                    url,
                    videoId,
                    thumbnailUrl,
                    filePath: file.path,
                    type: type || 'مقطع',
                    status,
                    dateAdded,
                    categories,
                    tags
                });
            }
        }
        
        return {
            videos,
            playlists, 
            presenters: Array.from(presenterSet).sort(),
            categories: Array.from(categorySet).sort(),
            tags: Array.from(tagSet).sort()
        };
    }
    
    /**
     * Creates a new video note
     * @param data Video data
     * @returns Whether the operation was successful
     */
    async createVideoNote(data: VideoData): Promise<boolean> {
        try {
            const formattedDate = formatDate(new Date(), this.settings.dateFormat);
            const status = data.status || this.settings.progressTracking.defaultStatus;
    
            // Resolve folder path
            const folderPath = await this.resolveFolderPath({
                type: data.type,
                presenter: data.presenter,
                date: formattedDate
            });
            
            // Create sanitized filename
            const sanitizedTitle = sanitizeFileName(data.title, this.settings.maxTitleLength);
            const fileName = `${sanitizedTitle}.md`;
            const fullPath = `${folderPath}/${fileName}`;
            
            // Check if file already exists
            if (this.app.vault.getAbstractFileByPath(fullPath)) {
                console.log(`Video already exists: ${fullPath}`);
                return false;
            }

    
            // Render content using template
            const content = renderTemplate(this.settings.templates.video, {
                ...data,
                date: formattedDate,
                dateAdded: new Date().toISOString(),
                tags: data.tags,
                categories: Array.isArray(data.categories) ? data.categories.join(', ') : data.categories,
                status
            });
            
            // Create folder if needed
            if (!await this.ensureFolderExists(folderPath)) {
                return false;
            }
            
            // Create file
            await this.app.vault.create(fullPath, content);
            return true;
            
        } catch (error) {
            console.error('Error creating video note:', error);
            return false;
        }
    }
    
    /**
     * Creates a new playlist note
     * @param data Playlist data
     * @returns Whether the operation was successful
     */
    async createPlaylistNote(data: PlaylistData): Promise<boolean> {
        try {
            const formattedDate = formatDate(new Date(), this.settings.dateFormat);
            const status = data.status || this.settings.progressTracking.defaultStatus;
            
            // Resolve folder path
            const folderPath = await this.resolveFolderPath({
                type: data.type,
                presenter: data.presenter,
                date: formattedDate
            });
            
            // Create sanitized filename
            const sanitizedTitle = sanitizeFileName(data.title, this.settings.maxTitleLength);
            const fileName = `${sanitizedTitle}.md`;
            const fullPath = `${folderPath}/${fileName}`;
            
            // Check if file already exists
            if (this.app.vault.getAbstractFileByPath(fullPath)) {
                console.log(`Playlist already exists: ${fullPath}`);
                return false;
            }
            
            // Choose template based on content type
            const template = this.settings.templates.playlist;
    
            // Render content using template
            const content = renderTemplate(template, {
                ...data,
                date: formattedDate,
                dateAdded: new Date().toISOString(),
                status,
                thumbnailUrl: data.thumbnailUrl || '', // Pass thumbnail
                tags: data.tags || [], // Pass tags,
                categories: Array.isArray(data.categories) ? data.categories.join(', ') : data.categories,
            });
            
            // Create folder if needed
            if (!await this.ensureFolderExists(folderPath)) {
                return false;
            }
            
            // Create file
            await this.app.vault.create(fullPath, content);
            return true;
            
        } catch (error) {
            console.error('Error creating playlist note:', error);
            return false;
        }
    }
    
    /**
     * Resolves the folder path based on rules and data
     * @param data Folder data for path resolution
     * @returns Resolved folder path
     */
    async resolveFolderPath(data: FolderData): Promise<string> {
        if (!this.settings.folderRules.enabled) {
            return this.settings.defaultFolder;
        }
    
        const dateObj = data.date ? new Date(data.date) : new Date();
        const replacements: Record<string, string> = {
            '{{type}}': data.type,
            '{{presenter}}': data.presenter || this.settings.defaultPresenter,
            '{{date}}': formatDate(dateObj, 'YYYY-MM-DD'),
            '{{year}}': dateObj.getFullYear().toString(),
            '{{month}}': (dateObj.getMonth() + 1).toString().padStart(2, '0'),
            '{{day}}': dateObj.getDate().toString().padStart(2, '0')
        };
    
        let folderPath = this.settings.folderRules.structure;
        for (const [key, value] of Object.entries(replacements)) {
            folderPath = folderPath.replace(new RegExp(key, 'g'), value);
        }
    
        // Sanitize folder names
        folderPath = folderPath.split('/')
            .map((part: string) => sanitizeFileName(part))
            .join('/');
    
        return `${this.settings.defaultFolder}/${folderPath}`;
    }
    
    /**
     * Gets existing presenter names
     * @returns Array of presenter names
     */
    async getExistingPresenters(): Promise<string[]> {
        const folder = this.app.vault.getAbstractFileByPath(this.settings.defaultFolder);
        if (!folder || !(folder instanceof TFolder)) return [];
    
        const files = this.getFilesInFolder(folder);
        const presenters = new Set<string>();
    
        for (const file of files) {
            const cache = this.app.metadataCache.getFileCache(file);
            if (cache?.frontmatter?.الملقي) {
                presenters.add(cache.frontmatter.الملقي);
            }
        }
    
        return Array.from(presenters).sort();
    }


        /**
     * Gets existing video categories
     * @returns Array of category names
     */
        async getExistingVideoCategories(): Promise<string[]> {
            const folder = this.app.vault.getAbstractFileByPath(this.settings.defaultFolder);
            if (!folder || !(folder instanceof TFolder)) return [];
        
            const files = this.getFilesInFolder(folder);
            const categories = new Set<string>();
        
            for (const file of files) {
                const cache = this.app.metadataCache.getFileCache(file);
                if (cache?.frontmatter?.['التصنيفات']) {
                    const cats = this.processTags(cache.frontmatter['التصنيفات']);
                    cats.forEach(cat => categories.add(cat));
                }
            }
        
            return Array.from(categories).sort();
        }


            /**
     * Updates an item's categories
     * @param filePath Path to the file
     * @param categories Array of categories
     * @returns Whether the operation was successful
     */
            async updateVideoCategories(filePath: string, categories: string[]): Promise<boolean> {
                try {
                    const file = this.app.vault.getAbstractFileByPath(filePath);
                    if (!(file instanceof TFile)) return false;
            
                    // Read the file content
                    let content = await this.app.vault.read(file);
                    
                    // Format categories string
                    const categoriesString = categories.join(', ');
                    
                    // Update categories in frontmatter
                    if (content.includes('التصنيفات:')) {
                        const updatedContent = content.replace(
                            /التصنيفات:.*$/m,
                            `التصنيفات: ${categoriesString}`
                        );
                        await this.app.vault.modify(file, updatedContent);
                    } else {
                        // Add categories field if it doesn't exist
                        const frontmatterEndIndex = content.indexOf('---', 3);
                        if (frontmatterEndIndex !== -1) {
                            const updatedContent = 
                                content.substring(0, frontmatterEndIndex) + 
                                `التصنيفات: ${categoriesString}\n` +
                                content.substring(frontmatterEndIndex);
                            await this.app.vault.modify(file, updatedContent);
                        }
                    }
                    
                    return true;
                } catch (error) {
                    console.error('Error updating categories:', error);
                    return false;
                }
            }

    
    /**
     * Gets existing tags for videos
     * @returns Array of tag names
     */
    async getVideoTags(): Promise<string[]> {
        const folder = this.app.vault.getAbstractFileByPath(this.settings.defaultFolder);
        if (!folder || !(folder instanceof TFolder)) return [];
    
        const files = this.getFilesInFolder(folder);
        const tags = new Set<string>();
    
        for (const file of files) {
            const cache = this.app.metadataCache.getFileCache(file);
            if (cache?.frontmatter?.['الوسوم']) {
                const fileTags = this.processTags(cache.frontmatter['الوسوم']);
                fileTags.forEach(tag => tags.add(tag));
            }
        }
    
        return Array.from(tags).sort();
    }
    
    /**
     * Updates an item's status
     * @param filePath Path to the file
     * @param newStatus New status value
     * @returns Whether the operation was successful
     */
    async updateItemStatus(filePath: string, newStatus: string): Promise<boolean> {
        try {
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (!(file instanceof TFile)) return false;
    
            // Read the file content
            let content = await this.app.vault.read(file);
            
            // Update the status in frontmatter
            const updatedContent = this.updateFrontmatterValue(content, 'الحالة', newStatus);
            
            // Write the updated content back to the file
            await this.app.vault.modify(file, updatedContent);
            return true;
            
        } catch (error) {
            console.error('Error updating status:', error);
            return false;
        }
    }


    // src/services/contentServices/videoService.ts
// Update the importVideosData method to check for existing videos

async importVideosData(jsonData: string): Promise<{success: number, failed: number}> {
    try {
        const data = JSON.parse(jsonData);
        let success = 0;
        let failed = 0;
        
        // First, load current videos and playlists to check for duplicates
        const currentData = await this.loadVideosAndPlaylists();
        const existingFilePaths = [...currentData.videos.map(v => v.filePath), ...currentData.playlists.map(p => p.filePath)];
        const existingTitles = [...currentData.videos.map(v => v.title.toLowerCase().trim()), 
                               ...currentData.playlists.map(p => p.title.toLowerCase().trim())];
        
        // Handle the new format with items array (export with content)
        if (Array.isArray(data.items)) {
            for (const item of data.items) {
                try {
                    let result = false;
                    
                    // Check if the item already exists by title
                    const itemTitle = item.title.toLowerCase().trim();
                    const isDuplicate = existingTitles.includes(itemTitle);
                    
                    // Skip if item already exists
                    if (isDuplicate) {
                        console.log(`Skipping duplicate item: ${item.title}`);
                        failed++; // Count as failed since we're skipping
                        continue;
                    }
                    
                    // Check if the item has content
                    if (item.content) {
                        // Create folders if needed
                        const folderPath = await this.resolveFolderPath({
                            type: item.type,
                            presenter: item.presenter,
                            date: item.dateAdded
                        });
                        
                        if (!this.app.vault.getAbstractFileByPath(folderPath)) {
                            await this.app.vault.createFolder(folderPath);
                        }
                        
                        // Create file with existing content
                        const sanitizedTitle = sanitizeFileName(item.title, this.settings.maxTitleLength);
                        const fileName = `${sanitizedTitle}.md`;
                        const filePath = `${folderPath}/${fileName}`;
                        
                        // Check if the file already exists
                        if (this.app.vault.getAbstractFileByPath(filePath)) {
                            console.log(`File already exists: ${filePath}`);
                            failed++;
                            continue;
                        }
                        
                        // Create or overwrite the file with content
                        await this.app.vault.create(filePath, item.content);
                        result = true;
                    } else {
                        // Process as normal based on type
                        if (item.type === 'سلسلة' || item.type === 'قائمة') {
                            result = await this.createPlaylistNote({
                                url: item.url,
                                playlistId: item.playlistId || '',
                                title: item.title,
                                presenter: item.presenter,
                                type: item.type,
                                itemCount: item.itemCount || 0,
                                duration: item.duration,
                                status: item.status
                            });
                        } else {
                            result = await this.createVideoNote({
                                url: item.url,
                                videoId: item.videoId || '',
                                title: item.title,
                                duration: item.duration,
                                presenter: item.presenter,
                                type: item.type || 'مقطع',
                                description: item.description || '',
                                tags: item.tags || [],
                                thumbnailUrl: item.thumbnailUrl || '',
                                status: item.status
                            });
                        }
                    }
                    
                    if (result) success++;
                    else failed++;
                } catch (e) {
                    console.error('Error importing item:', e);
                    failed++;
                }
            }
            
            return { success, failed };
        }
        
        // Handle the original format
        if (Array.isArray(data.videos)) {
            for (const video of data.videos) {
                try {
                    // Check if video already exists by title
                    const videoTitle = video.title.toLowerCase().trim();
                    const isDuplicate = existingTitles.includes(videoTitle);
                    
                    if (isDuplicate) {
                        console.log(`Skipping duplicate video: ${video.title}`);
                        failed++;
                        continue;
                    }
                    
                    const result = await this.createVideoNote({
                        url: video.url,
                        videoId: video.videoId || '',
                        title: video.title,
                        duration: video.duration,
                        presenter: video.presenter,
                        type: video.type || 'مقطع',
                        description: video.description || '',
                        tags: video.tags || [],
                        thumbnailUrl: video.thumbnailUrl || '',
                        status: video.status
                    });
                    
                    if (result) success++;
                    else failed++;
                } catch (e) {
                    console.error('Error importing video:', e);
                    failed++;
                }
            }
        }
        
        if (Array.isArray(data.playlists)) {
            for (const playlist of data.playlists) {
                try {
                    // Check if playlist already exists by title
                    const playlistTitle = playlist.title.toLowerCase().trim();
                    const isDuplicate = existingTitles.includes(playlistTitle);
                    
                    if (isDuplicate) {
                        console.log(`Skipping duplicate playlist: ${playlist.title}`);
                        failed++;
                        continue;
                    }
                    
                    const result = await this.createPlaylistNote({
                        url: playlist.url,
                        playlistId: playlist.playlistId || '',
                        title: playlist.title,
                        presenter: playlist.presenter,
                        type: playlist.type,
                        itemCount: playlist.itemCount || 0,
                        duration: playlist.duration,
                        status: playlist.status
                    });
                    
                    if (result) success++;
                    else failed++;
                } catch (e) {
                    console.error('Error importing playlist:', e);
                    failed++;
                }
            }
        }
        
        return { success, failed };
    } catch (error) {
        console.error('Error parsing import data:', error);
        throw new Error('Invalid import data format');
    }
}


    async exportVideosData(selectedFilePaths: string[] = []): Promise<string> {
        const { videos, playlists } = await this.loadVideosAndPlaylists();
        
        // Filter items based on selected paths if provided
        const filteredVideos = selectedFilePaths.length > 0 
            ? videos.filter(v => selectedFilePaths.includes(v.filePath))
            : videos;
            
        const filteredPlaylists = selectedFilePaths.length > 0
            ? playlists.filter(p => selectedFilePaths.includes(p.filePath))
            : playlists;
        
        const exportData = {
            videos: filteredVideos,
            playlists: filteredPlaylists,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        return JSON.stringify(exportData, null, 2);
    }


    async exportVideosDataWithContent(selectedFilePaths: string[] = []): Promise<string> {
        // Load all videos and playlists
        const { videos, playlists } = await this.loadVideosAndPlaylists();
        
        // Filter items based on selected paths if provided
        const filteredVideos = selectedFilePaths.length > 0 
            ? videos.filter(v => selectedFilePaths.includes(v.filePath))
            : videos;
            
        const filteredPlaylists = selectedFilePaths.length > 0
            ? playlists.filter(p => selectedFilePaths.includes(p.filePath))
            : playlists;
        
        // Enhanced export with content
        const exportItems = [];
        
        // Process videos with content
        for (const video of filteredVideos) {
            try {
                const file = this.app.vault.getAbstractFileByPath(video.filePath);
                if (file instanceof TFile) {
                    const content = await this.app.vault.read(file);
                    exportItems.push({
                        ...video,
                        content
                    });
                }
            } catch (error) {
                console.error(`Error reading content for ${video.filePath}:`, error);
                // Include item without content if there's an error
                exportItems.push(video);
            }
        }
        
        // Process playlists with content
        for (const playlist of filteredPlaylists) {
            try {
                const file = this.app.vault.getAbstractFileByPath(playlist.filePath);
                if (file instanceof TFile) {
                    const content = await this.app.vault.read(file);
                    exportItems.push({
                        ...playlist,
                        content
                    });
                }
            } catch (error) {
                console.error(`Error reading content for ${playlist.filePath}:`, error);
                // Include item without content if there's an error
                exportItems.push(playlist);
            }
        }
        
        const exportData = {
            items: exportItems,
            exportDate: new Date().toISOString(),
            version: '1.1' // Update version to reflect new format
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    async exportVideosToCsv(selectedFilePaths: string[] = []): Promise<string> {
        const { videos, playlists } = await this.loadVideosAndPlaylists();
        
        // Filter items based on selected paths if provided
        const filteredVideos = selectedFilePaths.length > 0 
            ? videos.filter(v => selectedFilePaths.includes(v.filePath))
            : videos;
            
        const filteredPlaylists = selectedFilePaths.length > 0
            ? playlists.filter(p => selectedFilePaths.includes(p.filePath))
            : playlists;
    
        // Create CSV header
        const header = 'العنوان,الملقي,النوع,الحالة,المدة,رابط اليوتيوب,تاريخ الإضافة,الوسوم\n';
        
        // Helper function to safely prepare CSV field
        const prepareField = (value: any): string => {
            if (value === null || value === undefined) return '';
            const str = String(value);
            // Escape quotes and wrap in quotes if contains comma or quote
            if (str.includes('"') || str.includes(',')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };
    
        // Convert items to CSV rows with proper null checks
        const rows = [...filteredVideos, ...filteredPlaylists].map(item => {
            return [
                prepareField(item.title),
                prepareField(item.presenter),
                prepareField(item.type),
                prepareField(item.status),
                prepareField(item.duration),
                prepareField(item.url),
                prepareField(item.dateAdded),
                prepareField(Array.isArray(item.tags) ? item.tags.join(', ') : '')
            ].join(',');
        }).join('\n');
        
        return header + rows;
    }

}