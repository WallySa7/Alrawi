// src/services/contentServices/bookService.ts
import { App, TFile, TFolder, Notice } from 'obsidian';
import { BaseDataService } from '../base/baseDataService';
import { AlRawiSettings } from '../../core/settings';
import { BookItem, BookData } from '../../types';
import { sanitizeFileName, formatDate, renderTemplate } from '../../utils';

/**
 * Service for book data operations
 */
export class BookService extends BaseDataService {
    /**
     * Cache for book data to improve performance
     */
    private cachedBooks: {
        books: BookItem[],
        authors: string[],
        categories: string[]
    } | null = null;

    /**
     * Creates a new book service
     * @param app Obsidian app instance
     * @param settings Plugin settings
     */
    constructor(app: App, settings: AlRawiSettings) {
        super(app, settings);
    }
    
    /**
     * Gets cached books data, refreshing if needed
     * @param forceRefresh Whether to force a data refresh
     * @returns Books data including metadata
     */
    async getCachedBooks(forceRefresh = false): Promise<{
        books: BookItem[],
        authors: string[],
        categories: string[]
    }> {
        if (!this.cachedBooks || forceRefresh) {
            this.cachedBooks = await this.loadBooks();
        }
        return this.cachedBooks;
    }
    
    /**
     * Loads all books and related metadata
     * @returns Books data including metadata
     */
    async loadBooks(): Promise<{
        books: BookItem[];
        authors: string[];
        categories: string[];
    }> {
        const booksFolder = this.settings.booksSettings.defaultFolder || 'Al-Rawi Books';
        const folder = this.app.vault.getAbstractFileByPath(booksFolder);
        
        if (!folder || !(folder instanceof TFolder)) {
            return {
                books: [],
                authors: [],
                categories: []
            };
        }
    
        const files = this.getFilesInFolder(folder);
        const books: BookItem[] = [];
        const authorSet = new Set<string>();
        const categorySet = new Set<string>();
    
        for (const file of files) {
            const cache = this.app.metadataCache.getFileCache(file);
            if (!cache?.frontmatter) continue;
    
            const fm = cache.frontmatter;
            const type = fm['النوع'];
            
            // Skip if not a book type
            if (type !== 'كتاب') continue;
            
            const title = fm['العنوان'] || file.basename;
            const author = fm['المؤلف'] || this.settings.booksSettings.defaultAuthor;
            const pages = parseInt(fm['الصفحات']) || 0;
            const pagesRead = parseInt(fm['الصفحات المقروءة']) || 0;
            const isbn = fm['الرقم المعياري ISBN'];
            const publisher = fm['الناشر'];
            const publishYear = parseInt(fm['سنة النشر']) || undefined;
            const startDate = fm['تاريخ البدء'];
            const completionDate = fm['تاريخ الانتهاء'];
            const language = fm['اللغة'] || 'العربية';
            const rating = parseInt(fm['التقييم']) || 0;
            const status = fm['الحالة'] || this.settings.booksSettings.defaultStatus;
            const dateAdded = fm['تاريخ الإضافة'] || file.stat.ctime.toString();
            const coverUrl = fm['صورة الغلاف'];
            
            // Process categories
            const categories = this.processTags(fm['التصنيفات']);
            
            // Process tags
            const tags = this.processTags(fm['الوسوم']);
            
            // Track collections
            authorSet.add(author);
            categories.forEach(cat => categorySet.add(cat));
            
            books.push({
                title,
                author,
                isbn,
                pages,
                pagesRead,
                publisher,
                publishYear,
                startDate,
                completionDate,
                language,
                rating,
                status,
                dateAdded,
                coverUrl,
                filePath: file.path,
                type,
                tags,
                categories
            });
        }
        
        return {
            books,
            authors: Array.from(authorSet).sort(),
            categories: Array.from(categorySet).sort()
        };
    }
    
    /**
     * Creates a new book note
     * @param data Book data
     * @returns Whether the operation was successful
     */
    async createBookNote(data: BookData): Promise<boolean> {
        try {
            const formattedDate = formatDate(new Date(), this.settings.dateFormat);
            
            // Create path based on folder structure
            const folderPath = await this.resolveBookFolderPath({
                author: data.author,
                categories: data.categories
            });
            
            const sanitizedTitle = sanitizeFileName(data.title, this.settings.maxTitleLength);
            const fileName = `${sanitizedTitle}.md`;
            const fullPath = `${folderPath}/${fileName}`;
            
            // Check if file already exists
            if (this.app.vault.getAbstractFileByPath(fullPath)) {
                console.log(`Book already exists: ${fullPath}`);
                return false;
            }
            
            // Create content using the book template
            const content = renderTemplate(this.settings.templates.book, {
                ...data,
                date: formattedDate,
                dateAdded: new Date().toISOString(),
                showCovers: this.settings.booksSettings.showCovers,
                categories: Array.isArray(data.categories) ? data.categories.join(', ') : data.categories,
                tags: Array.isArray(data.tags) ? data.tags.join(', ') : data.tags
            });
            
            // Create folder if it doesn't exist
            if (!await this.ensureFolderExists(folderPath)) {
                return false;
            }
            
            // Create the file
            await this.app.vault.create(fullPath, content);
            
            // Invalidate cache
            this.cachedBooks = null;
            
            return true;
            
        } catch (error) {
            console.error('Error creating book note:', error);
            return false;
        }
    }
    
    /**
     * Updates an existing book note
     * @param filePath Path to the book file
     * @param data Updated book data
     * @returns Whether the operation was successful
     */
    async updateBookNote(filePath: string, data: BookData): Promise<boolean> {
        try {
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (!(file instanceof TFile)) return false;
            
            // Get the original file content
            const originalContent = await this.app.vault.read(file);
            
            // Create updated content
            const content = renderTemplate(this.settings.templates.book, {
                ...data,
                date: file.stat.ctime.toString(), // Preserve original creation date
                dateAdded: file.stat.ctime.toString(),
                showCovers: this.settings.booksSettings.showCovers,
                categories: Array.isArray(data.categories) ? data.categories.join(', ') : data.categories,
                tags: Array.isArray(data.tags) ? data.tags.join(', ') : data.tags
            });
            
            // Update the file
            await this.app.vault.modify(file, content);
            
            // If the title changed, we may need to rename the file
            const sanitizedTitle = sanitizeFileName(data.title, this.settings.maxTitleLength);
            const newFileName = `${sanitizedTitle}.md`;
            
            if (file.name !== newFileName) {
                // Rename the file if needed
                await this.app.fileManager.renameFile(file, `${file.parent?.path || ''}/${newFileName}`);
            }
            
            // Invalidate cache
            this.cachedBooks = null;
            
            return true;
        } catch (error) {
            console.error('Error updating book note:', error);
            return false;
        }
    }
    
    /**
     * Updates a book's reading progress
     * @param filePath Path to the book file
     * @param pagesRead Number of pages read
     * @returns Whether the operation was successful
     */
    async updateBookProgress(filePath: string, pagesRead: number): Promise<boolean> {
        try {
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (!(file instanceof TFile)) return false;
    
            // Read the file content
            let content = await this.app.vault.read(file);
            
            // Update the pagesRead in frontmatter
            let updatedContent = this.updateFrontmatterValue(content, 'الصفحات المقروءة', pagesRead);
            
            // Get book data to check if we need to update status
            const bookData = await this.getBookData(filePath);
            if (bookData && bookData.pages > 0) {
                // If book is now complete, always update status to "watched" regardless of current status
                if (pagesRead >= bookData.pages) {
                    // Set status to "watched" (تمت القراءة)
                    updatedContent = this.updateFrontmatterValue(updatedContent, 'الحالة', 'تمت القراءة');
                    
                    // Add completion date if not present
                    if (!bookData.completionDate) {
                        const today = formatDate(new Date(), 'YYYY-MM-DD');
                        updatedContent = this.updateFrontmatterValue(updatedContent, 'تاريخ الانتهاء', today);
                    }
                }
                // If book was previously completed but now it's not, update status
                else if (pagesRead < bookData.pages && bookData.status === 'تمت القراءة') {
                    updatedContent = this.updateFrontmatterValue(updatedContent, 'الحالة', 'قيد القراءة');
                }
            }
            
            // Save the changes
            await this.app.vault.modify(file, updatedContent);
            
            // Invalidate cache
            this.cachedBooks = null;
            
            return true;
        } catch (error) {
            console.error('Error updating book progress:', error);
            return false;
        }
    }
    
    /**
     * Gets details for a specific book
     * @param filePath Path to the book file
     * @returns Book data or null if not found
     */
    async getBookData(filePath: string): Promise<BookItem | null> {
        try {
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (!(file instanceof TFile)) return null;
    
            const content = await this.app.vault.read(file);
            const cache = this.app.metadataCache.getFileCache(file);
            
            if (!cache?.frontmatter) return null;
            const fm = cache.frontmatter;
            
            // Process categories
            const categories = this.processTags(fm['التصنيفات']);
            
            // Process tags
            const tags = this.processTags(fm['الوسوم']);
    
            // Extract notes from content (everything after the frontmatter and headers)
            let notes = '';
            const frontmatterEndIndex = content.indexOf('---', 3);
            if (frontmatterEndIndex !== -1) {
                const contentAfterFrontmatter = content.substring(frontmatterEndIndex + 3);
                // Find the content after all headings
                const notesMatch = contentAfterFrontmatter.match(/##\s*ملاحظات\s*\n([\s\S]*?)(?=\n##|$)/);
                if (notesMatch && notesMatch[1]) {
                    notes = notesMatch[1].trim();
                }
            }
    
            return {
                title: fm['العنوان'] || file.basename,
                author: fm['المؤلف'] || this.settings.booksSettings.defaultAuthor,
                isbn: fm['الرقم المعياري ISBN'],
                pages: parseInt(fm['الصفحات']) || 0,
                pagesRead: parseInt(fm['الصفحات المقروءة']) || 0,
                publisher: fm['الناشر'],
                publishYear: parseInt(fm['سنة النشر']) || undefined,
                startDate: fm['تاريخ البدء'],
                completionDate: fm['تاريخ الانتهاء'],
                language: fm['اللغة'] || 'العربية',
                rating: parseInt(fm['التقييم']) || 0,
                status: fm['الحالة'] || this.settings.booksSettings.defaultStatus,
                dateAdded: fm['تاريخ الإضافة'] || file.stat.ctime.toString(),
                coverUrl: fm['صورة الغلاف'],
                filePath: file.path,
                type: fm['النوع'] || 'كتاب',
                tags,
                categories,
                notes
            };
        } catch (error) {
            console.error('Error getting book data:', error);
            return null;
        }
    }
    
    /**
     * Updates a book's start date
     * @param filePath Path to the book file
     * @param startDate Start date string
     * @returns Whether the operation was successful
     */
    async updateBookStartDate(filePath: string, startDate: string): Promise<boolean> {
        try {
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (!(file instanceof TFile)) return false;
    
            // Read the file content
            let content = await this.app.vault.read(file);
            
            // Update the start date in frontmatter
            const updatedContent = this.updateFrontmatterValue(content, 'تاريخ البدء', startDate);
            
            // Save the changes
            await this.app.vault.modify(file, updatedContent);
            
            // Invalidate cache
            this.cachedBooks = null;
            
            return true;
        } catch (error) {
            console.error('Error updating start date:', error);
            return false;
        }
    }
    
    /**
     * Updates a book's completion date
     * @param filePath Path to the book file
     * @param completionDate Completion date string
     * @returns Whether the operation was successful
     */
    async updateBookCompletionDate(filePath: string, completionDate: string): Promise<boolean> {
        try {
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (!(file instanceof TFile)) return false;
    
            // Read the file content
            let content = await this.app.vault.read(file);
            
            // Update the completion date in frontmatter
            const updatedContent = this.updateFrontmatterValue(content, 'تاريخ الانتهاء', completionDate);
            
            // Save the changes
            await this.app.vault.modify(file, updatedContent);
            
            // Invalidate cache
            this.cachedBooks = null;
            
            return true;
        } catch (error) {
            console.error('Error updating completion date:', error);
            return false;
        }
    }
    

    async updateBookCategories(filePath: string, categories: string[]): Promise<boolean> {
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
     * Resolves the folder path for a book
     * @param data Book folder data
     * @returns Resolved folder path
     */
    async resolveBookFolderPath(data: { author: string, categories?: string[] }): Promise<string> {
        const booksFolder = this.settings.booksSettings.defaultFolder;
        
        // If folder structure is disabled, return the default folder
        if (!this.settings.folderRules.enabled) {
            return booksFolder;
        }
        
        const structure = this.settings.booksSettings.folderStructure;
        let folderPath = structure;
        
        // Replace author placeholder
        folderPath = folderPath.replace(/{{author}}/g, data.author || this.settings.booksSettings.defaultAuthor);
        
        // Replace categories placeholder
        const category = Array.isArray(data.categories) && data.categories.length > 0 
            ? data.categories[0]  // Use first category for folder organization
            : 'عام';  // Default category
        folderPath = folderPath.replace(/{{categories}}/g, category);
        
        // Sanitize folder names
        folderPath = folderPath.split('/')
            .map((part: string) => sanitizeFileName(part))
            .join('/');
        
        return `${booksFolder}/${folderPath}`;
    }
    
    /**
     * Gets existing book authors
     * @returns Array of author names
     */
    async getExistingBookAuthors(): Promise<string[]> {
        const folder = this.app.vault.getAbstractFileByPath(this.settings.booksSettings.defaultFolder);
        if (!folder || !(folder instanceof TFolder)) return [];
    
        const files = this.getFilesInFolder(folder);
        const authors = new Set<string>();
    
        for (const file of files) {
            const cache = this.app.metadataCache.getFileCache(file);
            if (cache?.frontmatter?.['المؤلف']) {
                authors.add(cache.frontmatter['المؤلف']);
            }
        }
    
        return Array.from(authors).sort();
    }
    
    /**
     * Gets existing book categories
     * @returns Array of category names
     */
    async getExistingBookCategories(): Promise<string[]> {
        const folder = this.app.vault.getAbstractFileByPath(this.settings.booksSettings.defaultFolder);
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
     * Gets existing book tags
     * @returns Array of tag names
     */
    async getBookTags(): Promise<string[]> {
        const folder = this.app.vault.getAbstractFileByPath(this.settings.booksSettings.defaultFolder);
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
     * Calculates reading statistics
     * @returns Reading statistics object
     */
    getReadingStats(): { 
        totalBooks: number,
        readBooks: number,
        inProgressBooks: number,
        totalPages: number,
        readPages: number,
        averageCompletion: number,
        readingRate: number
    } {
        // Initialize statistics
        let totalBooks = 0;
        let readBooks = 0;
        let inProgressBooks = 0;
        let totalPages = 0;
        let readPages = 0;
        
        // Get all books from cache
        const loadedData = this.cachedBooks;
        
        if (!loadedData || !loadedData.books || loadedData.books.length === 0) {
            return {
                totalBooks: 0,
                readBooks: 0,
                inProgressBooks: 0,
                totalPages: 0,
                readPages: 0,
                averageCompletion: 0,
                readingRate: 0
            };
        }
        
        // Calculate statistics
        totalBooks = loadedData.books.length;
        
        loadedData.books.forEach(book => {
            if (book.status === 'تمت القراءة') {
                readBooks++;
            } else if (book.status === 'قيد القراءة') {
                inProgressBooks++;
            }
            
            totalPages += book.pages;
            readPages += book.pagesRead;
        });
        
        // Calculate average completion percentage
        const averageCompletion = totalPages > 0 ? (readPages / totalPages) * 100 : 0;
        
        // Calculate reading rate (pages per day)
        // Find the earliest and latest reading dates
        const timestamps: number[] = [];
        loadedData.books.forEach(book => {
            if (book.startDate) {
                timestamps.push(new Date(book.startDate).getTime());
            }
            if (book.completionDate) {
                timestamps.push(new Date(book.completionDate).getTime());
            }
        });
        
        let readingRate = 0;
        if (timestamps.length >= 2) {
            const earliestDate = Math.min(...timestamps);
            const latestDate = Math.max(...timestamps);
            const daysElapsed = (latestDate - earliestDate) / (1000 * 60 * 60 * 24);
            
            if (daysElapsed > 0) {
                readingRate = readPages / daysElapsed;
            }
        }
        
        return {
            totalBooks,
            readBooks,
            inProgressBooks,
            totalPages,
            readPages,
            averageCompletion,
            readingRate
        };
    }


    async importBooksData(jsonData: string): Promise<{success: number, failed: number}> {
        try {
            const data = JSON.parse(jsonData);
            let success = 0;
            let failed = 0;
            
            // Handle the array of books format
            if (Array.isArray(data.books)) {
                // First, load current books to check for duplicates
                const currentBooks = await this.loadBooks();
                const existingFilePaths = currentBooks.books.map(book => book.filePath);
                const existingTitles = currentBooks.books.map(book => book.title.toLowerCase().trim());
                
                for (const book of data.books) {
                    try {
                        let result = false;
                        const sanitizedTitle = sanitizeFileName(book.title, this.settings.maxTitleLength);
                        
                        // Check if the book with same title already exists
                        const bookTitle = book.title.toLowerCase().trim();
                        const isDuplicate = existingTitles.includes(bookTitle);
                        
                        // Skip if book already exists and is a duplicate
                        if (isDuplicate) {
                            console.log(`Skipping duplicate book: ${book.title}`);
                            failed++; // Count as failed since we're skipping
                            continue;
                        }
                        
                        // Check if the book has content
                        if (book.content) {
                            // Create folders if needed
                            const folderPath = await this.resolveBookFolderPath({
                                author: book.author,
                                categories: book.categories
                            });
                            
                            if (!this.app.vault.getAbstractFileByPath(folderPath)) {
                                await this.app.vault.createFolder(folderPath);
                            }
                            
                            // Create file with existing content
                            const sanitizedTitle = sanitizeFileName(book.title, this.settings.maxTitleLength);
                            const fileName = `${sanitizedTitle}.md`;
                            const filePath = `${folderPath}/${fileName}`;
                            
                            // Check if the file already exists
                            if (this.app.vault.getAbstractFileByPath(filePath)) {
                                console.log(`File already exists: ${filePath}`);
                                failed++;
                                continue;
                            }
                            
                            // Create or overwrite the file with content
                            await this.app.vault.create(filePath, book.content);
                            result = true;
                        } else {
                            // Process book without content
                            result = await this.createBookNote({
                                title: book.title,
                                author: book.author,
                                isbn: book.isbn,
                                pages: book.pages,
                                pagesRead: book.pagesRead,
                                publisher: book.publisher,
                                publishYear: book.publishYear,
                                startDate: book.startDate,
                                completionDate: book.completionDate,
                                language: book.language,
                                rating: book.rating,
                                status: book.status,
                                categories: book.categories,
                                tags: book.tags,
                                type: 'كتاب',
                                coverUrl: book.coverUrl,
                                notes: book.notes
                            });
                        }
                        
                        if (result) success++;
                        else failed++;
                    } catch (e) {
                        console.error('Error importing book:', e);
                        failed++;
                    }
                }
            } else {
                // No books array found
                throw new Error('Invalid book data format - missing books array');
            }
            
            return { success, failed };
        } catch (error) {
            console.error('Error parsing import data:', error);
            throw new Error('Invalid import data format');
        }
    }

    async exportBooksData(selectedFilePaths: string[] = []): Promise<string> {
        const booksData = await this.loadBooks();
        
        // Filter books based on selected paths if provided
        const filteredBooks = selectedFilePaths.length > 0 
            ? booksData.books.filter(b => selectedFilePaths.includes(b.filePath))
            : booksData.books;
        
        const exportData = {
            books: filteredBooks,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    async exportBooksDataWithContent(selectedFilePaths: string[] = []): Promise<string> {
        const booksData = await this.loadBooks();
        
        // Filter books based on selected paths if provided
        const filteredBooks = selectedFilePaths.length > 0 
        ? booksData.books.filter(b => selectedFilePaths.includes(b.filePath))
        : booksData.books;
            
            // Enhanced export with content
            const exportItems = [];
            
            // Process books with content
            for (const book of filteredBooks) {
                try {
                    const file = this.app.vault.getAbstractFileByPath(book.filePath);
                    if (file instanceof TFile) {
                        const content = await this.app.vault.read(file);
                        exportItems.push({
                            ...book,
                            content
                        });
                    }
                } catch (error) {
                    console.error(`Error reading content for ${book.filePath}:`, error);
                    // Include item without content if there's an error
                    exportItems.push(book);
                }
            }
            
            const exportData = {
                books: exportItems,
                exportDate: new Date().toISOString(),
                version: '1.1'
            };
            
            return JSON.stringify(exportData, null, 2);
    }

    async exportBooksToCsv(selectedFilePaths: string[] = []): Promise<string> {
        const booksData = await this.loadBooks();
        
        // Filter books based on selected paths if provided
        const filteredBooks = selectedFilePaths.length > 0 
            ? booksData.books.filter(b => selectedFilePaths.includes(b.filePath))
            : booksData.books;
    
        // Create CSV header
        const header = 'العنوان,المؤلف,عدد الصفحات,الصفحات المقروءة,الناشر,سنة النشر,الرقم المعياري ISBN,تاريخ البدء,تاريخ الانتهاء,اللغة,التقييم,الحالة,التصنيفات,الوسوم,تاريخ الإضافة\n';
        
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
    
        // Convert books to CSV rows
        const rows = filteredBooks.map(book => {
            return [
                prepareField(book.title),
                prepareField(book.author),
                prepareField(book.pages),
                prepareField(book.pagesRead),
                prepareField(book.publisher),
                prepareField(book.publishYear),
                prepareField(book.isbn),
                prepareField(book.startDate),
                prepareField(book.completionDate),
                prepareField(book.language),
                prepareField(book.rating),
                prepareField(book.status),
                prepareField(Array.isArray(book.categories) ? book.categories.join('; ') : book.categories),
                prepareField(Array.isArray(book.tags) ? book.tags.join('; ') : book.tags),
                prepareField(book.dateAdded)
            ].join(',');
        }).join('\n');
        
        return header + rows;
    }

}