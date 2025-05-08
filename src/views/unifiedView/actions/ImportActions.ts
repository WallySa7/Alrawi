// src/views/unifiedView/actions/EnhancedImportActions.ts
import { App, Notice } from "obsidian";
import { CONTENT_TYPE } from "../constants";
import { ContentType } from "../types";
import { DataService } from "../../../services/dataService";
import { ExportProgress } from "./ExportProgress";

/**
 * Enhanced import functionality for videos, books, and benefits
 * With optimized file handling and progress reporting
 */
export class ImportActions {
	private app: App;
	private plugin: any;
	private dataService: DataService;
	private progressReporter: ExportProgress;

	/**
	 * Creates a new EnhancedImportActions instance
	 * @param app - Obsidian app instance
	 * @param plugin - Plugin instance
	 * @param dataService - Data service
	 */
	constructor(app: App, plugin: any, dataService: DataService) {
		this.app = app;
		this.plugin = plugin;
		this.dataService = dataService;
		this.progressReporter = new ExportProgress();
	}

	/**
	 * Shows the import dialog
	 * @param contentType - Current content type
	 * @param onComplete - Callback to run after import completes
	 */
	public showImportDialog(
		contentType: ContentType,
		onComplete: () => Promise<void>
	): void {
		// Create a modern, rtl-friendly dialog
		const dialog = document.createElement("div");
		dialog.className = "alrawi-modal-dialog alrawi-import-dialog";

		// Add header with title and close button
		const header = dialog.createEl("div", { cls: "alrawi-dialog-header" });

		const title = header.createEl("h3", { cls: "alrawi-dialog-title" });
		title.textContent =
			contentType === CONTENT_TYPE.VIDEOS
				? "استيراد بيانات الفيديوهات"
				: "استيراد بيانات الكتب";

		// Close button
		const closeBtn = header.createEl("button", {
			cls: "alrawi-dialog-close",
			text: "×",
		});
		closeBtn.addEventListener("click", () => {
			document.body.removeChild(dialog);
		});

		// Create content area
		const content = dialog.createEl("div", {
			cls: "alrawi-dialog-content",
		});

		const description = content.createEl("p", {
			cls: "alrawi-dialog-description",
			text: "اختر ملف JSON للاستيراد (يجب أن يكون بنفس تنسيق التصدير)",
		});

		// File input with modern styling
		const inputContainer = content.createEl("div", {
			cls: "alrawi-file-input-container",
		});

		const fileInput = inputContainer.createEl("input", {
			type: "file",
			cls: "alrawi-file-input",
		});
		fileInput.accept = ".json";

		// File name display
		const fileNameDisplay = inputContainer.createEl("div", {
			cls: "alrawi-file-name-display",
			text: "لم يتم اختيار ملف",
		});

		// Custom file button
		const customFileButton = inputContainer.createEl("button", {
			cls: "alrawi-custom-file-button",
			text: "اختر ملف",
		});

		customFileButton.addEventListener("click", () => {
			fileInput.click();
		});

		// Update filename display when a file is selected
		fileInput.addEventListener("change", () => {
			const fileName = fileInput.files?.[0]?.name || "لم يتم اختيار ملف";
			fileNameDisplay.textContent = fileName;
		});

		// Add footer with buttons
		const footer = dialog.createEl("div", { cls: "alrawi-dialog-footer" });

		const importButton = footer.createEl("button", {
			text: "استيراد",
			cls: "alrawi-import-button",
		});
		importButton.disabled = true;

		const cancelButton = footer.createEl("button", {
			text: "إلغاء",
			cls: "alrawi-cancel-button",
		});

		// Enable/disable import button based on file selection
		fileInput.addEventListener("change", () => {
			importButton.disabled =
				!fileInput.files || fileInput.files.length === 0;
		});

		// Cancel action
		cancelButton.addEventListener("click", () => {
			document.body.removeChild(dialog);
		});

		// Import action with progress reporting
		importButton.addEventListener("click", async () => {
			if (!fileInput.files || fileInput.files.length === 0) return;

			const file = fileInput.files[0];
			document.body.removeChild(dialog);

			if (contentType === CONTENT_TYPE.VIDEOS) {
				await this.importVideosData(file, onComplete);
			} else {
				await this.importBooksData(file, onComplete);
			}
		});

		// Add the dialog to the document body
		document.body.appendChild(dialog);
	}

	/**
	 * Imports video data from a file
	 * @param file - File to import
	 * @param onComplete - Callback to run after import completes
	 */
	private async importVideosData(
		file: File,
		onComplete: () => Promise<void>
	): Promise<void> {
		const progressId = this.progressReporter.startProgress(
			"استيراد بيانات الفيديوهات"
		);

		try {
			this.progressReporter.updateProgress(
				progressId,
				10,
				"جاري قراءة الملف..."
			);

			// Read the file
			const jsonData = await this.readFileAsText(file);

			this.progressReporter.updateProgress(
				progressId,
				30,
				"جاري تحليل البيانات..."
			);

			// Import the data with progress updates
			const result = await this.dataService.importVideos(jsonData);

			this.progressReporter.updateProgress(
				progressId,
				95,
				"جاري تحديث واجهة المستخدم..."
			);

			// Display results
			if (result.success > 0) {
				this.progressReporter.completeProgress(
					progressId,
					`تم استيراد ${result.success} من العناصر بنجاح`
				);
			}

			if (result.failed > 0) {
				new Notice(`⚠️ فشل استيراد ${result.failed} من العناصر`);
			}

			// Refresh the view
			await onComplete();
		} catch (error) {
			console.error("Error importing data:", error);
			this.progressReporter.failProgress(
				"استيراد بيانات الفيديوهات",
				"حدث خطأ أثناء استيراد البيانات"
			);
		}
	}

	/**
	 * Imports book data from a file
	 * @param file - File to import
	 * @param onComplete - Callback to run after import completes
	 */
	private async importBooksData(
		file: File,
		onComplete: () => Promise<void>
	): Promise<void> {
		const progressId = this.progressReporter.startProgress(
			"استيراد بيانات الكتب"
		);

		try {
			this.progressReporter.updateProgress(
				progressId,
				10,
				"جاري قراءة الملف..."
			);

			// Read the file
			const jsonData = await this.readFileAsText(file);

			this.progressReporter.updateProgress(
				progressId,
				30,
				"جاري تحليل البيانات..."
			);

			// Import the data with progress updates
			const result = await this.dataService.importBooks(jsonData);

			this.progressReporter.updateProgress(
				progressId,
				95,
				"جاري تحديث واجهة المستخدم..."
			);

			// Display results
			if (result.success > 0) {
				this.progressReporter.completeProgress(
					progressId,
					`تم استيراد ${result.success} كتاب بنجاح`
				);
			}

			if (result.failed > 0) {
				new Notice(`⚠️ فشل استيراد ${result.failed} كتاب`);
			}

			// Refresh the view
			await onComplete();
		} catch (error) {
			console.error("Error importing book data:", error);
			this.progressReporter.failProgress(
				"استيراد بيانات الكتب",
				"حدث خطأ أثناء استيراد بيانات الكتب"
			);
		}
	}

	/**
	 * Reads a file as text
	 * @param file - File to read
	 * @returns Promise resolving to file content as string
	 */
	private readFileAsText(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();

			reader.onload = (e) => {
				if (!e.target?.result) {
					reject(new Error("Failed to read file"));
					return;
				}
				resolve(e.target.result as string);
			};

			reader.onerror = () => {
				reject(new Error("Error reading file"));
			};

			reader.readAsText(file);
		});
	}
}
