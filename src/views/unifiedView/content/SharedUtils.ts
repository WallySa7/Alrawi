// src/views/unifiedView/content/SharedUtils.ts
import { Notice, TFile, Menu } from "obsidian";
import {
	VideoItem,
	PlaylistItem,
	BookItem,
	Benefit,
	BulkOperation,
} from "../../../types";
import { DataService } from "../../../services/dataService";
import { App } from "obsidian";

/**
 * Shared utilities for content operations across different views
 */
export class SharedUtils {
	/**
	 * Opens a file in Obsidian
	 * @param app - Obsidian app instance
	 * @param filePath - Path to the file
	 * @param subPath - Optional subpath to scroll to (for benefits)
	 */
	public static openFile(app: App, filePath: string, subPath?: string): void {
		const file = app.vault.getAbstractFileByPath(filePath);
		if (file instanceof TFile) {
			const leaf = app.workspace.getLeaf();

			if (subPath) {
				// If we have a subPath (for benefits), open with specific scroll location
				leaf.openFile(file, {
					state: {
						mode: "source",
						line: parseInt(subPath) || undefined,
					},
				});
			} else {
				leaf.openFile(file);
			}
		}
	}

	/**
	 * Formats a tag for display
	 * @param tag - Tag string
	 * @param element - Element to add tag content to
	 */
	public static formatTagForDisplay(tag: string, element: HTMLElement): void {
		if (tag.includes("/")) {
			// Hierarchical tag
			const [parent, ...childParts] = tag.split("/");
			const child = childParts.join("/");

			element.addClass("alrawi-hierarchical-tag");

			const parentSpan = element.createEl("span", {
				cls: "alrawi-tag-parent",
				text: parent,
			});
			element.createEl("span", { text: "/" });
			const childSpan = element.createEl("span", {
				cls: "alrawi-tag-child",
				text: child,
			});
		} else {
			// Regular tag
			element.textContent = tag;
		}
	}

	/**
	 * Formats a category for display, handling hierarchical structure
	 * @param category - Category string
	 * @param element - Element to add category content to
	 */
	public static formatCategoryForDisplay(
		category: string,
		element: HTMLElement
	): void {
		if (category.includes("/")) {
			// Hierarchical category
			const [parent, ...childParts] = category.split("/");
			const child = childParts.join("/");

			element.addClass("alrawi-hierarchical-category");

			const parentSpan = element.createEl("span", {
				cls: "alrawi-category-parent",
				text: parent,
			});
			element.createEl("span", { text: "/" });
			const childSpan = element.createEl("span", {
				cls: "alrawi-category-child",
				text: child,
			});
		} else {
			// Regular category
			element.textContent = category;
		}
	}

	/**
	 * Show generic confirmation dialog for item deletion
	 * @param item - Item to delete
	 * @param onConfirm - Callback when deletion is confirmed
	 */
	public static confirmItemDelete(
		item: any,
		onConfirm: () => Promise<void>
	): void {
		const confirmDialog = document.createElement("div");
		confirmDialog.className = "alrawi-confirm-dialog";

		const message = document.createElement("p");
		message.textContent = `هل أنت متأكد من رغبتك في حذف "${item.title}"؟ لا يمكن التراجع عن هذا الإجراء.`;
		message.className = "alrawi-confirm-message";

		const buttonContainer = document.createElement("div");
		buttonContainer.className = "alrawi-confirm-buttons";

		const confirmButton = document.createElement("button");
		confirmButton.textContent = "حذف";
		confirmButton.className = "alrawi-confirm-delete";
		confirmButton.addEventListener("click", async () => {
			document.body.removeChild(confirmDialog);
			await onConfirm();
		});

		const cancelButton = document.createElement("button");
		cancelButton.textContent = "إلغاء";
		cancelButton.className = "alrawi-confirm-cancel";
		cancelButton.addEventListener("click", () => {
			document.body.removeChild(confirmDialog);
		});

		buttonContainer.appendChild(confirmButton);
		buttonContainer.appendChild(cancelButton);

		confirmDialog.appendChild(message);
		confirmDialog.appendChild(buttonContainer);

		document.body.appendChild(confirmDialog);
	}

	/**
	 * Performs item deletion with bulk operation API
	 * @param dataService - Data service instance
	 * @param item - Item to delete
	 * @param onComplete - Callback after deletion completes
	 */
	public static async performItemDelete(
		dataService: DataService,
		item: VideoItem | PlaylistItem | BookItem | Benefit,
		onComplete: () => Promise<void>
	): Promise<void> {
		new Notice(`⏳ جاري الحذف...`);

		const operation: BulkOperation = {
			type: "delete",
			itemPaths: "filePath" in item ? [item.filePath] : [],
		};

		const result = await dataService.performBulkOperation(operation);

		if (result.success > 0) {
			new Notice(`✅ تم الحذف بنجاح`);
			// Refresh the view to show changes
			await onComplete();
		} else {
			new Notice(`❌ فشل الحذف`);
		}
	}

	/**
	 * Shows a standardized dialog for editing tags
	 * @param item - Item to edit tags for
	 * @param dataService - Data service instance
	 * @param contentType - Content type ('videos', 'books', or 'benefits')
	 * @param onComplete - Callback after edit completes
	 */
	public static async showEditTagsDialog(
		item: VideoItem | PlaylistItem | BookItem | Benefit,
		dataService: DataService,
		contentType: "videos" | "books" | "benefits",
		onComplete: () => Promise<void>
	): Promise<void> {
		const dialog = document.createElement("div");
		dialog.className = "alrawi-modal-dialog alrawi-edit-tags-dialog";

		// Add header with title and close button
		const header = dialog.createEl("div", { cls: "alrawi-dialog-header" });
		header.createEl("h3", {
			text: "تعديل الوسوم",
			cls: "alrawi-dialog-title",
		});

		// Create content area
		const content = dialog.createEl("div", {
			cls: "alrawi-dialog-content",
		});

		// Item title
		content.createEl("div", {
			text: item.title,
			cls: "alrawi-dialog-item-title",
		});

		// Current tags section
		const currentSection = content.createEl("div", {
			cls: "alrawi-dialog-section",
		});
		currentSection.createEl("h4", {
			text: "الوسوم الحالية:",
			cls: "alrawi-dialog-section-title",
		});

		// Show current tags as chips that can be removed
		const currentTagsContainer = currentSection.createEl("div", {
			cls: "alrawi-selected-categories",
		});

		// Array to track current tags
		const selectedTags = Array.isArray(item.tags) ? [...item.tags] : [];

		// Function to render the current tags
		const renderSelectedTags = () => {
			currentTagsContainer.empty();

			if (selectedTags.length === 0) {
				currentTagsContainer.createEl("div", {
					text: "لا توجد وسوم",
					cls: "alrawi-no-categories",
				});
				return;
			}

			selectedTags.forEach((tag) => {
				const chip = currentTagsContainer.createEl("div", {
					cls: "alrawi-category-chip",
				});

				if (tag.includes("/")) {
					// Hierarchical tag
					const [parent, ...childParts] = tag.split("/");
					const child = childParts.join("/");

					const tagContent = chip.createEl("span", {
						cls: "alrawi-hierarchical-tag",
					});
					tagContent.createEl("span", {
						cls: "alrawi-tag-parent",
						text: parent,
					});
					tagContent.createEl("span", { text: "/" });
					tagContent.createEl("span", {
						cls: "alrawi-tag-child",
						text: child,
					});
				} else {
					chip.createEl("span", { text: tag });
				}

				const removeBtn = chip.createEl("span", {
					text: "×",
					cls: "alrawi-category-remove",
				});
				removeBtn.addEventListener("click", () => {
					const index = selectedTags.indexOf(tag);
					if (index > -1) {
						selectedTags.splice(index, 1);
						renderSelectedTags();
					}
				});
			});
		};

		// Initial render of current tags
		renderSelectedTags();

		// Add new tag section
		const newSection = content.createEl("div", {
			cls: "alrawi-dialog-section",
		});
		newSection.createEl("h4", {
			text: "إضافة وسم جديد:",
			cls: "alrawi-dialog-section-title",
		});

		// Input for new tag
		const inputGroup = newSection.createEl("div", {
			cls: "alrawi-input-group",
		});
		const input = inputGroup.createEl("input", {
			type: "text",
			placeholder: "أدخل اسم الوسم",
			cls: "alrawi-category-input",
		});

		const addButton = inputGroup.createEl("button", {
			text: "إضافة",
			cls: "alrawi-add-button",
		});

		// Add tag when button is clicked
		addButton.addEventListener("click", () => {
			const tag = input.value.trim();
			if (tag && !selectedTags.includes(tag)) {
				selectedTags.push(tag);
				renderSelectedTags();
				input.value = "";
				input.focus();
			}
		});

		// Add tag on Enter key
		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				const tag = input.value.trim();
				if (tag && !selectedTags.includes(tag)) {
					selectedTags.push(tag);
					renderSelectedTags();
					input.value = "";
				}
			}
		});

		// Suggestions section
		const suggestionsSection = content.createEl("div", {
			cls: "alrawi-dialog-section",
		});
		suggestionsSection.createEl("h4", {
			text: "اقتراحات الوسوم:",
			cls: "alrawi-dialog-section-title",
		});

		const suggestionsContainer = suggestionsSection.createEl("div", {
			cls: "alrawi-category-suggestions",
		});

		// Get all available tags
		const allTags = await dataService.getTags(
			contentType === "books" ? "books" : undefined
		);

		// Show suggestions
		if (allTags.length > 0) {
			allTags.forEach((tag) => {
				if (!selectedTags.includes(tag)) {
					const chip = suggestionsContainer.createEl("div", {
						cls: "alrawi-suggestion-chip",
					});

					if (tag.includes("/")) {
						// Hierarchical tag
						const [parent, ...childParts] = tag.split("/");
						const child = childParts.join("/");

						const tagContent = chip.createEl("span", {
							cls: "alrawi-hierarchical-tag",
						});
						tagContent.createEl("span", {
							cls: "alrawi-tag-parent",
							text: parent,
						});
						tagContent.createEl("span", { text: "/" });
						tagContent.createEl("span", {
							cls: "alrawi-tag-child",
							text: child,
						});
					} else {
						chip.textContent = tag;
					}

					chip.addEventListener("click", () => {
						if (!selectedTags.includes(tag)) {
							selectedTags.push(tag);
							renderSelectedTags();
						}
					});
				}
			});
		} else {
			suggestionsContainer.createEl("div", {
				text: "لا توجد اقتراحات",
				cls: "alrawi-no-suggestions",
			});
		}

		// Footer with buttons
		const footer = dialog.createEl("div", { cls: "alrawi-dialog-footer" });

		const cancelButton = footer.createEl("button", {
			text: "إلغاء",
			cls: "alrawi-cancel-button",
		});

		const saveButton = footer.createEl("button", {
			text: "حفظ",
			cls: "alrawi-save-button",
		});

		// Cancel action
		cancelButton.addEventListener("click", () => {
			document.body.removeChild(dialog);
		});

		// Save action
		saveButton.addEventListener("click", async () => {
			if ("filePath" in item) {
				await dataService.updateTags(item.filePath, selectedTags);
			} else {
				console.error("Item does not have a filePath property.");
			}
			item.tags = selectedTags;
			document.body.removeChild(dialog);
			await onComplete();
		});

		// Add dialog to document body
		document.body.appendChild(dialog);

		// Focus the input
		input.focus();
	}

	/**
	 * Shows a standardized dialog for editing categories
	 * @param item - Item to edit categories for
	 * @param dataService - Data service instance
	 * @param contentType - Content type ('videos', 'books', or 'benefits')
	 * @param onComplete - Callback after edit completes
	 */
	public static async showEditCategoriesDialog(
		item: VideoItem | PlaylistItem | BookItem | Benefit,
		dataService: DataService,
		contentType: "videos" | "books" | "benefits",
		onComplete: () => Promise<void>
	): Promise<void> {
		const dialog = document.createElement("div");
		dialog.className = "alrawi-modal-dialog alrawi-edit-categories-dialog";

		// Add header with title and close button
		const header = dialog.createEl("div", { cls: "alrawi-dialog-header" });
		header.createEl("h3", {
			text: "تعديل التصنيفات",
			cls: "alrawi-dialog-title",
		});

		// Create content area
		const content = dialog.createEl("div", {
			cls: "alrawi-dialog-content",
		});

		// Item title
		content.createEl("div", {
			text: item.title,
			cls: "alrawi-dialog-item-title",
		});

		// Current categories section
		const currentSection = content.createEl("div", {
			cls: "alrawi-dialog-section",
		});
		currentSection.createEl("h4", {
			text: "التصنيفات الحالية:",
			cls: "alrawi-dialog-section-title",
		});

		// Show current categories as chips that can be removed
		const currentCategoriesContainer = currentSection.createEl("div", {
			cls: "alrawi-selected-categories",
		});

		// Array to track current categories
		const selectedCategories =
			"categories" in item && Array.isArray(item.categories)
				? [...item.categories]
				: [];

		// Function to render the current categories
		const renderSelectedCategories = () => {
			currentCategoriesContainer.empty();

			if (selectedCategories.length === 0) {
				currentCategoriesContainer.createEl("div", {
					text: "لا توجد تصنيفات",
					cls: "alrawi-no-categories",
				});
				return;
			}

			selectedCategories.forEach((category) => {
				const chip = currentCategoriesContainer.createEl("div", {
					cls: "alrawi-category-chip",
				});

				if (category.includes("/")) {
					// Hierarchical category
					const [parent, ...childParts] = category.split("/");
					const child = childParts.join("/");

					const categoryContent = chip.createEl("span", {
						cls: "alrawi-hierarchical-category",
					});
					categoryContent.createEl("span", {
						cls: "alrawi-category-parent",
						text: parent,
					});
					categoryContent.createEl("span", { text: "/" });
					categoryContent.createEl("span", {
						cls: "alrawi-category-child",
						text: child,
					});
				} else {
					chip.createEl("span", { text: category });
				}

				const removeBtn = chip.createEl("span", {
					text: "×",
					cls: "alrawi-category-remove",
				});
				removeBtn.addEventListener("click", () => {
					const index = selectedCategories.indexOf(category);
					if (index > -1) {
						selectedCategories.splice(index, 1);
						renderSelectedCategories();
					}
				});
			});
		};

		// Initial render of current categories
		renderSelectedCategories();

		// Add new category section
		const newSection = content.createEl("div", {
			cls: "alrawi-dialog-section",
		});
		newSection.createEl("h4", {
			text: "إضافة تصنيف جديد:",
			cls: "alrawi-dialog-section-title",
		});

		// Input for new category
		const inputGroup = newSection.createEl("div", {
			cls: "alrawi-input-group",
		});
		const input = inputGroup.createEl("input", {
			type: "text",
			placeholder: "أدخل اسم التصنيف",
			cls: "alrawi-category-input",
		});

		const addButton = inputGroup.createEl("button", {
			text: "إضافة",
			cls: "alrawi-add-button",
		});

		// Add category when button is clicked
		addButton.addEventListener("click", () => {
			const category = input.value.trim();
			if (category && !selectedCategories.includes(category)) {
				selectedCategories.push(category);
				renderSelectedCategories();
				input.value = "";
				input.focus();
			}
		});

		// Add category on Enter key
		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				const category = input.value.trim();
				if (category && !selectedCategories.includes(category)) {
					selectedCategories.push(category);
					renderSelectedCategories();
					input.value = "";
				}
			}
		});

		// Suggestions section
		const suggestionsSection = content.createEl("div", {
			cls: "alrawi-dialog-section",
		});
		suggestionsSection.createEl("h4", {
			text: "اقتراحات التصنيفات:",
			cls: "alrawi-dialog-section-title",
		});

		const suggestionsContainer = suggestionsSection.createEl("div", {
			cls: "alrawi-category-suggestions",
		});

		// Get category suggestions from dataService
		let allCategories: string[] = [];
		if (contentType === "videos") {
			allCategories = await dataService.getVideoCategories();
		} else if (contentType === "books") {
			allCategories = await dataService.getBookCategories();
		} else if (contentType === "benefits") {
			allCategories = await dataService.getBenefitCategories();
		}

		// Show suggestions
		if (allCategories.length > 0) {
			allCategories.forEach((category) => {
				if (!selectedCategories.includes(category)) {
					const chip = suggestionsContainer.createEl("div", {
						cls: "alrawi-suggestion-chip",
						text: category,
					});

					chip.addEventListener("click", () => {
						if (!selectedCategories.includes(category)) {
							selectedCategories.push(category);
							renderSelectedCategories();
						}
					});
				}
			});
		} else {
			suggestionsContainer.createEl("div", {
				text: "لا توجد اقتراحات",
				cls: "alrawi-no-suggestions",
			});
		}

		// Footer with buttons
		const footer = dialog.createEl("div", { cls: "alrawi-dialog-footer" });

		const cancelButton = footer.createEl("button", {
			text: "إلغاء",
			cls: "alrawi-cancel-button",
		});

		const saveButton = footer.createEl("button", {
			text: "حفظ",
			cls: "alrawi-save-button",
		});

		// Cancel action
		cancelButton.addEventListener("click", () => {
			document.body.removeChild(dialog);
		});

		// Save action
		saveButton.addEventListener("click", async () => {
			if (contentType === "videos") {
				await dataService.updateVideoCategories(
					"filePath" in item ? item.filePath : "",
					selectedCategories
				);
			} else if (contentType === "books") {
				await dataService.updateBookCategories(
					"filePath" in item ? item.filePath : "",
					selectedCategories
				);
			}

			if ("categories" in item) {
				item.categories = selectedCategories;
			}
			document.body.removeChild(dialog);
			await onComplete();
		});

		// Add dialog to document body
		document.body.appendChild(dialog);

		// Focus the input
		input.focus();
	}

	/**
	 * Creates status dropdown for items
	 * @param container - Container element to add dropdown to
	 * @param item - Item to create dropdown for
	 * @param statusOptions - Status options to display
	 * @param dataService - Data service instance
	 * @param onStatusChange - Callback after status changes
	 */
	public static createStatusDropdown(
		container: HTMLElement,
		item: VideoItem | PlaylistItem | BookItem,
		statusOptions: string[],
		dataService: DataService,
		onStatusChange: () => Promise<void>
	): void {
		const select = container.createEl("select", {
			cls: "alrawi-status-select",
		});

		statusOptions.forEach((option: string) => {
			const optionEl = select.createEl("option", {
				value: option,
				text: option,
			});
			if (option === item.status) {
				optionEl.selected = true;
			}
		});

		// Add status class for styling
		const statusClass = `status-${(item.status || "")
			.toLowerCase()
			.replace(/\s+/g, "-")}`;
		select.addClass(statusClass);

		select.addEventListener("change", async () => {
			const newStatus = select.value;

			await dataService.updateStatus(item.filePath, newStatus);

			// Update only the status class without full re-render
			select.className = `alrawi-status-select status-${newStatus
				.toLowerCase()
				.replace(/\s+/g, "-")}`;
			item.status = newStatus;

			// For books, handle additional updates based on status
			if ("pages" in item) {
				// If the status is "قيد القراءة" (reading) and no start date, set it to today
				if (newStatus === "قيد القراءة" && !item.startDate) {
					const today = new Date().toISOString().split("T")[0];
					await dataService.updateBookStartDate(item.filePath, today);
					item.startDate = today;
				}

				// If the status is "تمت القراءة" (completed) and no completion date, set it to today
				if (newStatus === "تمت القراءة") {
					if (!item.completionDate) {
						const today = new Date().toISOString().split("T")[0];
						await dataService.updateBookCompletionDate(
							item.filePath,
							today
						);
						item.completionDate = today;
					}

					// Also ensure pages read equals total pages
					if (item.pagesRead < item.pages) {
						await dataService.updateBookProgress(
							item.filePath,
							item.pages
						);
						item.pagesRead = item.pages;
					}
				}
			}

			// Call the callback to update UI if needed
			await onStatusChange();
		});
	}
}
