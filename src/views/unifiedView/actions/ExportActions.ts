// src/views/unifiedView/actions/EnhancedExportActions.ts
import { App, Menu, Notice } from "obsidian";
import { CONTENT_TYPE } from "../constants";
import { ContentType } from "../types";
import { DataService } from "../../../services/dataService";
import { ExportProgress } from "./ExportProgress";

/**
 * Enhanced export functionality for videos, books, and benefits
 * With optimized file handling and progress reporting
 */
export class ExportActions {
	private app: App;
	private plugin: any;
	private dataService: DataService;
	private progressReporter: ExportProgress;

	/**
	 * Creates a new instance of EnhancedExportActions
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
	 * Shows the export menu with appropriate options
	 * @param buttonEl - Button element to position the menu against
	 * @param contentType - Current content type
	 * @param selectedItems - Optional array of selected items to export
	 */
	public showExportMenu(
		buttonEl: HTMLElement,
		contentType: ContentType,
		selectedItems: string[] = []
	): void {
		const menu = new Menu();

		if (contentType === CONTENT_TYPE.VIDEOS) {
			this.buildVideoExportMenu(menu, selectedItems);
		} else if (contentType === CONTENT_TYPE.BOOKS) {
			this.buildBookExportMenu(menu, selectedItems);
		} else if (contentType === CONTENT_TYPE.BENEFITS) {
			this.buildBenefitExportMenu(menu);
		}

		const rect = buttonEl.getBoundingClientRect();
		menu.showAtPosition({ x: rect.left, y: rect.bottom });
	}

	/**
	 * Builds the video export menu
	 * @param menu - Menu instance to build
	 * @param selectedItems - Optional array of selected items
	 */
	private buildVideoExportMenu(
		menu: Menu,
		selectedItems: string[] = []
	): void {
		// Video export options
		menu.addItem((item) => {
			item.setTitle("تصدير إلى JSON")
				.setIcon("download")
				.onClick(async () => {
					await this.exportVideosToJson();
				});
		});

		menu.addItem((item) => {
			item.setTitle("تصدير إلى JSON مع المحتوى")
				.setIcon("file-text")
				.onClick(async () => {
					await this.exportVideosToJsonWithContent();
				});
		});

		menu.addItem((item) => {
			item.setTitle("تصدير إلى CSV")
				.setIcon("download")
				.onClick(async () => {
					await this.exportVideosToCsv();
				});
		});

		// Export selected items
		if (selectedItems.length > 0) {
			menu.addSeparator();

			menu.addItem((item) => {
				item.setTitle(
					`تصدير ${selectedItems.length} عنصر محدد إلى JSON`
				)
					.setIcon("check-square")
					.onClick(async () => {
						await this.exportVideosToJson(selectedItems);
					});
			});

			menu.addItem((item) => {
				item.setTitle(
					`تصدير ${selectedItems.length} عنصر محدد إلى JSON مع المحتوى`
				)
					.setIcon("check-square")
					.onClick(async () => {
						await this.exportVideosToJsonWithContent(selectedItems);
					});
			});

			menu.addItem((item) => {
				item.setTitle(`تصدير ${selectedItems.length} عنصر محدد إلى CSV`)
					.setIcon("check-square")
					.onClick(async () => {
						await this.exportVideosToCsv(selectedItems);
					});
			});
		}
	}

	/**
	 * Builds the book export menu
	 * @param menu - Menu instance to build
	 * @param selectedItems - Optional array of selected items
	 */
	private buildBookExportMenu(
		menu: Menu,
		selectedItems: string[] = []
	): void {
		// Book export options
		menu.addItem((item) => {
			item.setTitle("تصدير إلى JSON")
				.setIcon("download")
				.onClick(async () => {
					await this.exportBooksToJson();
				});
		});

		menu.addItem((item) => {
			item.setTitle("تصدير إلى JSON مع المحتوى")
				.setIcon("file-text")
				.onClick(async () => {
					await this.exportBooksToJsonWithContent();
				});
		});

		menu.addItem((item) => {
			item.setTitle("تصدير إلى CSV")
				.setIcon("download")
				.onClick(async () => {
					await this.exportBooksToCsv();
				});
		});

		// Export selected items
		if (selectedItems.length > 0) {
			menu.addSeparator();

			menu.addItem((item) => {
				item.setTitle(
					`تصدير ${selectedItems.length} كتاب محدد إلى JSON`
				)
					.setIcon("check-square")
					.onClick(async () => {
						await this.exportBooksToJson(selectedItems);
					});
			});

			menu.addItem((item) => {
				item.setTitle(
					`تصدير ${selectedItems.length} كتاب محدد إلى JSON مع المحتوى`
				)
					.setIcon("check-square")
					.onClick(async () => {
						await this.exportBooksToJsonWithContent(selectedItems);
					});
			});

			menu.addItem((item) => {
				item.setTitle(`تصدير ${selectedItems.length} كتاب محدد إلى CSV`)
					.setIcon("check-square")
					.onClick(async () => {
						await this.exportBooksToCsv(selectedItems);
					});
			});
		}
	}

	/**
	 * Builds the benefit export menu
	 * @param menu - Menu instance to build
	 */
	private buildBenefitExportMenu(menu: Menu): void {
		// Benefit export options
		menu.addItem((item) => {
			item.setTitle("تصدير إلى JSON")
				.setIcon("download")
				.onClick(async () => {
					await this.exportBenefits();
				});
		});

		menu.addItem((item) => {
			item.setTitle("تصدير إلى CSV")
				.setIcon("download")
				.onClick(async () => {
					await this.exportBenefitsToCsv();
				});
		});
	}

	/**
	 * Exports benefits to JSON
	 */
	public async exportBenefits(): Promise<void> {
		try {
			// Start progress tracking
			const progressId =
				this.progressReporter.startProgress("تصدير الفوائد");

			// Await the benefits data
			const benefits = await this.dataService.getAllBenefits();

			// Format data for export
			const exportData = {
				benefits: benefits,
				exportDate: new Date().toISOString(),
				version: "1.0",
			};

			// Update progress
			this.progressReporter.updateProgress(
				progressId,
				50,
				"جاري إنشاء ملف JSON..."
			);

			// Create JSON file with pretty formatting
			const jsonData = JSON.stringify(exportData, null, 2);

			// Update progress
			this.progressReporter.updateProgress(
				progressId,
				80,
				"جاري تنزيل الملف..."
			);

			// Download the file
			this.downloadFile(
				jsonData,
				`alrawi-benefits-export-${new Date()
					.toISOString()
					.slice(0, 10)}.json`,
				"application/json"
			);

			// Complete progress
			this.progressReporter.completeProgress(
				progressId,
				"تم تصدير الفوائد بنجاح"
			);

			new Notice("✅ تم تصدير الفوائد بنجاح");
		} catch (error) {
			console.error("Error exporting benefits:", error);
			this.progressReporter.failProgress("تصدير الفوائد");
			new Notice("❌ حدث خطأ أثناء تصدير الفوائد");
		}
	}

	/**
	 * Exports benefits to CSV
	 */
	public async exportBenefitsToCsv(): Promise<void> {
		try {
			// Start progress tracking
			const progressId = this.progressReporter.startProgress(
				"تصدير الفوائد إلى CSV"
			);

			// Await the benefits data
			const benefits = await this.dataService.getAllBenefits();

			// Update progress
			this.progressReporter.updateProgress(
				progressId,
				30,
				"جاري تحضير بيانات CSV..."
			);

			// Create CSV header
			const header =
				"العنوان,النص,التصنيف,المصدر,نوع المصدر,الصفحات,المجلد,الوسوم,تاريخ الإضافة\n";

			// Helper function to safely prepare CSV field
			const prepareField = (value: any): string => {
				if (value === null || value === undefined) return "";
				const str = String(value);
				// Escape quotes and wrap in quotes if contains comma, newline or quote
				if (
					str.includes('"') ||
					str.includes(",") ||
					str.includes("\n")
				) {
					return `"${str.replace(/"/g, '""')}"`;
				}
				return str;
			};

			// Update progress
			this.progressReporter.updateProgress(
				progressId,
				50,
				"جاري تحويل البيانات..."
			);

			// Convert benefits to CSV rows
			const rows = benefits
				.map((benefit) => {
					return [
						prepareField(benefit.title || benefit.category),
						prepareField(benefit.text),
						prepareField(benefit.category),
						prepareField(benefit.sourceTitle),
						prepareField(
							benefit.sourceType === "book" ? "كتاب" : "فيديو"
						),
						prepareField(benefit.pages || ""),
						prepareField(benefit.volume || ""),
						prepareField(
							Array.isArray(benefit.tags)
								? benefit.tags.join("; ")
								: ""
						),
						prepareField(benefit.dateAdded),
					].join(",");
				})
				.join("\n");

			// Update progress
			this.progressReporter.updateProgress(
				progressId,
				80,
				"جاري تنزيل الملف..."
			);

			// Download the file
			this.downloadFile(
				header + rows,
				`alrawi-benefits-export-${new Date()
					.toISOString()
					.slice(0, 10)}.csv`,
				"text/csv;charset=utf-8;"
			);

			// Complete progress
			this.progressReporter.completeProgress(
				progressId,
				"تم تصدير الفوائد بنجاح"
			);

			new Notice("✅ تم تصدير الفوائد بنجاح");
		} catch (error) {
			console.error("Error exporting benefits to CSV:", error);
			this.progressReporter.failProgress("تصدير الفوائد إلى CSV");
			new Notice("❌ حدث خطأ أثناء تصدير الفوائد");
		}
	}

	/**
	 * Exports videos to JSON
	 * @param selectedItems - Optional array of selected item paths to export
	 */
	private async exportVideosToJson(
		selectedItems: string[] = []
	): Promise<void> {
		try {
			const progressId = this.progressReporter.startProgress(
				"تصدير بيانات الفيديوهات"
			);

			this.progressReporter.updateProgress(
				progressId,
				30,
				"جاري استخراج البيانات..."
			);
			const jsonData = await this.dataService.exportVideosToJson(
				selectedItems
			);

			this.progressReporter.updateProgress(
				progressId,
				80,
				"جاري تنزيل الملف..."
			);
			// Create and download file
			this.downloadFile(
				jsonData,
				`alrawi-videos-export-${new Date()
					.toISOString()
					.slice(0, 10)}.json`,
				"application/json"
			);

			this.progressReporter.completeProgress(
				progressId,
				"تم تصدير بيانات الفيديوهات بنجاح"
			);
			new Notice("✅ تم تصدير بيانات الفيديوهات بنجاح");
		} catch (error) {
			console.error("Error exporting data:", error);
			this.progressReporter.failProgress("تصدير بيانات الفيديوهات");
			new Notice("❌ حدث خطأ أثناء تصدير البيانات");
		}
	}

	/**
	 * Exports videos to JSON with content
	 * @param selectedItems - Optional array of selected item paths to export
	 */
	private async exportVideosToJsonWithContent(
		selectedItems: string[] = []
	): Promise<void> {
		try {
			const progressId = this.progressReporter.startProgress(
				"تصدير الفيديوهات مع المحتوى",
				0
			);

			const jsonData = await this.dataService.exportVideosWithContent(
				selectedItems
			);

			this.progressReporter.updateProgress(
				progressId,
				95,
				"جاري تنزيل الملف..."
			);

			// Create and download file
			this.downloadFile(
				jsonData,
				`alrawi-videos-export-with-content-${new Date()
					.toISOString()
					.slice(0, 10)}.json`,
				"application/json"
			);

			this.progressReporter.completeProgress(
				progressId,
				"تم تصدير بيانات الفيديوهات مع المحتوى بنجاح"
			);
			new Notice("✅ تم تصدير بيانات الفيديوهات مع المحتوى بنجاح");
		} catch (error) {
			console.error("Error exporting data with content:", error);
			this.progressReporter.failProgress(
				"تصدير بيانات الفيديوهات مع المحتوى"
			);
			new Notice("❌ حدث خطأ أثناء تصدير البيانات مع المحتوى");
		}
	}

	/**
	 * Exports videos to CSV
	 * @param selectedItems - Optional array of selected item paths to export
	 */
	private async exportVideosToCsv(
		selectedItems: string[] = []
	): Promise<void> {
		try {
			const progressId = this.progressReporter.startProgress(
				"تصدير بيانات الفيديوهات إلى CSV"
			);

			this.progressReporter.updateProgress(
				progressId,
				40,
				"جاري تحضير ملف CSV..."
			);
			const csvData = await this.dataService.exportVideosToCsv(
				selectedItems
			);

			this.progressReporter.updateProgress(
				progressId,
				80,
				"جاري تنزيل الملف..."
			);
			// Create and download file
			this.downloadFile(
				csvData,
				`alrawi-videos-export-${new Date()
					.toISOString()
					.slice(0, 10)}.csv`,
				"text/csv;charset=utf-8;"
			);

			this.progressReporter.completeProgress(
				progressId,
				"تم تصدير بيانات الفيديوهات بنجاح"
			);
			new Notice("✅ تم تصدير بيانات الفيديوهات بنجاح");
		} catch (error) {
			console.error("Error exporting data:", error);
			this.progressReporter.failProgress(
				"تصدير بيانات الفيديوهات إلى CSV"
			);
			new Notice("❌ حدث خطأ أثناء تصدير البيانات");
		}
	}

	/**
	 * Exports books to JSON
	 * @param selectedItems - Optional array of selected item paths to export
	 */
	private async exportBooksToJson(
		selectedItems: string[] = []
	): Promise<void> {
		try {
			const progressId =
				this.progressReporter.startProgress("تصدير بيانات الكتب");

			this.progressReporter.updateProgress(
				progressId,
				40,
				"جاري استخراج البيانات..."
			);
			const jsonData = await this.dataService.exportBooksToJson(
				selectedItems
			);

			this.progressReporter.updateProgress(
				progressId,
				80,
				"جاري تنزيل الملف..."
			);
			// Create and download file
			this.downloadFile(
				jsonData,
				`alrawi-books-export-${new Date()
					.toISOString()
					.slice(0, 10)}.json`,
				"application/json"
			);

			this.progressReporter.completeProgress(
				progressId,
				"تم تصدير بيانات الكتب بنجاح"
			);
			new Notice("✅ تم تصدير بيانات الكتب بنجاح");
		} catch (error) {
			console.error("Error exporting data:", error);
			this.progressReporter.failProgress("تصدير بيانات الكتب");
			new Notice("❌ حدث خطأ أثناء تصدير البيانات");
		}
	}

	/**
	 * Exports books to JSON with content
	 * @param selectedItems - Optional array of selected item paths to export
	 */
	private async exportBooksToJsonWithContent(
		selectedItems: string[] = []
	): Promise<void> {
		try {
			const progressId = this.progressReporter.startProgress(
				"تصدير بيانات الكتب مع المحتوى",
				0
			);

			const jsonData = await this.dataService.exportBooksWithContent(
				selectedItems
			);

			this.progressReporter.updateProgress(
				progressId,
				95,
				"جاري تنزيل الملف..."
			);

			// Create and download file
			this.downloadFile(
				jsonData,
				`alrawi-books-export-with-content-${new Date()
					.toISOString()
					.slice(0, 10)}.json`,
				"application/json"
			);

			this.progressReporter.completeProgress(
				progressId,
				"تم تصدير بيانات الكتب مع المحتوى بنجاح"
			);
			new Notice("✅ تم تصدير بيانات الكتب مع المحتوى بنجاح");
		} catch (error) {
			console.error("Error exporting data with content:", error);
			this.progressReporter.failProgress("تصدير بيانات الكتب مع المحتوى");
			new Notice("❌ حدث خطأ أثناء تصدير البيانات مع المحتوى");
		}
	}

	/**
	 * Exports books to CSV
	 * @param selectedItems - Optional array of selected item paths to export
	 */
	private async exportBooksToCsv(
		selectedItems: string[] = []
	): Promise<void> {
		try {
			const progressId = this.progressReporter.startProgress(
				"تصدير بيانات الكتب إلى CSV"
			);

			this.progressReporter.updateProgress(
				progressId,
				40,
				"جاري تحضير ملف CSV..."
			);
			const csvData = await this.dataService.exportBooksToCsv(
				selectedItems
			);

			this.progressReporter.updateProgress(
				progressId,
				80,
				"جاري تنزيل الملف..."
			);
			// Create and download file
			this.downloadFile(
				csvData,
				`alrawi-books-export-${new Date()
					.toISOString()
					.slice(0, 10)}.csv`,
				"text/csv;charset=utf-8;"
			);

			this.progressReporter.completeProgress(
				progressId,
				"تم تصدير بيانات الكتب بنجاح"
			);
			new Notice("✅ تم تصدير بيانات الكتب بنجاح");
		} catch (error) {
			console.error("Error exporting data:", error);
			this.progressReporter.failProgress("تصدير بيانات الكتب إلى CSV");
			new Notice("❌ حدث خطأ أثناء تصدير البيانات");
		}
	}

	/**
	 * Helper function to download a file
	 * @param content - The content of the file
	 * @param filename - The filename
	 * @param contentType - The content type
	 */
	private downloadFile(
		content: string,
		filename: string,
		contentType: string
	): void {
		// Use Blob for better memory efficiency and handling of large files
		const blob = new Blob([content], { type: contentType });

		// Create object URL for the blob
		const url = URL.createObjectURL(blob);

		// Create a link element
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;

		// Append to body, click, and remove - this ensures it works across browsers
		document.body.appendChild(a);
		a.click();

		// Clean up
		setTimeout(() => {
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}, 100);
	}
}
