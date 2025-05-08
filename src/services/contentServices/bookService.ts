import { App, TFile, TFolder } from "obsidian";
import { BaseDataService } from "../base/baseDataService";
import { AlRawiSettings } from "../../core/settings";
import { BookItem, BookData } from "../../types";
import { sanitizeFileName, formatDate, renderTemplate } from "../../utils";

/**
 * Service for book data operations
 */
export class BookService extends BaseDataService {
	/**
	 * Cache for book data to improve performance
	 */
	private bookCache: {
		books: BookItem[];
		authors: string[];
		categories: string[];
	} | null = null;

	/**
	 * Creates a new book service
	 * @param app - Obsidian app instance
	 * @param settings - Plugin settings
	 */
	constructor(app: App, settings: AlRawiSettings) {
		super(app, settings);
	}

	/**
	 * Gets books data, using cache if available
	 * @param forceRefresh - Whether to force data refresh
	 * @returns Books data with metadata
	 */
	async getBooks(forceRefresh = false): Promise<{
		books: BookItem[];
		authors: string[];
		categories: string[];
	}> {
		if (!this.bookCache || forceRefresh) {
			this.bookCache = await this.loadBooksData();
		}
		return this.bookCache;
	}

	/**
	 * Loads all books and related metadata
	 * @returns Books data with metadata
	 */
	private async loadBooksData(): Promise<{
		books: BookItem[];
		authors: string[];
		categories: string[];
	}> {
		const booksFolder =
			this.settings.booksSettings.defaultFolder || "Al-Rawi Books";
		const folder = this.app.vault.getAbstractFileByPath(booksFolder);

		if (!folder || !(folder instanceof TFolder)) {
			return {
				books: [],
				authors: [],
				categories: [],
			};
		}

		const files = this.findMarkdownFiles(folder);
		const books: BookItem[] = [];
		const authorSet = new Set<string>();
		const categorySet = new Set<string>();
		const tagSet = new Set<string>();

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.frontmatter) continue;

			const fm = cache.frontmatter;
			const type = fm["النوع"];

			// Skip if not a book type
			if (type !== "كتاب") continue;

			// Extract book data from frontmatter
			const title = fm["العنوان"] || file.basename;
			const author =
				fm["المؤلف"] || this.settings.booksSettings.defaultAuthor;
			const pages = parseInt(fm["الصفحات"]) || 0;
			const pagesRead = parseInt(fm["الصفحات المقروءة"]) || 0;
			const isbn = fm["الرقم المعياري ISBN"];
			const publisher = fm["الناشر"];
			const publishYear = parseInt(fm["سنة النشر"]) || undefined;
			const startDate = fm["تاريخ البدء"];
			const completionDate = fm["تاريخ الانتهاء"];
			const language = fm["اللغة"] || "العربية";
			const rating = parseInt(fm["التقييم"]) || 0;
			const status =
				fm["الحالة"] || this.settings.booksSettings.defaultStatus;
			const dateAdded =
				fm["تاريخ الإضافة"] ||
				formatDate(new Date(file.stat.ctime), this.settings.dateFormat);
			const coverUrl = fm["صورة الغلاف"];

			// Process categories and tags
			const categories = this.normalizeTags(fm["التصنيفات"]);
			const tags = this.normalizeTags(fm["الوسوم"]);

			// Track collections
			authorSet.add(author);
			categories.forEach((cat) => categorySet.add(cat));
			tags.forEach((tag) => tagSet.add(tag));

			// Extract notes if any
			let notes = "";
			try {
				const content = await this.app.vault.read(file);
				const notesMatch = content.match(
					/##\s*ملاحظات\s*\n([\s\S]*?)(?=\n##|$)/
				);
				if (notesMatch && notesMatch[1]) {
					notes = notesMatch[1].trim();
				}
			} catch (error) {
				console.warn(`Could not read notes for ${file.path}:`, error);
			}

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
				categories,
				notes,
			});
		}

		return {
			books,
			authors: Array.from(authorSet).sort(),
			categories: Array.from(categorySet).sort(),
		};
	}

	/**
	 * Creates a new book note
	 * @param data - Book data
	 * @returns Whether creation was successful
	 */
	async createBook(data: BookData): Promise<boolean> {
		try {
			const formattedDate = formatDate(
				new Date(),
				this.settings.dateFormat
			);

			// Resolve folder path based on book settings
			const folderPath = await this.resolveBookFolderPath({
				author: data.author,
				categories: data.categories,
			});

			// Create sanitized filename
			const sanitizedTitle = sanitizeFileName(
				data.title,
				this.settings.maxTitleLength
			);
			const fileName = `${sanitizedTitle}.md`;
			const fullPath = `${folderPath}/${fileName}`;

			// Check if file already exists
			if (this.app.vault.getAbstractFileByPath(fullPath)) {
				console.log(`Book already exists: ${fullPath}`);
				return false;
			}

			// Render content using book template
			const content = renderTemplate(this.settings.templates.book, {
				...data,
				date: formattedDate,
				dateAdded: formattedDate,
				showCovers: this.settings.booksSettings.showCovers,
				categories: Array.isArray(data.categories)
					? data.categories.join(", ")
					: data.categories,
				tags: Array.isArray(data.tags)
					? data.tags.join(", ")
					: data.tags,
			});

			// Create folder if needed
			if (!(await this.createFolderIfNeeded(folderPath))) {
				return false;
			}

			// Create the file
			await this.app.vault.create(fullPath, content);

			// Invalidate cache
			this.bookCache = null;

			return true;
		} catch (error) {
			console.error("Error creating book note:", error);
			return false;
		}
	}

	/**
	 * Updates an existing book note
	 * @param filePath - Path to the book file
	 * @param data - Updated book data
	 * @returns Whether update was successful
	 */
	async updateBook(filePath: string, data: BookData): Promise<boolean> {
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) return false;

			// Get file creation date to preserve
			const creationDate = formatDate(
				new Date(file.stat.ctime),
				this.settings.dateFormat
			);

			// Render updated content
			const content = renderTemplate(this.settings.templates.book, {
				...data,
				date: creationDate, // Preserve original creation date
				dateAdded: creationDate,
				showCovers: this.settings.booksSettings.showCovers,
				categories: Array.isArray(data.categories)
					? data.categories.join(", ")
					: data.categories,
				tags: Array.isArray(data.tags)
					? data.tags.join(", ")
					: data.tags,
			});

			// Update the file
			await this.app.vault.modify(file, content);

			// If the title changed, we may need to rename the file
			const sanitizedTitle = sanitizeFileName(
				data.title,
				this.settings.maxTitleLength
			);
			const newFileName = `${sanitizedTitle}.md`;

			if (file.name !== newFileName) {
				// Rename the file
				await this.app.fileManager.renameFile(
					file,
					`${file.parent?.path || ""}/${newFileName}`
				);
			}

			// Invalidate cache
			this.bookCache = null;

			return true;
		} catch (error) {
			console.error("Error updating book note:", error);
			return false;
		}
	}

	/**
	 * Updates a book's reading progress
	 * @param filePath - Path to the book file
	 * @param pagesRead - Number of pages read
	 * @returns Whether update was successful
	 */
	async updateProgress(
		filePath: string,
		pagesRead: number
	): Promise<boolean> {
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) return false;

			// Read the file content
			let content = await this.app.vault.read(file);

			// Update the pagesRead in frontmatter
			let updatedContent = this.updateFrontmatter(
				content,
				"الصفحات المقروءة",
				pagesRead
			);

			// Get book data to check if we need to update status
			const bookData = await this.getBookData(filePath);
			if (bookData && bookData.pages > 0) {
				// If book is now complete, update status to "completed" (تمت القراءة)
				if (pagesRead >= bookData.pages) {
					updatedContent = this.updateFrontmatter(
						updatedContent,
						"الحالة",
						"تمت القراءة"
					);

					// Add completion date if not present
					if (!bookData.completionDate) {
						const today = formatDate(new Date(), "YYYY-MM-DD");
						updatedContent = this.updateFrontmatter(
							updatedContent,
							"تاريخ الانتهاء",
							today
						);
					}
				}
				// If book was marked as completed but now it's not, update status to "in progress"
				else if (
					pagesRead < bookData.pages &&
					bookData.status === "تمت القراءة"
				) {
					updatedContent = this.updateFrontmatter(
						updatedContent,
						"الحالة",
						"قيد القراءة"
					);
				}
			}

			// Save the changes
			await this.app.vault.modify(file, updatedContent);

			// Invalidate cache
			this.bookCache = null;

			return true;
		} catch (error) {
			console.error("Error updating book progress:", error);
			return false;
		}
	}

	/**
	 * Gets details for a specific book
	 * @param filePath - Path to the book file
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

			// Process categories and tags
			const categories = this.normalizeTags(fm["التصنيفات"]);
			const tags = this.normalizeTags(fm["الوسوم"]);

			// Extract notes from content
			let notes = "";
			const frontmatterEndIndex = content.indexOf("---", 3);
			if (frontmatterEndIndex !== -1) {
				const contentAfterFrontmatter = content.substring(
					frontmatterEndIndex + 3
				);
				const notesMatch = contentAfterFrontmatter.match(
					/##\s*ملاحظات\s*\n([\s\S]*?)(?=\n##|$)/
				);
				if (notesMatch && notesMatch[1]) {
					notes = notesMatch[1].trim();
				}
			}

			return {
				title: fm["العنوان"] || file.basename,
				author:
					fm["المؤلف"] || this.settings.booksSettings.defaultAuthor,
				isbn: fm["الرقم المعياري ISBN"],
				pages: parseInt(fm["الصفحات"]) || 0,
				pagesRead: parseInt(fm["الصفحات المقروءة"]) || 0,
				publisher: fm["الناشر"],
				publishYear: parseInt(fm["سنة النشر"]) || undefined,
				startDate: fm["تاريخ البدء"],
				completionDate: fm["تاريخ الانتهاء"],
				language: fm["اللغة"] || "العربية",
				rating: parseInt(fm["التقييم"]) || 0,
				status:
					fm["الحالة"] || this.settings.booksSettings.defaultStatus,
				dateAdded:
					fm["تاريخ الإضافة"] ||
					formatDate(
						new Date(file.stat.ctime),
						this.settings.dateFormat
					),
				coverUrl: fm["صورة الغلاف"],
				filePath: file.path,
				type: fm["النوع"] || "كتاب",
				tags,
				categories,
				notes,
			};
		} catch (error) {
			console.error("Error getting book data:", error);
			return null;
		}
	}

	/**
	 * Updates a book's start date
	 * @param filePath - Path to the book file
	 * @param startDate - Start date string
	 * @returns Whether update was successful
	 */
	async updateStartDate(
		filePath: string,
		startDate: string
	): Promise<boolean> {
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) return false;

			// Read the file content
			let content = await this.app.vault.read(file);

			// Update the start date in frontmatter
			const updatedContent = this.updateFrontmatter(
				content,
				"تاريخ البدء",
				startDate
			);

			// Save the changes
			await this.app.vault.modify(file, updatedContent);

			// Invalidate cache
			this.bookCache = null;

			return true;
		} catch (error) {
			console.error("Error updating start date:", error);
			return false;
		}
	}

	/**
	 * Updates a book's completion date
	 * @param filePath - Path to the book file
	 * @param completionDate - Completion date string
	 * @returns Whether update was successful
	 */
	async updateCompletionDate(
		filePath: string,
		completionDate: string
	): Promise<boolean> {
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) return false;

			// Read the file content
			let content = await this.app.vault.read(file);

			// Update the completion date in frontmatter
			const updatedContent = this.updateFrontmatter(
				content,
				"تاريخ الانتهاء",
				completionDate
			);

			// Save the changes
			await this.app.vault.modify(file, updatedContent);

			// Invalidate cache
			this.bookCache = null;

			return true;
		} catch (error) {
			console.error("Error updating completion date:", error);
			return false;
		}
	}

	/**
	 * Updates a book's status
	 * @param filePath - Path to the book file
	 * @param status - New status
	 * @returns Whether update was successful
	 */
	async updateStatus(filePath: string, status: string): Promise<boolean> {
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) return false;

			// Read the file content
			let content = await this.app.vault.read(file);

			// Update the status in frontmatter
			const updatedContent = this.updateFrontmatter(
				content,
				"الحالة",
				status
			);

			// Save the changes
			await this.app.vault.modify(file, updatedContent);

			// Invalidate cache
			this.bookCache = null;

			return true;
		} catch (error) {
			console.error("Error updating book status:", error);
			return false;
		}
	}

	/**
	 * Updates a book's categories
	 * @param filePath - Path to the book file
	 * @param categories - Array of categories
	 * @returns Whether update was successful
	 */
	async updateCategories(
		filePath: string,
		categories: string[]
	): Promise<boolean> {
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) return false;

			// Read the file content
			let content = await this.app.vault.read(file);

			// Format categories string
			const categoriesString = categories.join(", ");

			// Update categories in frontmatter
			if (content.includes("التصنيفات:")) {
				const updatedContent = content.replace(
					/التصنيفات:.*$/m,
					`التصنيفات: ${categoriesString}`
				);
				await this.app.vault.modify(file, updatedContent);
			} else {
				// Add categories field if it doesn't exist
				const frontmatterEndIndex = content.indexOf("---", 3);
				if (frontmatterEndIndex !== -1) {
					const updatedContent =
						content.substring(0, frontmatterEndIndex) +
						`التصنيفات: ${categoriesString}\n` +
						content.substring(frontmatterEndIndex);
					await this.app.vault.modify(file, updatedContent);
				}
			}

			// Invalidate cache
			this.bookCache = null;

			return true;
		} catch (error) {
			console.error("Error updating categories:", error);
			return false;
		}
	}

	/**
	 * Resolves the folder path for a book
	 * @param data - Book folder data
	 * @returns Resolved folder path
	 */
	async resolveBookFolderPath(data: {
		author: string;
		categories?: string[];
	}): Promise<string> {
		const booksFolder = this.settings.booksSettings.defaultFolder;

		// If folder structure is disabled, return the default folder
		if (!this.settings.folderRules.enabled) {
			return booksFolder;
		}

		const structure = this.settings.booksSettings.folderStructure;
		let folderPath = structure;

		// Replace author placeholder
		folderPath = folderPath.replace(
			/{{author}}/g,
			data.author || this.settings.booksSettings.defaultAuthor
		);

		// Replace categories placeholder
		const category =
			Array.isArray(data.categories) && data.categories.length > 0
				? data.categories[0] // Use first category for folder organization
				: "عام"; // Default category
		folderPath = folderPath.replace(/{{categories}}/g, category);

		// Sanitize folder names
		folderPath = folderPath
			.split("/")
			.map((part: string) => sanitizeFileName(part))
			.join("/");

		return `${booksFolder}/${folderPath}`;
	}

	/**
	 * Gets list of existing book authors
	 * @returns Array of author names
	 */
	async getAuthorList(): Promise<string[]> {
		const { authors } = await this.getBooks();
		return authors;
	}

	/**
	 * Gets list of existing book categories
	 * @returns Array of category names
	 */
	async getCategoryList(): Promise<string[]> {
		const { categories } = await this.getBooks();
		return categories;
	}

	/**
	 * Gets list of existing book tags
	 * @returns Array of tag names
	 */
	async getTagList(): Promise<string[]> {
		const bookCache = await this.getBooks();

		// Extract all unique tags
		const tagSet = new Set<string>();
		bookCache.books.forEach((book) => {
			if (book.tags) {
				book.tags.forEach((tag) => tagSet.add(tag));
			}
		});

		return Array.from(tagSet).sort();
	}

	/**
	 * Calculates reading statistics
	 * @returns Reading statistics
	 */
	getReadingStats(): {
		totalBooks: number;
		readBooks: number;
		inProgressBooks: number;
		totalPages: number;
		readPages: number;
		averageCompletion: number;
		readingRate: number;
	} {
		// Initialize statistics
		let totalBooks = 0;
		let readBooks = 0;
		let inProgressBooks = 0;
		let totalPages = 0;
		let readPages = 0;

		// Use cached data if available
		const bookData = this.bookCache;

		if (!bookData || !bookData.books || bookData.books.length === 0) {
			return {
				totalBooks: 0,
				readBooks: 0,
				inProgressBooks: 0,
				totalPages: 0,
				readPages: 0,
				averageCompletion: 0,
				readingRate: 0,
			};
		}

		totalBooks = bookData.books.length;

		bookData.books.forEach((book) => {
			if (book.status === "تمت القراءة") {
				readBooks++;
			} else if (book.status === "قيد القراءة") {
				inProgressBooks++;
			}

			totalPages += book.pages;
			readPages += book.pagesRead;
		});

		// Calculate average completion percentage
		const averageCompletion =
			totalPages > 0 ? (readPages / totalPages) * 100 : 0;

		// Calculate reading rate (pages per day)
		// Find the earliest and latest reading dates
		const timestamps: number[] = [];
		bookData.books.forEach((book) => {
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
			const daysElapsed =
				(latestDate - earliestDate) / (1000 * 60 * 60 * 24);

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
			readingRate,
		};
	}

	/**
	 * Imports books data from JSON
	 * @param jsonData - JSON data string
	 * @returns Success and failure counts
	 */
	async importFromJson(
		jsonData: string
	): Promise<{ success: number; failed: number }> {
		try {
			const data = JSON.parse(jsonData);
			let success = 0;
			let failed = 0;

			// Load current books to check for duplicates
			const currentBooks = await this.getBooks();
			const existingTitles = new Set(
				currentBooks.books.map((book) =>
					book.title.toLowerCase().trim()
				)
			);

			// Handle the array of books format
			if (Array.isArray(data.books)) {
				for (const book of data.books) {
					try {
						// Skip duplicates
						if (
							existingTitles.has(book.title.toLowerCase().trim())
						) {
							console.log(
								`Skipping duplicate book: ${book.title}`
							);
							failed++;
							continue;
						}

						// Process based on whether content is provided
						if (book.content) {
							// Create folders if needed
							const folderPath = await this.resolveBookFolderPath(
								{
									author: book.author,
									categories: book.categories,
								}
							);

							await this.createFolderIfNeeded(folderPath);

							// Create file with existing content
							const sanitizedTitle = sanitizeFileName(
								book.title,
								this.settings.maxTitleLength
							);
							const fileName = `${sanitizedTitle}.md`;
							const filePath = `${folderPath}/${fileName}`;

							await this.app.vault.create(filePath, book.content);
							success++;
						} else {
							// Create book normally
							const result = await this.createBook({
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
								type: "كتاب",
								coverUrl: book.coverUrl,
								notes: book.notes,
							});

							if (result) success++;
							else failed++;
						}
					} catch (e) {
						console.error("Error importing book:", e);
						failed++;
					}
				}
			} else {
				throw new Error(
					"Invalid book data format - missing books array"
				);
			}

			return { success, failed };
		} catch (error) {
			console.error("Error parsing import data:", error);
			throw new Error("Invalid import data format");
		}
	}

	/**
	 * Exports books data to JSON
	 * @param selectedFilePaths - Optional files to export (all if empty)
	 * @returns JSON string of exported data
	 */
	async exportToJson(selectedFilePaths: string[] = []): Promise<string> {
		const booksData = await this.getBooks();

		// Filter books if paths provided
		const filteredBooks =
			selectedFilePaths.length > 0
				? booksData.books.filter((b) =>
						selectedFilePaths.includes(b.filePath)
				  )
				: booksData.books;

		const exportData = {
			books: filteredBooks,
			exportDate: new Date().toISOString(),
			version: "1.0",
		};

		return JSON.stringify(exportData, null, 2);
	}

	/**
	 * Exports books data with full content to JSON
	 * @param selectedFilePaths - Optional files to export (all if empty)
	 * @returns JSON string with full content
	 */
	async exportWithContent(selectedFilePaths: string[] = []): Promise<string> {
		const booksData = await this.getBooks();

		// Filter books if paths provided
		const filteredBooks =
			selectedFilePaths.length > 0
				? booksData.books.filter((b) =>
						selectedFilePaths.includes(b.filePath)
				  )
				: booksData.books;

		// Enhanced export with content
		const exportItems = [];

		// Process books with content
		for (const book of filteredBooks) {
			try {
				const file = this.app.vault.getAbstractFileByPath(
					book.filePath
				);
				if (file instanceof TFile) {
					const content = await this.app.vault.read(file);
					exportItems.push({
						...book,
						content,
					});
				}
			} catch (error) {
				console.error(
					`Error reading content for ${book.filePath}:`,
					error
				);
				exportItems.push(book);
			}
		}

		const exportData = {
			books: exportItems,
			exportDate: new Date().toISOString(),
			version: "1.1",
		};

		return JSON.stringify(exportData, null, 2);
	}

	/**
	 * Exports books data to CSV format
	 * @param selectedFilePaths - Optional files to export (all if empty)
	 * @returns CSV formatted string
	 */
	async exportToCsv(selectedFilePaths: string[] = []): Promise<string> {
		const booksData = await this.getBooks();

		// Filter books if paths provided
		const filteredBooks =
			selectedFilePaths.length > 0
				? booksData.books.filter((b) =>
						selectedFilePaths.includes(b.filePath)
				  )
				: booksData.books;

		// Create CSV header (Arabic column names)
		const header =
			"العنوان,المؤلف,عدد الصفحات,الصفحات المقروءة,الناشر,سنة النشر,الرقم المعياري ISBN,تاريخ البدء,تاريخ الانتهاء,اللغة,التقييم,الحالة,التصنيفات,الوسوم,تاريخ الإضافة\n";

		// Helper function to prepare CSV fields
		const escapeField = (value: any): string => {
			if (value === null || value === undefined) return "";
			const str = String(value);
			// Escape quotes and wrap in quotes if contains comma or quote
			if (str.includes('"') || str.includes(",")) {
				return `"${str.replace(/"/g, '""')}"`;
			}
			return str;
		};

		// Convert books to CSV rows
		const rows = filteredBooks
			.map((book) => {
				return [
					escapeField(book.title),
					escapeField(book.author),
					escapeField(book.pages),
					escapeField(book.pagesRead),
					escapeField(book.publisher),
					escapeField(book.publishYear),
					escapeField(book.isbn),
					escapeField(book.startDate),
					escapeField(book.completionDate),
					escapeField(book.language),
					escapeField(book.rating),
					escapeField(book.status),
					escapeField(
						Array.isArray(book.categories)
							? book.categories.join("; ")
							: ""
					),
					escapeField(
						Array.isArray(book.tags) ? book.tags.join("; ") : ""
					),
					escapeField(book.dateAdded),
				].join(",");
			})
			.join("\n");

		return header + rows;
	}
}
