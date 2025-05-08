// src/views/unifiedView/components/EnhancedBulkActions.ts
import { Menu, Notice, setIcon } from "obsidian";
import { ComponentProps } from "../types";
import { SelectionState, SelectionStateEvents } from "../state/SelectionState";
import { CONTENT_TYPE } from "../constants";
import { BulkOperation } from "../../../types";

/**
 * Props for the EnhancedBulkActions component
 */
interface EnhancedBulkActionsProps extends ComponentProps {
	selectionState: SelectionState;
	onOperationComplete: () => Promise<void>;
}

/**
 * Enhanced BulkActions component with optimized rendering
 * Allows performaing operations on multiple selected items
 */
export class BulkActions {
	private props: EnhancedBulkActionsProps;
	private element: HTMLElement | null = null;
	private stateUnsubscribes: (() => void)[] = [];

	/**
	 * Creates a new EnhancedBulkActions component
	 * @param props - Component props
	 */
	constructor(props: EnhancedBulkActionsProps) {
		this.props = props;

		// Subscribe to selection changes
		const unsubscribe = props.selectionState.subscribe(
			SelectionStateEvents.SELECTION_CHANGED,
			this.handleSelectionChange.bind(this)
		);

		this.stateUnsubscribes.push(unsubscribe);
	}

	/**
	 * Renders the bulk actions bar
	 * @param container - Container to render into
	 * @returns The rendered element
	 */
	public render(container: HTMLElement): HTMLElement {
		this.element = container.createEl("div", {
			cls: "alrawi-bulk-actions-bar",
		});

		// Hide by default until items are selected
		this.element.style.display = "none";

		// Selection count label
		const bulkActionsLabel = this.element.createEl("span", {
			cls: "alrawi-bulk-actions-label",
			text: "إجراءات متعددة: ",
		});

		// Status button
		const bulkStatusButton = this.element.createEl("button", {
			cls: "alrawi-bulk-action-btn",
			text: "تعديل الحالة",
		});
		bulkStatusButton.addEventListener("click", (e) => {
			this.showBulkStatusMenu(bulkStatusButton);
		});

		// Tags button
		const bulkTagButton = this.element.createEl("button", {
			cls: "alrawi-bulk-action-btn",
			text: "إضافة وسم",
		});
		bulkTagButton.addEventListener("click", (e) => {
			this.showBulkTagMenu(bulkTagButton);
		});

		// Categories button
		const bulkCategoryButton = this.element.createEl("button", {
			cls: "alrawi-bulk-action-btn",
			text: "تعديل التصنيفات",
		});
		bulkCategoryButton.addEventListener("click", (e) => {
			this.showBulkCategoryDialog();
		});

		// Delete button
		const bulkDeleteButton = this.element.createEl("button", {
			cls: "alrawi-bulk-action-btn alrawi-delete-btn",
			text: "حذف",
		});
		bulkDeleteButton.addEventListener("click", (e) => {
			this.confirmBulkDelete();
		});

		// Cancel button
		const bulkCancelButton = this.element.createEl("button", {
			cls: "alrawi-bulk-action-btn alrawi-cancel-btn",
			text: "إلغاء",
		});
		bulkCancelButton.addEventListener("click", (e) => {
			this.props.selectionState.clearSelection();
			this.props.onOperationComplete();
		});

		// Initialize display
		this.updateDisplay();

		return this.element;
	}

	/**
	 * Updates display based on selection state
	 */
	private updateDisplay(): void {
		if (!this.element) return;

		const selectedItems = this.props.selectionState.getSelectedItems();

		if (selectedItems.length > 0) {
			this.element.style.display = "flex";

			// Update label with count
			const label = this.element.querySelector(
				".alrawi-bulk-actions-label"
			);
			if (label) {
				label.textContent = `إجراءات متعددة (${selectedItems.length}): `;
			}
		} else {
			this.element.style.display = "none";
		}
	}

	/**
	 * Handles selection change events
	 */
	private handleSelectionChange(): void {
		this.updateDisplay();
	}

	/**
	 * Shows the bulk status menu
	 * @param buttonEl - Button element to position menu against
	 */
	private showBulkStatusMenu(buttonEl: HTMLElement): void {
		const menu = new Menu();

		// Display appropriate status options based on content type
		if (this.props.contentType === CONTENT_TYPE.VIDEOS) {
			this.props.settings.progressTracking.statusOptions.forEach(
				(status: string) => {
					menu.addItem((item) => {
						item.setTitle(status).onClick(async () => {
							await this.performBulkStatusUpdate(status);
						});
					});
				}
			);
		} else {
			this.props.settings.booksSettings.bookStatusOptions.forEach(
				(status: string) => {
					menu.addItem((item) => {
						item.setTitle(status).onClick(async () => {
							await this.performBulkStatusUpdate(status);
						});
					});
				}
			);
		}

		const rect = buttonEl.getBoundingClientRect();
		menu.showAtPosition({ x: rect.left, y: rect.bottom });
	}

	/**
	 * Performs bulk status update on selected items
	 * @param status - New status value
	 */
	private async performBulkStatusUpdate(status: string): Promise<void> {
		const selectedItems = this.props.selectionState.getSelectedItems();
		if (selectedItems.length === 0) return;

		// Show progress notification
		new Notice(`⏳ جاري تحديث ${selectedItems.length} من العناصر...`);

		// Create bulk operation
		const operation: BulkOperation = {
			type: "status",
			value: status,
			itemPaths: selectedItems,
		};

		// Perform operation
		const result = await this.props.dataService.performBulkOperation(
			operation
		);

		// Show results
		if (result.success > 0) {
			new Notice(
				`✅ تم تحديث ${result.success} من العناصر إلى "${status}"`
			);
		}

		if (result.failed > 0) {
			new Notice(`⚠️ فشل تحديث ${result.failed} من العناصر`);
		}

		// Additional operations for books
		if (
			this.props.contentType === CONTENT_TYPE.BOOKS &&
			(status === "قيد القراءة" || status === "تمت القراءة")
		) {
			const today = new Date().toISOString().split("T")[0];

			for (const filePath of selectedItems) {
				if (status === "قيد القراءة") {
					await this.props.dataService.updateBookStartDate(
						filePath,
						today
					);
				} else if (status === "تمت القراءة") {
					await this.props.dataService.updateBookCompletionDate(
						filePath,
						today
					);

					// For completed books, set pages read to total pages
					const book = await this.props.dataService.getBookData(
						filePath
					);
					if (book && book.pagesRead < book.pages) {
						await this.props.dataService.updateBookProgress(
							filePath,
							book.pages
						);
					}
				}
			}
		}

		// Clean up and refresh
		this.props.selectionState.clearSelection();
		this.props.onOperationComplete();
	}

	/**
	 * Shows the bulk tag menu
	 * @param buttonEl - Button element to position menu against
	 */
	private async showBulkTagMenu(buttonEl: HTMLElement): Promise<void> {
		const menu = new Menu();

		// Get all available tags based on content type
		const allTags: string[] =
			this.props.contentType === CONTENT_TYPE.VIDEOS
				? await this.props.dataService.getExistingTags()
				: await this.props.dataService.getExistingTags("books");

		// Add existing tags as options (up to 10)
		allTags.slice(0, 10).forEach((tag) => {
			menu.addItem((item) => {
				item.setTitle(tag).onClick(async () => {
					await this.performBulkTagUpdate(tag);
				});
			});
		});

		// Add custom tag option
		menu.addItem((item) => {
			item.setTitle("إضافة وسم جديد...").onClick(() => {
				this.showCustomTagDialog();
			});
		});

		const rect = buttonEl.getBoundingClientRect();
		menu.showAtPosition({ x: rect.left, y: rect.bottom });
	}

	/**
	 * Shows a dialog for creating a custom tag
	 */
	private showCustomTagDialog(): void {
		// Create a modern, styled dialog
		const dialog = document.createElement("div");
		dialog.className = "alrawi-modal-dialog alrawi-custom-tag-dialog";

		// Add header with title and close button
		const header = dialog.createEl("div", { cls: "alrawi-dialog-header" });
		header.createEl("h3", {
			text: "إضافة وسم جديد",
			cls: "alrawi-dialog-title",
		});

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

		// Input for new tag
		const inputContainer = content.createEl("div", {
			cls: "alrawi-input-container",
		});
		const input = inputContainer.createEl("input", {
			type: "text",
			placeholder: "أدخل اسم الوسم",
			cls: "alrawi-tag-input",
		});

		// Description
		content.createEl("p", {
			cls: "alrawi-dialog-description",
			text: "يمكنك إنشاء وسوم بصيغة تسلسلية باستخدام الشرطة المائلة. مثال: تقنية/برمجة",
		});

		// Add footer with buttons
		const footer = dialog.createEl("div", { cls: "alrawi-dialog-footer" });

		const submitButton = footer.createEl("button", {
			text: "إضافة",
			cls: "alrawi-submit-button",
		});

		const cancelButton = footer.createEl("button", {
			text: "إلغاء",
			cls: "alrawi-cancel-button",
		});

		// Add tag action
		submitButton.addEventListener("click", async () => {
			const tag = input.value.trim();
			if (tag) {
				await this.performBulkTagUpdate(tag);
				document.body.removeChild(dialog);
			}
		});

		// Cancel action
		cancelButton.addEventListener("click", () => {
			document.body.removeChild(dialog);
		});

		// Handle Enter key
		input.addEventListener("keydown", async (e) => {
			if (e.key === "Enter") {
				const tag = input.value.trim();
				if (tag) {
					await this.performBulkTagUpdate(tag);
					document.body.removeChild(dialog);
				}
			} else if (e.key === "Escape") {
				document.body.removeChild(dialog);
			}
		});

		// Add dialog to DOM and focus input
		document.body.appendChild(dialog);
		input.focus();
	}

	/**
	 * Performs bulk tag update on selected items
	 * @param tag - Tag to add
	 */
	private async performBulkTagUpdate(tag: string): Promise<void> {
		const selectedItems = this.props.selectionState.getSelectedItems();
		if (selectedItems.length === 0) return;

		// Show progress notification
		new Notice(
			`⏳ جاري إضافة الوسم "${tag}" إلى ${selectedItems.length} من العناصر...`
		);

		// Create bulk operation
		const operation: BulkOperation = {
			type: "tag",
			value: tag,
			itemPaths: selectedItems,
		};

		// Perform operation
		const result = await this.props.dataService.performBulkOperation(
			operation
		);

		// Show results
		if (result.success > 0) {
			new Notice(
				`✅ تم إضافة الوسم "${tag}" إلى ${result.success} من العناصر`
			);
		}

		if (result.failed > 0) {
			new Notice(`⚠️ فشل إضافة الوسم إلى ${result.failed} من العناصر`);
		}

		// Clean up and refresh
		this.props.selectionState.clearSelection();
		this.props.onOperationComplete();
	}

	/**
	 * Shows the bulk category dialog
	 */
	private async showBulkCategoryDialog(): Promise<void> {
		const selectedItems = this.props.selectionState.getSelectedItems();
		if (selectedItems.length === 0) return;

		// Create the modal dialog container
		const dialog = document.createElement("div");
		dialog.className = "alrawi-modal-dialog alrawi-edit-categories-dialog";

		// Add title and header
		const header = dialog.createEl("div", { cls: "alrawi-dialog-header" });
		header.createEl("h3", {
			text: "تعديل التصنيفات بشكل جماعي",
			cls: "alrawi-dialog-title",
		});

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

		// Display count of selected items
		content.createEl("div", {
			text: `العناصر المحددة: ${selectedItems.length}`,
			cls: "alrawi-dialog-item-count",
		});

		// Create array to track selected categories
		const selectedCategories: string[] = [];

		// Current categories section
		const currentSection = content.createEl("div", {
			cls: "alrawi-dialog-section",
		});
		currentSection.createEl("h4", {
			text: "التصنيفات المحددة:",
			cls: "alrawi-dialog-section-title",
		});

		// Container for selected categories
		const selectedCategoriesContainer = currentSection.createEl("div", {
			cls: "alrawi-selected-categories",
		});

		// Function to render selected categories
		const renderSelectedCategories = () => {
			selectedCategoriesContainer.empty();

			if (selectedCategories.length === 0) {
				selectedCategoriesContainer.createEl("div", {
					text: "لا توجد تصنيفات محددة",
					cls: "alrawi-no-categories",
				});
				return;
			}

			selectedCategories.forEach((category) => {
				const chip = selectedCategoriesContainer.createEl("div", {
					cls: "alrawi-category-chip",
				});

				chip.createEl("span", { text: category });

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

		// Initial render
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

		// Get category suggestions from dataService based on content type
		let allCategories: string[] = [];

		if (this.props.contentType === CONTENT_TYPE.VIDEOS) {
			allCategories =
				await this.props.dataService.getExistingVideoCategories();
		} else if (this.props.contentType === CONTENT_TYPE.BOOKS) {
			allCategories =
				await this.props.dataService.getExistingBookCategories();
		} else if (this.props.contentType === CONTENT_TYPE.BENEFITS) {
			allCategories =
				await this.props.dataService.getExistingBenefitCategories();
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

		// Operation mode section
		const operationModeSection = content.createEl("div", {
			cls: "alrawi-dialog-section",
		});
		operationModeSection.createEl("h4", {
			text: "طريقة التطبيق:",
			cls: "alrawi-dialog-section-title",
		});

		const operationModeContainer = operationModeSection.createEl("div", {
			cls: "alrawi-operation-mode-container",
		});

		// Radio buttons for operation mode
		const replaceRadio = operationModeContainer.createEl("label", {
			cls: "alrawi-radio-label",
		});
		const replaceInput = replaceRadio.createEl("input", {
			type: "radio",
			attr: { name: "operation-mode" },
			value: "replace",
		});
		replaceInput.checked = true;
		replaceRadio.createEl("span", { text: "استبدال التصنيفات الحالية" });

		const appendRadio = operationModeContainer.createEl("label", {
			cls: "alrawi-radio-label",
		});
		const appendInput = appendRadio.createEl("input", {
			type: "radio",
			attr: { name: "operation-mode" },
			value: "append",
		});
		appendRadio.createEl("span", { text: "إضافة إلى التصنيفات الحالية" });

		// Footer with buttons
		const footer = dialog.createEl("div", { cls: "alrawi-dialog-footer" });

		const cancelButton = footer.createEl("button", {
			text: "إلغاء",
			cls: "alrawi-cancel-button",
		});

		const saveButton = footer.createEl("button", {
			text: "تطبيق",
			cls: "alrawi-save-button",
		});

		// Cancel action
		cancelButton.addEventListener("click", () => {
			document.body.removeChild(dialog);
		});

		// Apply action
		saveButton.addEventListener("click", async () => {
			if (selectedCategories.length === 0) {
				new Notice("الرجاء اختيار تصنيف واحد على الأقل");
				return;
			}

			// Determine operation mode
			const mode = replaceInput.checked ? "replace" : "append";

			// Perform the bulk operation
			await this.performBulkCategoryUpdate(selectedCategories, mode);

			document.body.removeChild(dialog);
		});

		// Add dialog to document body
		document.body.appendChild(dialog);

		// Focus the input
		input.focus();
	}

	/**
	 * Performs bulk category update
	 * @param categories - Categories to update
	 * @param mode - Update mode ('replace' or 'append')
	 */
	private async performBulkCategoryUpdate(
		categories: string[],
		mode: "replace" | "append"
	): Promise<void> {
		const selectedItems = this.props.selectionState.getSelectedItems();
		if (selectedItems.length === 0) return;

		// Show progress notification
		new Notice(
			`⏳ جاري تعديل التصنيفات لـ ${selectedItems.length} من العناصر...`
		);

		let successCount = 0;
		let failedCount = 0;

		for (const filePath of selectedItems) {
			try {
				let updatedCategories: string[] = [];

				// Get item type
				const itemInfo = await this.props.dataService.getNoteType(
					filePath
				);

				if (mode === "append") {
					// Get existing categories and merge
					let existingCategories: string[] = [];

					if (itemInfo.type === "book") {
						const book = await this.props.dataService.getBookData(
							filePath
						);
						if (book && book.categories) {
							existingCategories = book.categories;
						}
					} else if (itemInfo.type === "video") {
						const video = await this.props.dataService.getVideoData(
							filePath
						);
						if (video && video.categories) {
							existingCategories = video.categories;
						}
					}

					// Merge categories and remove duplicates
					updatedCategories = [
						...new Set([...existingCategories, ...categories]),
					];
				} else {
					// Replace mode - just use the new categories
					updatedCategories = categories;
				}

				// Update the categories based on item type
				let success = false;

				if (itemInfo.type === "book") {
					success = await this.props.dataService.updateBookCategories(
						filePath,
						updatedCategories
					);
				} else if (itemInfo.type === "video") {
					success =
						await this.props.dataService.updateVideoCategories(
							filePath,
							updatedCategories
						);
				}

				if (success) {
					successCount++;
				} else {
					failedCount++;
				}
			} catch (error) {
				console.error(
					`Error updating categories for ${filePath}:`,
					error
				);
				failedCount++;
			}
		}

		// Show results
		if (successCount > 0) {
			new Notice(`✅ تم تحديث التصنيفات لـ ${successCount} من العناصر`);
		}

		if (failedCount > 0) {
			new Notice(`⚠️ فشل تحديث التصنيفات لـ ${failedCount} من العناصر`);
		}

		// Clean up and refresh
		this.props.selectionState.clearSelection();
		this.props.onOperationComplete();
	}

	/**
	 * Shows a confirmation dialog for bulk delete
	 */
	private confirmBulkDelete(): void {
		const selectedItems = this.props.selectionState.getSelectedItems();
		if (selectedItems.length === 0) return;

		const count = selectedItems.length;
		const itemType =
			this.props.contentType === CONTENT_TYPE.VIDEOS
				? "فيديو/سلسلة"
				: "كتاب";

		// Create a modern styled confirm dialog
		const confirmDialog = document.createElement("div");
		confirmDialog.className = "alrawi-modal-dialog alrawi-confirm-dialog";

		// Add header
		const header = confirmDialog.createEl("div", {
			cls: "alrawi-dialog-header",
		});
		header.createEl("h3", {
			text: "تأكيد الحذف",
			cls: "alrawi-dialog-title",
		});

		// Close button
		const closeBtn = header.createEl("button", {
			cls: "alrawi-dialog-close",
			text: "×",
		});
		closeBtn.addEventListener("click", () => {
			document.body.removeChild(confirmDialog);
		});

		// Content with warning
		const content = confirmDialog.createEl("div", {
			cls: "alrawi-dialog-content",
		});

		const warningIcon = content.createEl("div", {
			cls: "alrawi-warning-icon",
		});
		setIcon(warningIcon, "alert-triangle");

		content.createEl("p", {
			cls: "alrawi-confirm-message",
			text: `هل أنت متأكد من رغبتك في حذف ${count} ${itemType}؟ لا يمكن التراجع عن هذا الإجراء.`,
		});

		// Footer with buttons
		const footer = confirmDialog.createEl("div", {
			cls: "alrawi-dialog-footer",
		});

		const cancelButton = footer.createEl("button", {
			text: "إلغاء",
			cls: "alrawi-cancel-button",
		});

		// Delete button with warning styling
		const confirmButton = footer.createEl("button", {
			text: "حذف",
			cls: "alrawi-delete-button",
		});

		// Cancel action
		cancelButton.addEventListener("click", () => {
			document.body.removeChild(confirmDialog);
		});

		// Confirm action
		confirmButton.addEventListener("click", async () => {
			document.body.removeChild(confirmDialog);
			await this.performBulkDelete();
		});

		// Add dialog to document body
		document.body.appendChild(confirmDialog);
	}

	/**
	 * Performs bulk delete operation
	 */
	private async performBulkDelete(): Promise<void> {
		const selectedItems = this.props.selectionState.getSelectedItems();
		if (selectedItems.length === 0) return;

		const itemType =
			this.props.contentType === CONTENT_TYPE.VIDEOS
				? "فيديو/سلسلة"
				: "كتاب";

		// Show progress notification
		new Notice(`⏳ جاري حذف ${selectedItems.length} ${itemType}...`);

		// Create bulk operation
		const operation: BulkOperation = {
			type: "delete",
			itemPaths: selectedItems,
		};

		// Perform operation
		const result = await this.props.dataService.performBulkOperation(
			operation
		);

		// Show results
		if (result.success > 0) {
			new Notice(`✅ تم حذف ${result.success} ${itemType} بنجاح`);
		}

		if (result.failed > 0) {
			new Notice(`⚠️ فشل حذف ${result.failed} ${itemType}`);
		}

		// Clean up and refresh
		this.props.selectionState.clearSelection();
		this.props.onOperationComplete();
	}

	/**
	 * Clean up resources
	 */
	public destroy(): void {
		// Unsubscribe from state changes
		this.stateUnsubscribes.forEach((unsubscribe) => unsubscribe());
		this.stateUnsubscribes = [];

		// Clear references
		this.element = null;
	}
}
