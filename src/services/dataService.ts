// src/services/dataService.ts
import { App, TAbstractFile, TFile } from 'obsidian';
import { AlRawiSettings } from '../core/settings';
import { VideoService } from './contentServices/videoService';
import { BookService } from './contentServices/bookService';
import { BenefitService } from './contentServices/benefitService';
import { 
    VideoItem, PlaylistItem, VideoData, PlaylistData, 
    BookItem, BookData, Benefit, BulkOperation 
} from '../types';

/**
 * Main data service facade that coordinates specialized services
 */
export class DataService {
    private app: App;
    private settings: AlRawiSettings;
    private videoService: VideoService;
    private bookService: BookService;
    private benefitService: BenefitService;
    
    /**
     * Creates a new data service
     * @param app Obsidian app instance
     * @param settings Plugin settings
     */
    constructor(app: App, settings: AlRawiSettings) {
        this.app = app;
        this.settings = settings;
        this.videoService = new VideoService(app, settings);
        this.bookService = new BookService(app, settings);
        this.benefitService = new BenefitService(app, settings);
    }
    
    /* Video-related methods */
    
    /**
     * Loads videos and playlists
     */
    async loadVideosAndPlaylists() {
        return this.videoService.loadVideosAndPlaylists();
    }
    
    /**
     * Creates a new video note
     */
    async createVideoNote(data: VideoData) {
        return this.videoService.createVideoNote(data);
    }
    
    /**
     * Creates a new playlist note
     */
    async createPlaylistNote(data: PlaylistData) {
        return this.videoService.createPlaylistNote(data);
    }
    
    /**
     * Gets existing presenter names
     */
    async getExistingPresenters() {
        return this.videoService.getExistingPresenters();
    }

    /**
     * Gets existing video categories
     */
    async getExistingVideoCategories() {
        return this.videoService.getExistingVideoCategories();
    }

    /**
     * Updates video categories
     */
    async updateVideoCategories(filePath: string, categories: string[]) {
        return this.videoService.updateVideoCategories(filePath, categories);
    }

    async importVideosData(jsonData: string): Promise<{success: number, failed: number}> {
        return this.videoService.importVideosData(jsonData);
    }


    async exportVideosData(selectedFilePaths: string[] = []): Promise<string> {
        return this.videoService.exportVideosData(selectedFilePaths);
    }

    
    async exportVideosDataWithContent(selectedFilePaths: string[] = []): Promise<string> {
        return this.videoService.exportVideosDataWithContent(selectedFilePaths);
    }


    async exportVideosToCsv(selectedFilePaths: string[] = []): Promise<string> {
        return this.videoService.exportVideosToCsv(selectedFilePaths);
    }

    /* Book-related methods */
    
    /**
     * Gets cached books or loads if needed
     */
    async getCachedBooks(forceRefresh = false) {
        return this.bookService.getCachedBooks(forceRefresh);
    }
    
    /**
     * Loads all books
     */
    async loadBooks() {
        return this.bookService.loadBooks();
    }
    
    /**
     * Gets data for a specific book
     */
    async getBookData(filePath: string) {
        return this.bookService.getBookData(filePath);
    }
    
    /**
     * Creates a new book note
     */
    async createBookNote(data: BookData) {
        return this.bookService.createBookNote(data);
    }
    
    /**
     * Updates an existing book note
     */
    async updateBookNote(filePath: string, data: BookData) {
        return this.bookService.updateBookNote(filePath, data);
    }
    
    /**
     * Updates a book's reading progress
     */
    async updateBookProgress(filePath: string, pagesRead: number) {
        return this.bookService.updateBookProgress(filePath, pagesRead);
    }
    
    /**
     * Updates a book's start date
     */
    async updateBookStartDate(filePath: string, startDate: string) {
        return this.bookService.updateBookStartDate(filePath, startDate);
    }
    
    /**
     * Updates a book's completion date
     */
    async updateBookCompletionDate(filePath: string, completionDate: string) {
        return this.bookService.updateBookCompletionDate(filePath, completionDate);
    }
    
    async updateBookCategories(filePath: string, categories: string[]) {
        return this.bookService.updateBookCategories(filePath, categories);
    }

    /**
     * Gets existing book authors
     */
    async getExistingBookAuthors() {
        return this.bookService.getExistingBookAuthors();
    }
    
    /**
     * Gets existing book categories
     */
    async getExistingBookCategories() {
        return this.bookService.getExistingBookCategories();
    }
    
    /**
     * Gets reading statistics
     */
    getReadingStats() {
        return this.bookService.getReadingStats();
    }
    

    async importBooksData(jsonData: string): Promise<{success: number, failed: number}> {
        return this.bookService.importBooksData(jsonData);
    }


    async exportBooksData(selectedFilePaths: string[] = []): Promise<string> {
        return this.bookService.exportBooksData(selectedFilePaths);
    }


    async exportBooksDataWithContent(selectedFilePaths: string[] = []): Promise<string> {
        return this.bookService.exportBooksDataWithContent(selectedFilePaths);
    }


    async exportBooksToCsv(selectedFilePaths: string[] = []): Promise<string> {
        return this.bookService.exportBooksToCsv(selectedFilePaths);
    }


    /* Benefit-related methods */
    
    /**
     * Adds a benefit to a note
     */
    async addBenefitToNote(filePath: string, benefitData: Benefit) {
        return this.benefitService.addBenefitToNote(filePath, benefitData);
    }
    
    /**
     * Updates a benefit
     */
    async updateBenefit(filePath: string, updatedBenefit: Benefit) {
        return this.benefitService.updateBenefit(filePath, updatedBenefit);
    }
    
    /**
     * Gets all benefits from all notes
     */
    async getAllBenefits() {
        return this.benefitService.getAllBenefits();
    }
    
    /**
     * Gets sources with benefits count
     */
    async getSourcesWithBenefitsCount() {
        return this.benefitService.getSourcesWithBenefitsCount();
    }
    
    /**
     * Counts benefits in a source
     */
    async countBenefitsInSource(sourcePath: string) {
        return this.benefitService.countBenefitsInSource(sourcePath);
    }
    
    /**
     * Gets existing benefit categories
     */
    async getExistingBenefitCategories() {
        return this.benefitService.getExistingBenefitCategories();
    }
    
    /* Common methods */
    
    /**
     * Gets existing tags for content type
     */
    async getExistingTags(contentType: 'videos' | 'books' = 'videos'): Promise<string[]> {
        if (contentType === 'books') {
            return this.bookService.getBookTags();
        } else {
            return this.videoService.getVideoTags();
        }
    }
    
    /**
     * Updates an item's status
     */
    async updateItemStatus(filePath: string, newStatus: string): Promise<boolean> {
        // This may be a book or video; the implementation is the same
        return this.videoService.updateItemStatus(filePath, newStatus);
    }
    
    /**
     * Updates an item's tags
     */
    async updateItemTags(filePath: string, tags: string[]): Promise<boolean> {
        try {
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (!(file instanceof TFile)) return false;
    
            // Read the file content
            let content = await this.app.vault.read(file);
            
            // Format tags string
            const tagsString = tags.join(', ');
            
            // Check if tags line exists
            if (content.includes('الوسوم:')) {
                // Update existing tags
                const updatedContent = content.replace(
                    /الوسوم:.*$/m,
                    `الوسوم: ${tagsString}`
                );
                await this.app.vault.modify(file, updatedContent);
            } else {
                // Add tags line to frontmatter
                const frontmatterEndIndex = content.indexOf('---', 3);
                if (frontmatterEndIndex !== -1) {
                    const updatedContent = 
                        content.substring(0, frontmatterEndIndex) + 
                        `الوسوم: ${tagsString}\n` +
                        content.substring(frontmatterEndIndex);
                    await this.app.vault.modify(file, updatedContent);
                }
            }
            
            return true;
            
        } catch (error) {
            console.error('Error updating tags:', error);
            return false;
        }
    }
    
    /**
     * Performs a bulk operation on multiple items
     */
    async performBulkOperation(operation: BulkOperation): Promise<{success: number, failed: number}> {
        let success = 0;
        let failed = 0;
        
        for (const filePath of operation.itemPaths) {
            let result = false;
            
            switch (operation.type) {
                case 'status':
                    if (operation.value) {
                        result = await this.updateItemStatus(filePath, operation.value);
                    }
                    break;
                    
                case 'tag':
                    if (operation.value) {
                        const file = this.app.vault.getAbstractFileByPath(filePath);
                        if (file) {
                            const cache = file instanceof TFile ? this.app.metadataCache.getFileCache(file) : null;
                            const currentTags = cache?.frontmatter?.['الوسوم'] || [];
                            const tags = Array.isArray(currentTags) ? currentTags : 
                                currentTags.split(',').map((t: string) => t.trim());
                            
                            if (!tags.includes(operation.value)) {
                                tags.push(operation.value);
                                result = await this.updateItemTags(filePath, tags);
                            } else {
                                result = true; // Tag already exists
                            }
                        }
                    }
                    break;
                
                // New case for category operations
                case 'category':
                    if (operation.value) {
                        // Get item type
                        const itemInfo = await this.getNoteType(filePath);
                        
                        if (itemInfo.type === 'book') {
                            // For books, get existing categories and add the new one
                            const book = await this.getBookData(filePath);
                            if (book) {
                                const categories = book.categories || [];
                                if (!categories.includes(operation.value)) {
                                    categories.push(operation.value);
                                    result = await this.updateBookCategories(filePath, categories);
                                } else {
                                    result = true; // Category already exists
                                }
                            }
                        } else if (itemInfo.type === 'video') {
                            // For videos, similar approach
                            // Get existing categories (this would depend on your data structure)
                            // This is a placeholder implementation
                            const file = this.app.vault.getAbstractFileByPath(filePath);
                            if (file instanceof TFile) {
                                const cache = this.app.metadataCache.getFileCache(file);
                                const currentCategories = cache?.frontmatter?.['التصنيفات'] || [];
                                const categories = Array.isArray(currentCategories) ? currentCategories : 
                                    currentCategories.split(',').map((c: string) => c.trim());
                                
                                if (!categories.includes(operation.value)) {
                                    categories.push(operation.value);
                                    result = await this.updateVideoCategories(filePath, categories);
                                } else {
                                    result = true; // Category already exists
                                }
                            }
                        }
                    }
                    break;
                    
                case 'delete':
                    const file = this.app.vault.getAbstractFileByPath(filePath);
                    if (file) {
                        try {
                            await this.app.vault.delete(file);
                            result = true;
                        } catch (error) {
                            console.error('Error deleting file:', error);
                            result = false;
                        }
                    }
                    break;
            }
            
            if (result) {
                success++;
            } else {
                failed++;
            }
        }
        
        return { success, failed };
    }
    
    /**
     * Gets the type of a note
     */
    async getNoteType(filePath: string): Promise<{type: 'book' | 'video' | null, title: string}> {
        try {
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (!file) return { type: null, title: '' };
            
            const cache = file instanceof TFile ? this.app.metadataCache.getFileCache(file) : null;
            if (!cache?.frontmatter) return { type: null, title: '' };
            
            const fm = cache.frontmatter;
            
            // Check for book-specific fields
            if (fm['المؤلف'] || fm['الصفحات']) {
                return { 
                    type: 'book', 
                    title: fm['العنوان'] || (file instanceof TFile ? file.basename : '')  
                };
            }
            
            // Check for video-specific fields
            if (fm['الملقي'] || fm['رابط'] || fm['معرف الفيديو']) {
                return { 
                    type: 'video', 
                    title: fm.title || (file instanceof TFile ? file.basename : '')  
                };
            }
            
            return { type: null, title: (file instanceof TFile ? file.basename : '')   };
        } catch (error) {
            console.error('Error determining note type:', error);
            return { type: null, title: '' };
        }
    }
}