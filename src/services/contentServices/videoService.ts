import { App, TFile, TFolder } from "obsidian";
import { BaseDataService } from "../base/baseDataService";
import { AlRawiSettings } from "../../core/settings";
import {
	VideoItem,
	PlaylistItem,
	VideoData,
	PlaylistData,
	FolderData,
} from "../../types";
import { sanitizeFileName, formatDate, renderTemplate } from "../../utils";

/**
 * Service for video and playlist content operations
 */
export class VideoService extends BaseDataService {
	/**
	 * Creates a new video service
	 * @param app - Obsidian app instance
	 * @param settings - Plugin settings
	 */
	constructor(app: App, settings: AlRawiSettings) {
		super(app, settings);
	}

	/**
	 * Loads all videos and playlists with related metadata
	 * @returns Object with videos, playlists, presenters, categories, tags
	 */
	async getVideosAndPlaylists(): Promise<{
		videos: VideoItem[];
		playlists: PlaylistItem[];
		presenters: string[];
		categories: string[];
		tags: string[];
	}> {
		const rootFolder = this.settings.defaultFolder || "Al-Rawi Videos";
		const folder = this.app.vault.getAbstractFileByPath(rootFolder);

		if (!folder || !(folder instanceof TFolder)) {
			return {
				videos: [],
				playlists: [],
				presenters: [],
				categories: [],
				tags: [],
			};
		}

		const files = this.findMarkdownFiles(folder);
		const videos: VideoItem[] = [];
		const playlists: PlaylistItem[] = [];
		const presenterSet = new Set<string>();
		const categorySet = new Set<string>();
		const tagSet = new Set<string>();

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.frontmatter) continue;

			const fm = cache.frontmatter;
			const contentType = fm["النوع"];
			const presenter = fm["الملقي"] || this.settings.defaultPresenter;
			const duration = fm["المدة"] || fm["المدة الإجمالية"] || "00:00:00";
			const url = fm["رابط"] || fm["رابط القائمة"] || fm["رابط السلسلة"];
			const title = fm["title"] || file.basename;
			const itemCount = fm["عدد المقاطع"];
			const videoId = fm["معرف الفيديو"];
			const playlistId = fm["معرف السلسلة"] || fm["معرف القائمة"];
			const thumbnailUrl = fm["الصورة المصغرة"];
			const status =
				fm["الحالة"] || this.settings.progressTracking.defaultStatus;
			const dateAdded =
				fm["تاريخ الإضافة"] ||
				formatDate(new Date(file.stat.ctime), this.settings.dateFormat);

			// Process categories and tags
			const categories = this.normalizeTags(fm["التصنيفات"]);
			const tags = this.normalizeTags(fm["الوسوم"]);

			// Track unique values for collections
			presenterSet.add(presenter);
			categories.forEach((cat) => categorySet.add(cat));
			tags.forEach((tag) => tagSet.add(tag));

			// Add to appropriate collection based on content type
			if (contentType === "سلسلة" || contentType === "قائمة") {
				playlists.push({
					title,
					presenter,
					itemCount: parseInt(itemCount) || 0,
					duration,
					url,
					playlistId,
					filePath: file.path,
					type: contentType,
					status,
					dateAdded,
					categories,
					tags,
					thumbnailUrl,
				});
			} else {
				// Parse duration to seconds
				const [h = 0, m = 0, s = 0] = duration.split(":").map(Number);
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
					type: contentType || "مقطع", // Default to "video"
					status,
					dateAdded,
					categories,
					tags,
				});
			}
		}

		return {
			videos,
			playlists,
			presenters: Array.from(presenterSet).sort(),
			categories: Array.from(categorySet).sort(),
			tags: Array.from(tagSet).sort(),
		};
	}

	/**
	 * Creates a new video note
	 * @param data - Video data to create
	 * @returns Whether creation was successful
	 */
	async createVideo(data: VideoData): Promise<boolean> {
		try {
			const formattedDate = formatDate(
				new Date(),
				this.settings.dateFormat
			);
			const status =
				data.status || this.settings.progressTracking.defaultStatus;

			// Resolve folder path based on folder rules
			const folderPath = await this.resolvePath({
				type: data.type,
				presenter: data.presenter,
				date: formattedDate,
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
				console.log(`Video already exists: ${fullPath}`);
				return false;
			}

			// Render content using template
			const content = renderTemplate(this.settings.templates.video, {
				...data,
				date: formattedDate,
				dateAdded: formattedDate,
				tags: Array.isArray(data.tags)
					? data.tags.join(", ")
					: data.tags,
				categories: Array.isArray(data.categories)
					? data.categories.join(", ")
					: data.categories,
				status,
			});

			// Create folder if needed
			if (!(await this.createFolderIfNeeded(folderPath))) {
				return false;
			}

			// Create file
			await this.app.vault.create(fullPath, content);
			return true;
		} catch (error) {
			console.error("Error creating video note:", error);
			return false;
		}
	}

	/**
	 * Creates a new playlist note
	 * @param data - Playlist data to create
	 * @returns Whether creation was successful
	 */
	async createPlaylist(data: PlaylistData): Promise<boolean> {
		try {
			const formattedDate = formatDate(
				new Date(),
				this.settings.dateFormat
			);
			const status =
				data.status || this.settings.progressTracking.defaultStatus;

			// Resolve folder path based on folder rules
			const folderPath = await this.resolvePath({
				type: data.type,
				presenter: data.presenter,
				date: formattedDate,
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
				console.log(`Playlist already exists: ${fullPath}`);
				return false;
			}

			// Render content using playlist template
			const content = renderTemplate(this.settings.templates.playlist, {
				...data,
				date: formattedDate,
				dateAdded: formattedDate,
				status,
				thumbnailUrl: data.thumbnailUrl || "",
				tags: Array.isArray(data.tags)
					? data.tags.join(", ")
					: data.tags,
				categories: Array.isArray(data.categories)
					? data.categories.join(", ")
					: data.categories,
			});

			// Create folder if needed
			if (!(await this.createFolderIfNeeded(folderPath))) {
				return false;
			}

			// Create file
			await this.app.vault.create(fullPath, content);
			return true;
		} catch (error) {
			console.error("Error creating playlist note:", error);
			return false;
		}
	}

	/**
	 * Resolves folder path based on settings and data
	 * @param data - Folder data for path resolution
	 * @returns Resolved folder path
	 */
	async resolvePath(data: FolderData): Promise<string> {
		// If folder organization is disabled, return the default folder
		if (!this.settings.folderRules.enabled) {
			return this.settings.defaultFolder;
		}

		const dateObj = data.date ? new Date(data.date) : new Date();
		const replacements: Record<string, string> = {
			"{{type}}": data.type,
			"{{presenter}}": data.presenter || this.settings.defaultPresenter,
			"{{date}}": formatDate(dateObj, "YYYY-MM-DD"),
			"{{year}}": dateObj.getFullYear().toString(),
			"{{month}}": (dateObj.getMonth() + 1).toString().padStart(2, "0"),
			"{{day}}": dateObj.getDate().toString().padStart(2, "0"),
		};

		// Apply all replacements to folder structure
		let folderPath = this.settings.folderRules.structure;
		for (const [key, value] of Object.entries(replacements)) {
			folderPath = folderPath.replace(new RegExp(key, "g"), value);
		}

		// Sanitize folder names
		folderPath = folderPath
			.split("/")
			.map((part: string) => sanitizeFileName(part))
			.join("/");

		return `${this.settings.defaultFolder}/${folderPath}`;
	}

	/**
	 * Gets list of existing presenters
	 * @returns Array of presenter names
	 */
	async getPresenterList(): Promise<string[]> {
		const { presenters } = await this.getVideosAndPlaylists();
		return presenters;
	}

	/**
	 * Gets list of existing video categories
	 * @returns Array of category names
	 */
	async getCategoryList(): Promise<string[]> {
		const { categories } = await this.getVideosAndPlaylists();
		return categories;
	}

	/**
	 * Gets list of existing video tags
	 * @returns Array of tag names
	 */
	async getTagList(): Promise<string[]> {
		const { tags } = await this.getVideosAndPlaylists();
		return tags;
	}

	/**
	 * Updates video/playlist status
	 * @param filePath - Path to the file
	 * @param newStatus - New status value
	 * @returns Whether update was successful
	 */
	async updateStatus(filePath: string, newStatus: string): Promise<boolean> {
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) return false;

			// Read the file content
			let content = await this.app.vault.read(file);

			// Update the status in frontmatter
			const updatedContent = this.updateFrontmatter(
				content,
				"الحالة",
				newStatus
			);

			// Write the updated content back to the file
			await this.app.vault.modify(file, updatedContent);
			return true;
		} catch (error) {
			console.error("Error updating status:", error);
			return false;
		}
	}

	/**
	 * Updates video/playlist categories
	 * @param filePath - Path to the file
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

			return true;
		} catch (error) {
			console.error("Error updating categories:", error);
			return false;
		}
	}

	/**
	 * Imports videos data from JSON
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

			// Load current data to detect duplicates
			const currentData = await this.getVideosAndPlaylists();
			const existingTitles = new Set([
				...currentData.videos.map((v) => v.title.toLowerCase().trim()),
				...currentData.playlists.map((p) =>
					p.title.toLowerCase().trim()
				),
			]);

			// Handle format with 'items' array (export with content)
			if (Array.isArray(data.items)) {
				for (const item of data.items) {
					try {
						// Skip duplicates
						if (
							existingTitles.has(item.title.toLowerCase().trim())
						) {
							console.log(`Skipping duplicate: ${item.title}`);
							failed++;
							continue;
						}

						// If item has content, create file directly
						if (item.content) {
							const folderPath = await this.resolvePath({
								type: item.type,
								presenter: item.presenter,
								date: item.dateAdded,
							});

							await this.createFolderIfNeeded(folderPath);

							const sanitizedTitle = sanitizeFileName(
								item.title,
								this.settings.maxTitleLength
							);
							const fileName = `${sanitizedTitle}.md`;
							const filePath = `${folderPath}/${fileName}`;

							await this.app.vault.create(filePath, item.content);
							success++;
						}
						// Otherwise create note from item data
						else {
							let result = false;
							if (
								item.type === "سلسلة" ||
								item.type === "قائمة"
							) {
								result = await this.createPlaylist({
									url: item.url,
									playlistId: item.playlistId || "",
									title: item.title,
									presenter: item.presenter,
									type: item.type,
									itemCount: item.itemCount || 0,
									duration: item.duration,
									status: item.status,
									thumbnailUrl: item.thumbnailUrl,
									tags: item.tags,
									categories: item.categories,
								});
							} else {
								result = await this.createVideo({
									url: item.url,
									videoId: item.videoId || "",
									title: item.title,
									duration: item.duration,
									presenter: item.presenter,
									type: item.type || "مقطع",
									description: item.description || "",
									tags: item.tags || [],
									thumbnailUrl: item.thumbnailUrl || "",
									status: item.status,
									categories: item.categories,
								});
							}

							if (result) success++;
							else failed++;
						}
					} catch (e) {
						console.error("Error importing item:", e);
						failed++;
					}
				}

				return { success, failed };
			}

			// Handle older format with separate videos and playlists arrays
			if (Array.isArray(data.videos)) {
				for (const video of data.videos) {
					try {
						// Skip duplicates
						if (
							existingTitles.has(video.title.toLowerCase().trim())
						) {
							console.log(`Skipping duplicate: ${video.title}`);
							failed++;
							continue;
						}

						const result = await this.createVideo({
							url: video.url,
							videoId: video.videoId || "",
							title: video.title,
							duration: video.duration,
							presenter: video.presenter,
							type: video.type || "مقطع",
							description: video.description || "",
							tags: video.tags || [],
							thumbnailUrl: video.thumbnailUrl || "",
							status: video.status,
							categories: video.categories,
						});

						if (result) success++;
						else failed++;
					} catch (e) {
						console.error("Error importing video:", e);
						failed++;
					}
				}
			}

			if (Array.isArray(data.playlists)) {
				for (const playlist of data.playlists) {
					try {
						// Skip duplicates
						if (
							existingTitles.has(
								playlist.title.toLowerCase().trim()
							)
						) {
							console.log(
								`Skipping duplicate: ${playlist.title}`
							);
							failed++;
							continue;
						}

						const result = await this.createPlaylist({
							url: playlist.url,
							playlistId: playlist.playlistId || "",
							title: playlist.title,
							presenter: playlist.presenter,
							type: playlist.type,
							itemCount: playlist.itemCount || 0,
							duration: playlist.duration,
							status: playlist.status,
							thumbnailUrl: playlist.thumbnailUrl,
							tags: playlist.tags,
							categories: playlist.categories,
						});

						if (result) success++;
						else failed++;
					} catch (e) {
						console.error("Error importing playlist:", e);
						failed++;
					}
				}
			}

			return { success, failed };
		} catch (error) {
			console.error("Error parsing import data:", error);
			throw new Error("Invalid import data format");
		}
	}

	/**
	 * Exports videos and playlists to JSON
	 * @param selectedFilePaths - Optional files to export (all if empty)
	 * @returns JSON string of exported data
	 */
	async exportToJson(selectedFilePaths: string[] = []): Promise<string> {
		const { videos, playlists } = await this.getVideosAndPlaylists();

		// Filter items if paths provided
		const filteredVideos =
			selectedFilePaths.length > 0
				? videos.filter((v) => selectedFilePaths.includes(v.filePath))
				: videos;

		const filteredPlaylists =
			selectedFilePaths.length > 0
				? playlists.filter((p) =>
						selectedFilePaths.includes(p.filePath)
				  )
				: playlists;

		const exportData = {
			videos: filteredVideos,
			playlists: filteredPlaylists,
			exportDate: new Date().toISOString(),
			version: "1.0",
		};

		return JSON.stringify(exportData, null, 2);
	}

	/**
	 * Exports videos and playlists with content to JSON
	 * @param selectedFilePaths - Optional files to export (all if empty)
	 * @returns JSON string with full content
	 */
	async exportWithContent(selectedFilePaths: string[] = []): Promise<string> {
		const { videos, playlists } = await this.getVideosAndPlaylists();

		// Filter items if paths provided
		const filteredVideos =
			selectedFilePaths.length > 0
				? videos.filter((v) => selectedFilePaths.includes(v.filePath))
				: videos;

		const filteredPlaylists =
			selectedFilePaths.length > 0
				? playlists.filter((p) =>
						selectedFilePaths.includes(p.filePath)
				  )
				: playlists;

		// Combine all items and enhance with content
		const exportItems = [];

		// Process videos with content
		for (const video of filteredVideos) {
			try {
				const file = this.app.vault.getAbstractFileByPath(
					video.filePath
				);
				if (file instanceof TFile) {
					const content = await this.app.vault.read(file);
					exportItems.push({
						...video,
						content,
					});
				}
			} catch (error) {
				console.error(
					`Error reading content for ${video.filePath}:`,
					error
				);
				// Include item without content if there's an error
				exportItems.push(video);
			}
		}

		// Process playlists with content
		for (const playlist of filteredPlaylists) {
			try {
				const file = this.app.vault.getAbstractFileByPath(
					playlist.filePath
				);
				if (file instanceof TFile) {
					const content = await this.app.vault.read(file);
					exportItems.push({
						...playlist,
						content,
					});
				}
			} catch (error) {
				console.error(
					`Error reading content for ${playlist.filePath}:`,
					error
				);
				// Include item without content if there's an error
				exportItems.push(playlist);
			}
		}

		const exportData = {
			items: exportItems,
			exportDate: new Date().toISOString(),
			version: "1.1", // Updated version for content export
		};

		return JSON.stringify(exportData, null, 2);
	}

	/**
	 * Exports videos and playlists to CSV format
	 * @param selectedFilePaths - Optional files to export (all if empty)
	 * @returns CSV formatted string
	 */
	async exportToCsv(selectedFilePaths: string[] = []): Promise<string> {
		const { videos, playlists } = await this.getVideosAndPlaylists();

		// Filter items if paths provided
		const filteredVideos =
			selectedFilePaths.length > 0
				? videos.filter((v) => selectedFilePaths.includes(v.filePath))
				: videos;

		const filteredPlaylists =
			selectedFilePaths.length > 0
				? playlists.filter((p) =>
						selectedFilePaths.includes(p.filePath)
				  )
				: playlists;

		// Create CSV header (Arabic column names)
		const header =
			"العنوان,الملقي,النوع,الحالة,المدة,رابط اليوتيوب,تاريخ الإضافة,الوسوم,التصنيفات\n";

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

		// Convert all items to CSV rows
		const rows = [...filteredVideos, ...filteredPlaylists]
			.map((item) => {
				return [
					escapeField(item.title),
					escapeField(item.presenter),
					escapeField(item.type),
					escapeField(item.status),
					escapeField(item.duration),
					escapeField(item.url),
					escapeField(item.dateAdded),
					escapeField(
						Array.isArray(item.tags) ? item.tags.join("; ") : ""
					),
					escapeField(
						Array.isArray(item.categories)
							? item.categories.join("; ")
							: ""
					),
				].join(",");
			})
			.join("\n");

		return header + rows;
	}
}
