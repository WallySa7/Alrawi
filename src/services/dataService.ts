import { App, TFile } from "obsidian";
import { AlRawiSettings } from "../core/settings";
import { VideoService } from "./contentServices/videoService";
import { BookService } from "./contentServices/bookService";
import { BenefitService } from "./contentServices/benefitService";
import {
	VideoData,
	PlaylistData,
	BookData,
	Benefit,
	BulkOperation,
} from "../types";

/**
 * Main data service that coordinates specialized content services
 * Acts as a facade for simpler interaction with the plugin's data operations
 */
export class DataService {
	private app: App;
	private settings: AlRawiSettings;
	private videoService: VideoService;
	private bookService: BookService;
	private benefitService: BenefitService;

	/**
	 * Creates a new data service
	 * @param app - Obsidian app instance
	 * @param settings - Plugin settings
	 */
	constructor(app: App, settings: AlRawiSettings) {
		this.app = app;
		this.settings = settings;
		this.videoService = new VideoService(app, settings);
		this.bookService = new BookService(app, settings);
		this.benefitService = new BenefitService(app, settings);
	}

	/**
	 * === VIDEO OPERATIONS ===
	 */

	/**
	 * Loads all videos and playlists
	 * @returns Object containing videos, playlists, and metadata
	 */
	async getVideosAndPlaylists() {
		return this.videoService.getVideosAndPlaylists();
	}

	/**
	 * Gets data for a specific video or playlist
	 * @param filePath - Path to the video file
	 * @returns Video or playlist data or null if not found
	 */
	async getVideoData(filePath: string) {
		return this.videoService.getVideoData(filePath);
	}

	/**
	 * Creates a new video note
	 * @param data - Video data
	 * @returns Whether creation was successful
	 */
	async createVideo(data: VideoData) {
		return this.videoService.createVideo(data);
	}

	/**
	 * Creates a new playlist note
	 * @param data - Playlist data
	 * @returns Whether creation was successful
	 */
	async createPlaylist(data: PlaylistData) {
		return this.videoService.createPlaylist(data);
	}

	/**
	 * Gets existing presenter names
	 * @returns Array of presenter names
	 */
	async getPresenterList() {
		return this.videoService.getPresenterList();
	}

	/**
	 * Gets existing video categories
	 * @returns Array of category names
	 */
	async getVideoCategories() {
		return this.videoService.getCategoryList();
	}

	/**
	 * Updates video categories
	 * @param filePath - Path to the video file
	 * @param categories - Array of categories to set
	 * @returns Whether update was successful
	 */
	async updateVideoCategories(filePath: string, categories: string[]) {
		return this.videoService.updateCategories(filePath, categories);
	}

	/**
	 * Imports videos data from JSON
	 * @param jsonData - JSON data to import
	 * @returns Object with success and failure counts
	 */
	async importVideos(
		jsonData: string
	): Promise<{ success: number; failed: number }> {
		return this.videoService.importFromJson(jsonData);
	}

	/**
	 * Exports videos data to JSON
	 * @param selectedFilePaths - Optional paths to export (all if empty)
	 * @returns JSON string of exported data
	 */
	async exportVideosToJson(
		selectedFilePaths: string[] = []
	): Promise<string> {
		return this.videoService.exportToJson(selectedFilePaths);
	}

	/**
	 * Exports videos with full content to JSON
	 * @param selectedFilePaths - Optional paths to export (all if empty)
	 * @returns JSON string of exported data with content
	 */
	async exportVideosWithContent(
		selectedFilePaths: string[] = []
	): Promise<string> {
		return this.videoService.exportWithContent(selectedFilePaths);
	}

	/**
	 * Exports videos data to CSV format
	 * @param selectedFilePaths - Optional paths to export (all if empty)
	 * @returns CSV string of exported data
	 */
	async exportVideosToCsv(selectedFilePaths: string[] = []): Promise<string> {
		return this.videoService.exportToCsv(selectedFilePaths);
	}

	/**
	 * === BOOK OPERATIONS ===
	 */

	/**
	 * Gets books data, using cache if available
	 * @param forceRefresh - Whether to force data refresh
	 * @returns Object containing books and metadata
	 */
	async getBooks(forceRefresh = false) {
		return this.bookService.getBooks(forceRefresh);
	}

	/**
	 * Gets data for a specific book
	 * @param filePath - Path to the book file
	 * @returns Book data or null if not found
	 */
	async getBookData(filePath: string) {
		return this.bookService.getBookData(filePath);
	}

	/**
	 * Creates a new book note
	 * @param data - Book data
	 * @returns Whether creation was successful
	 */
	async createBook(data: BookData) {
		return this.bookService.createBook(data);
	}

	/**
	 * Updates an existing book
	 * @param filePath - Path to the book file
	 * @param data - Updated book data
	 * @returns Whether update was successful
	 */
	async updateBook(filePath: string, data: BookData) {
		return this.bookService.updateBook(filePath, data);
	}

	/**
	 * Updates a book's reading progress
	 * @param filePath - Path to the book file
	 * @param pagesRead - Number of pages read
	 * @returns Whether update was successful
	 */
	async updateBookProgress(filePath: string, pagesRead: number) {
		return this.bookService.updateProgress(filePath, pagesRead);
	}

	/**
	 * Updates a book's start date
	 * @param filePath - Path to the book file
	 * @param startDate - Start date string
	 * @returns Whether update was successful
	 */
	async updateBookStartDate(filePath: string, startDate: string) {
		return this.bookService.updateStartDate(filePath, startDate);
	}

	/**
	 * Updates a book's completion date
	 * @param filePath - Path to the book file
	 * @param completionDate - Completion date string
	 * @returns Whether update was successful
	 */
	async updateBookCompletionDate(filePath: string, completionDate: string) {
		return this.bookService.updateCompletionDate(filePath, completionDate);
	}

	/**
	 * Updates a book's categories
	 * @param filePath - Path to the book file
	 * @param categories - Array of categories
	 * @returns Whether update was successful
	 */
	async updateBookCategories(filePath: string, categories: string[]) {
		return this.bookService.updateCategories(filePath, categories);
	}

	/**
	 * Gets existing book authors
	 * @returns Array of author names
	 */
	async getBookAuthors() {
		return this.bookService.getAuthorList();
	}

	/**
	 * Gets existing book categories
	 * @returns Array of category names
	 */
	async getBookCategories() {
		return this.bookService.getCategoryList();
	}

	/**
	 * Gets reading statistics
	 * @returns Reading statistics object
	 */
	getReadingStats() {
		return this.bookService.getReadingStats();
	}

	/**
	 * Imports books data from JSON
	 * @param jsonData - JSON data to import
	 * @returns Object with success and failure counts
	 */
	async importBooks(
		jsonData: string
	): Promise<{ success: number; failed: number }> {
		return this.bookService.importFromJson(jsonData);
	}

	/**
	 * Exports books data to JSON
	 * @param selectedFilePaths - Optional paths to export (all if empty)
	 * @returns JSON string of exported data
	 */
	async exportBooksToJson(selectedFilePaths: string[] = []): Promise<string> {
		return this.bookService.exportToJson(selectedFilePaths);
	}

	/**
	 * Exports books with full content to JSON
	 * @param selectedFilePaths - Optional paths to export (all if empty)
	 * @returns JSON string of exported data with content
	 */
	async exportBooksWithContent(
		selectedFilePaths: string[] = []
	): Promise<string> {
		return this.bookService.exportWithContent(selectedFilePaths);
	}

	/**
	 * Exports books data to CSV format
	 * @param selectedFilePaths - Optional paths to export (all if empty)
	 * @returns CSV string of exported data
	 */
	async exportBooksToCsv(selectedFilePaths: string[] = []): Promise<string> {
		return this.bookService.exportToCsv(selectedFilePaths);
	}

	/**
	 * === BENEFIT OPERATIONS ===
	 */

	/**
	 * Adds a benefit to a note
	 * @param filePath - Path to the note file
	 * @param benefitData - Benefit data to add
	 * @returns Whether operation was successful
	 */
	async addBenefit(filePath: string, benefitData: Benefit) {
		return this.benefitService.addBenefit(filePath, benefitData);
	}

	/**
	 * Updates a benefit
	 * @param filePath - Path to the note file
	 * @param updatedBenefit - Updated benefit data
	 * @returns Whether operation was successful
	 */
	async updateBenefit(filePath: string, updatedBenefit: Benefit) {
		return this.benefitService.updateBenefit(filePath, updatedBenefit);
	}

	/**
	 * Gets all benefits from all notes
	 * @returns Array of all benefits
	 */
	async getAllBenefits() {
		return this.benefitService.getAllBenefits();
	}

	/**
	 * Gets sources with benefits count
	 * @returns Array of source info with benefit counts
	 */
	async getBenefitSources() {
		return this.benefitService.getBenefitSources();
	}

	/**
	 * Counts benefits in a source
	 * @param sourcePath - Path to the source file
	 * @returns Number of benefits
	 */
	async countBenefits(sourcePath: string) {
		return this.benefitService.countBenefits(sourcePath);
	}

	/**
	 * Gets existing benefit categories
	 * @returns Array of category names
	 */
	async getBenefitCategories() {
		return this.benefitService.getCategoryList();
	}

	/**
	 * === COMMON OPERATIONS ===
	 */

	/**
	 * Gets existing tags for content type
	 * @param contentType - Type of content (videos or books)
	 * @returns Array of tag names
	 */
	async getTags(
		contentType: "videos" | "books" = "videos"
	): Promise<string[]> {
		if (contentType === "books") {
			return this.bookService.getTagList();
		} else {
			return this.videoService.getTagList();
		}
	}

	/**
	 * Updates an item's status
	 * @param filePath - Path to the file
	 * @param newStatus - New status value
	 * @returns Whether update was successful
	 */
	async updateStatus(filePath: string, newStatus: string): Promise<boolean> {
		// This may be a book or video; determine type first
		const itemInfo = await this.getContentType(filePath);

		if (itemInfo.type === "book") {
			return this.bookService.updateStatus(filePath, newStatus);
		} else if (itemInfo.type === "video") {
			return this.videoService.updateStatus(filePath, newStatus);
		}

		return false;
	}

	/**
	 * Updates an item's tags
	 * @param filePath - Path to the file
	 * @param tags - Array of tags
	 * @returns Whether update was successful
	 */
	async updateTags(filePath: string, tags: string[]): Promise<boolean> {
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) return false;

			// Format tags string
			const tagsString = tags.join(", ");

			// Read the file content
			let content = await this.app.vault.read(file);

			// Update tags in frontmatter
			if (content.includes("الوسوم:")) {
				// Update existing tags
				const updatedContent = content.replace(
					/الوسوم:.*$/m,
					`الوسوم: ${tagsString}`
				);
				await this.app.vault.modify(file, updatedContent);
			} else {
				// Add tags line to frontmatter
				const frontmatterEndIndex = content.indexOf("---", 3);
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
			console.error("Error updating tags:", error);
			return false;
		}
	}

	/**
	 * Performs a bulk operation on multiple items
	 * @param operation - Bulk operation configuration
	 * @returns Object with success and failure counts
	 */
	async performBulkOperation(
		operation: BulkOperation
	): Promise<{ success: number; failed: number }> {
		let success = 0;
		let failed = 0;

		for (const filePath of operation.itemPaths) {
			let result = false;

			switch (operation.type) {
				case "status":
					if (operation.value) {
						result = await this.updateStatus(
							filePath,
							operation.value
						);
					}
					break;

				case "tag":
					if (operation.value) {
						const file =
							this.app.vault.getAbstractFileByPath(filePath);
						if (file instanceof TFile) {
							const cache =
								this.app.metadataCache.getFileCache(file);
							const currentTags =
								cache?.frontmatter?.["الوسوم"] || [];
							const tags = Array.isArray(currentTags)
								? currentTags
								: currentTags
										.split(",")
										.map((t: string) => t.trim());

							if (!tags.includes(operation.value)) {
								tags.push(operation.value);
								result = await this.updateTags(filePath, tags);
							} else {
								result = true; // Tag already exists
							}
						}
					}
					break;

				case "category":
					if (operation.value) {
						// Get content type
						const itemInfo = await this.getContentType(filePath);

						if (itemInfo.type === "book") {
							// For books
							const book = await this.getBookData(filePath);
							if (book) {
								const categories = book.categories || [];
								if (!categories.includes(operation.value)) {
									categories.push(operation.value);
									result = await this.updateBookCategories(
										filePath,
										categories
									);
								} else {
									result = true; // Category already exists
								}
							}
						} else if (itemInfo.type === "video") {
							// For videos
							const file =
								this.app.vault.getAbstractFileByPath(filePath);
							if (file instanceof TFile) {
								const cache =
									this.app.metadataCache.getFileCache(file);
								const currentCategories =
									cache?.frontmatter?.["التصنيفات"] || [];
								const categories = Array.isArray(
									currentCategories
								)
									? currentCategories
									: currentCategories
											.split(",")
											.map((c: string) => c.trim());

								if (!categories.includes(operation.value)) {
									categories.push(operation.value);
									result = await this.updateVideoCategories(
										filePath,
										categories
									);
								} else {
									result = true; // Category already exists
								}
							}
						}
					}
					break;

				case "delete":
					const file = this.app.vault.getAbstractFileByPath(filePath);
					if (file) {
						try {
							await this.app.vault.delete(file);
							result = true;
						} catch (error) {
							console.error("Error deleting file:", error);
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
	 * Gets the type of a content note
	 * @param filePath - Path to the note file
	 * @returns Object with content type and title
	 */
	async getContentType(
		filePath: string
	): Promise<{ type: "book" | "video" | null; title: string }> {
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!file || !(file instanceof TFile)) {
				return { type: null, title: "" };
			}

			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.frontmatter) {
				return { type: null, title: file.basename };
			}

			const fm = cache.frontmatter;

			// Check for book-specific fields
			if (fm["المؤلف"] || fm["الصفحات"]) {
				return {
					type: "book",
					title: fm["العنوان"] || file.basename,
				};
			}

			// Check for video-specific fields
			if (fm["الملقي"] || fm["رابط"] || fm["معرف الفيديو"]) {
				return {
					type: "video",
					title: fm.title || file.basename,
				};
			}

			return { type: null, title: file.basename };
		} catch (error) {
			console.error("Error determining content type:", error);
			return { type: null, title: "" };
		}
	}
}
