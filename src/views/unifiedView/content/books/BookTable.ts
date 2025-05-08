// src/views/unifiedView/content/books/BookTable.ts
import { Menu, Notice, setIcon } from "obsidian";
import { BookItem } from "../../../../types";
import { ComponentProps } from "../../types";
import { SelectionState } from "../../state/SelectionState";
import { ColumnConfigModal } from "../../../../modals/settingsModals/columnConfigModal";
import { BookModal } from "../../../../modals/contentModals/bookModal";
import { moment } from "obsidian";
import { FilterState } from "../../state/FilterState";
import { SharedUtils } from "../SharedUtils";

interface BookTableProps extends ComponentProps {
	books: BookItem[];
	selectionState: SelectionState;
	filterState: FilterState;
	onRefresh: () => Promise<void>;
}

/**
 * Renders books in table view
 */
export class BookTable {
	private props: BookTableProps;

	constructor(props: BookTableProps) {
		this.props = props;
	}

	/**
	 * Renders the books table
	 */
	public render(container: HTMLElement): void {
		const tableContainer = container.createEl("div", {
			cls: "alrawi-table-container",
		});

		// Add config button
		this.renderTableConfig(tableContainer);

		// Create table
		const table = tableContainer.createEl("table", {
			cls: "alrawi-books-table",
		});

		// Table header
		this.renderTableHeader(table);

		// Table body
		this.renderTableBody(table);
	}

	/**
	 * Renders the table configuration button
	 */
	private renderTableConfig(container: HTMLElement): void {
		const configContainer = container.createEl("div", {
			cls: "alrawi-table-config-container",
		});
		const configButton = configContainer.createEl("button", {
			cls: "alrawi-table-config-button",
			text: "تخصيص الأعمدة",
		});
		setIcon(configButton, "settings");
		configButton.addEventListener("click", () => {
			this.showColumnConfigModal();
		});
	}

	/**
	 * Shows the column configuration modal
	 */
	private showColumnConfigModal(): void {
		const modal = new ColumnConfigModal(
			this.props.app,
			this.props.settings,
			"books",
			async () => {
				// Save settings and refresh view
				await this.props.plugin.saveSettings();
				this.props.onRefresh();
			}
		);

		// Set up auto-refresh when modal is closed
		const originalOnClose = modal.onClose;
		modal.onClose = async () => {
			originalOnClose.call(modal);
			await this.props.onRefresh();
		};

		modal.open();
	}

	/**
	 * Renders the table header
	 */
	private renderTableHeader(table: HTMLElement): void {
		const thead = table.createEl("thead");
		const headerRow = thead.createEl("tr");

		// Get column config sorted by order
		const columns = this.props.settings.tableColumns.books
			.filter((col: { enabled: boolean }) => col.enabled)
			.sort(
				(a: { order: number }, b: { order: number }) =>
					a.order - b.order
			);

		// Create headers based on column config
		columns.forEach(
			(column: {
				id: string;
				label: string;
				enabled: boolean;
				order: number;
				sortKey?: string;
			}) => {
				if (column.id === "checkbox") {
					// Add bulk select checkbox in header
					const selectAllCell = headerRow.createEl("th", {
						cls: "alrawi-checkbox-cell",
					});
					const selectAllCheckbox = selectAllCell.createEl("input", {
						type: "checkbox",
						cls: "alrawi-select-all",
					});
					selectAllCheckbox.addEventListener("change", (e) => {
						const isChecked = (e.target as HTMLInputElement)
							.checked;
						this.handleSelectAll(isChecked);
					});
				} else if (column.id === "actions") {
					headerRow.createEl("th", { text: column.label });
				} else if (column.sortKey) {
					// Create sortable header for columns with sortKey
					this.createSortableHeader(
						headerRow,
						column.label,
						column.sortKey
					);
				} else {
					// Regular header
					headerRow.createEl("th", { text: column.label });
				}
			}
		);
	}

	/**
	 * Creates a sortable table header
	 */
	private createSortableHeader(
		headerRow: HTMLElement,
		text: string,
		sortKey: string
	): HTMLElement {
		const filterState = this.props.filterState.getVideoAndBookState();
		const th = headerRow.createEl("th", { text });
		th.addClass("alrawi-sortable-header");

		if (filterState.sortBy === sortKey) {
			th.addClass(`sorted-${filterState.sortOrder}`);
		}

		th.addEventListener("click", () => {
			if (filterState.sortBy === sortKey) {
				this.props.filterState.updateVideoAndBookState({
					sortOrder: filterState.sortOrder === "asc" ? "desc" : "asc",
				});
			} else {
				this.props.filterState.updateVideoAndBookState({
					sortBy: sortKey,
					sortOrder: "asc",
				});
			}
			this.props.onRefresh();
		});

		return th;
	}

	/**
	 * Renders the table body
	 */
	private renderTableBody(table: HTMLElement): void {
		const tbody = table.createEl("tbody");

		if (this.props.books.length === 0) {
			// Calculate colspan based on visible columns
			const visibleColumnsCount =
				this.props.settings.tableColumns.books.filter(
					(col: { enabled: boolean }) => col.enabled
				).length;

			this.renderNoResults(tbody, visibleColumnsCount);
		} else {
			this.renderBookTableRows(tbody);
		}
	}

	/**
	 * Renders "No Results" message
	 */
	private renderNoResults(container: HTMLElement, colSpan: number): void {
		const row = container.createEl("tr");
		const cell = row.createEl("td", {
			attr: { colspan: colSpan.toString() },
			cls: "alrawi-no-results",
		});
		cell.textContent = "لا توجد نتائج تطابق معايير البحث الخاصة بك";
	}

	/**
	 * Renders book table rows
	 */
	private renderBookTableRows(tbody: HTMLElement): void {
		const filterState = this.props.filterState.getVideoAndBookState();
		const startIndex = (filterState.page - 1) * filterState.itemsPerPage;
		const endIndex = Math.min(
			startIndex + filterState.itemsPerPage,
			this.props.books.length
		);

		// Get column config sorted by order
		const columns = this.props.settings.tableColumns.books
			.filter((col: { enabled: boolean }) => col.enabled)
			.sort(
				(a: { order: number }, b: { order: number }) =>
					a.order - b.order
			);

		for (let i = startIndex; i < endIndex; i++) {
			const book = this.props.books[i];
			const row = tbody.createEl("tr");
			row.dataset.bookPath = book.filePath; // Store reference to book path for updates

			// Render cells based on column config
			columns.forEach(
				(column: {
					id: string;
					label: string;
					enabled: boolean;
					order: number;
					sortKey?: string;
				}) => {
					switch (column.id) {
						case "checkbox":
							// Add checkbox cell
							const checkboxCell = row.createEl("td", {
								cls: "alrawi-checkbox-cell",
							});
							const checkbox = checkboxCell.createEl("input", {
								type: "checkbox",
								cls: "alrawi-item-checkbox",
							});
							checkbox.checked =
								this.props.selectionState.isSelected(
									book.filePath
								);
							checkbox.addEventListener("change", (e) => {
								this.props.selectionState.toggleItem(
									book.filePath,
									(e.target as HTMLInputElement).checked
								);
							});
							break;

						case "title":
							// Title with cover thumbnail
							const titleCell = row.createEl("td", {
								cls: "alrawi-title-cell",
							});

							if (
								this.props.settings.booksSettings.showCovers &&
								book.coverUrl
							) {
								const coverContainer = titleCell.createEl(
									"div",
									{ cls: "alrawi-mini-cover" }
								);
								coverContainer.createEl("img", {
									attr: {
										src: book.coverUrl,
										alt: book.title,
									},
								});
							}

							titleCell.createEl("span", { text: book.title });
							break;

						case "author":
							row.createEl("td").textContent = book.author;
							break;

						case "status":
							// Status dropdown
							const statusCell = row.createEl("td");
							SharedUtils.createStatusDropdown(
								statusCell,
								book,
								this.props.settings.booksSettings
									.bookStatusOptions,
								this.props.dataService,
								this.props.onRefresh
							);
							break;

						case "pages":
							row.createEl("td").textContent =
								book.pages.toString();
							break;

						case "pagesRead":
							// Pages read with progress
							const progressCell = row.createEl("td", {
								cls: "alrawi-progress-cell",
							});
							this.createProgressCell(progressCell, book);
							break;

						case "rating":
							// Rating
							const ratingCell = row.createEl("td", {
								cls: "alrawi-rating-cell",
							});
							this.createRatingDisplay(
								ratingCell,
								book.rating || 0
							);
							break;

						case "dateAdded":
							row.createEl("td").textContent = book.dateAdded
								? moment(book.dateAdded).format("YYYY-MM-DD")
								: "غير معروف";
							break;

						case "isbn":
							row.createEl("td").textContent = book.isbn || "-";
							break;

						case "publisher":
							row.createEl("td").textContent =
								book.publisher || "-";
							break;

						case "publishYear":
							row.createEl("td").textContent = book.publishYear
								? book.publishYear.toString()
								: "-";
							break;

						case "startDate":
							row.createEl("td").textContent =
								book.startDate || "-";
							break;

						case "completionDate":
							row.createEl("td").textContent =
								book.completionDate || "-";
							break;

						case "language":
							row.createEl("td").textContent =
								book.language || "العربية";
							break;

						case "categories":
							// Categories cell with chips/tags display
							const categoriesCell = row.createEl("td", {
								cls: "alrawi-tags-cell",
							});
							if (book.categories && book.categories.length > 0) {
								const categoriesContainer =
									categoriesCell.createEl("div", {
										cls: "alrawi-table-tags-container",
									});

								// Display up to 3 categories to save space
								const displayCount = Math.min(
									3,
									book.categories.length
								);
								book.categories
									.slice(0, displayCount)
									.forEach((category, index) => {
										const chip =
											categoriesContainer.createEl(
												"span",
												{
													cls: "alrawi-table-tag-chip",
													text: category,
												}
											);

										// Add separator except for last category
										if (index < displayCount - 1) {
											categoriesContainer.createEl(
												"span",
												{ text: ", " }
											);
										}
									});

								// Show indication if there are more categories
								if (book.categories.length > displayCount) {
									categoriesContainer.createEl("span", {
										text: ` +${
											book.categories.length -
											displayCount
										}`,
										cls: "alrawi-table-tag-more",
									});
								}
							} else {
								categoriesCell.textContent = "-";
							}
							break;

						case "tags":
							// Tags cell with chips/tags display
							const tagsCell = row.createEl("td", {
								cls: "alrawi-tags-cell",
							});
							if (book.tags && book.tags.length > 0) {
								const tagsContainer = tagsCell.createEl("div", {
									cls: "alrawi-table-tags-container",
								});

								// Display up to 3 tags to save space
								const displayCount = Math.min(
									3,
									book.tags.length
								);
								book.tags
									.slice(0, displayCount)
									.forEach((tag, index) => {
										const tagElement =
											tagsContainer.createEl("span", {
												cls: "alrawi-table-tag-chip",
											});
										SharedUtils.formatTagForDisplay(
											tag,
											tagElement
										);

										// Add separator except for last tag
										if (index < displayCount - 1) {
											tagsContainer.createEl("span", {
												text: ", ",
											});
										}
									});

								// Show indication if there are more tags
								if (book.tags.length > displayCount) {
									tagsContainer.createEl("span", {
										text: ` +${
											book.tags.length - displayCount
										}`,
										cls: "alrawi-table-tag-more",
									});
								}
							} else {
								tagsCell.textContent = "-";
							}
							break;

						case "actions":
							// Actions
							const actionsCell = row.createEl("td", {
								cls: "alrawi-actions-cell",
							});
							this.renderBookActions(actionsCell, book);
							break;
					}
				}
			);
		}
	}

	/**
	 * Creates a progress cell for books
	 */
	private createProgressCell(container: HTMLElement, book: BookItem): void {
		const progressPercentage =
			book.pages > 0
				? Math.round((book.pagesRead / book.pages) * 100)
				: 0;

		// Create a unique ID for this input to avoid conflicts
		const uniqueId = `progress-${book.filePath.replace(
			/[^a-zA-Z0-9]/g,
			"-"
		)}`;
		container.dataset.bookPath = book.filePath;
		container.dataset.bookPages = book.pages.toString();

		// Create input for pages read
		const input = container.createEl("input", {
			type: "number",
			cls: "alrawi-pages-read-input",
			value: book.pagesRead.toString(),
			attr: {
				min: "0",
				max: book.pages.toString(),
				id: uniqueId,
			},
		});

		// Add text showing progress
		const progressText = container.createEl("span", {
			cls: "alrawi-progress-text",
			text: ` / ${book.pages} (${progressPercentage}%)`,
		});

		// Add progress bar
		const progressBar = container.createEl("div", {
			cls: "alrawi-table-progress-bar",
		});
		const progressFill = progressBar.createEl("div", {
			cls: "alrawi-table-progress-fill",
		});
		progressFill.style.width = `${progressPercentage}%`;

		// Handle input change
		input.addEventListener("change", async () => {
			const newValue = parseInt(input.value);
			if (isNaN(newValue) || newValue < 0 || newValue > book.pages) {
				input.value = book.pagesRead.toString();
				return;
			}

			// Update the book progress
			const success = await this.props.dataService.updateBookProgress(
				book.filePath,
				newValue
			);
			if (success) {
				// Update the local book object
				book.pagesRead = newValue;

				// Update the progress UI directly
				const newPercentage = Math.round((newValue / book.pages) * 100);
				progressFill.style.width = `${newPercentage}%`;
				progressText.textContent = ` / ${book.pages} (${newPercentage}%)`;

				// Check if book status needs to be updated (now complete)
				if (newValue >= book.pages && book.status !== "تمت القراءة") {
					await this.props.dataService.updateStatus(
						book.filePath,
						"تمت القراءة"
					);
					book.status = "تمت القراءة";

					if (!book.completionDate) {
						const today = new Date().toISOString().split("T")[0];
						await this.props.dataService.updateBookCompletionDate(
							book.filePath,
							today
						);
						book.completionDate = today;
					}

					// Update just the status cell without a full re-render
					this.updateBookStatusCell(book);
				}
				// If book was complete but now it's not
				else if (
					newValue < book.pages &&
					book.status === "تمت القراءة"
				) {
					await this.props.dataService.updateStatus(
						book.filePath,
						"قيد القراءة"
					);
					book.status = "قيد القراءة";

					if (!book.startDate) {
						const today = new Date().toISOString().split("T")[0];
						await this.props.dataService.updateBookStartDate(
							book.filePath,
							today
						);
						book.startDate = today;
					}

					// Update just the status cell without a full re-render
					this.updateBookStatusCell(book);
				}
			} else {
				// Reset to original value on failure
				input.value = book.pagesRead.toString();
				new Notice("❌ فشل تحديث تقدم القراءة");
			}
		});
	}

	/**
	 * Updates only the status cell for a book
	 */
	private updateBookStatusCell(book: BookItem): void {
		// Find the row for this book
		const row = document.querySelector(
			`tr[data-book-path="${book.filePath}"]`
		);
		if (!row) return;

		// Find the status cell
		const statusCell = row.querySelector("td:has(.alrawi-status-select)");
		if (!statusCell) return;

		// Update the status dropdown
		const select = statusCell.querySelector(
			".alrawi-status-select"
		) as HTMLSelectElement;
		if (!select) return;

		// Update the select value
		select.value = book.status || "";

		// Update the status class
		const oldClass = Array.from(select.classList).find((cls) =>
			cls.startsWith("status-")
		);
		if (oldClass) {
			select.classList.remove(oldClass);
		}

		const statusClass = `status-${(book.status || "")
			.toLowerCase()
			.replace(/\s+/g, "-")}`;
		select.classList.add(statusClass);
	}

	/**
	 * Creates a rating display for books
	 */
	private createRatingDisplay(container: HTMLElement, rating: number): void {
		// Create star display
		const starsContainer = container.createEl("div", {
			cls: "alrawi-stars",
		});
		for (let i = 1; i <= 5; i++) {
			const star = starsContainer.createEl("span", {
				cls: i <= rating ? "alrawi-star filled" : "alrawi-star",
				text: "★",
			});
		}
	}

	/**
	 * Renders book action buttons
	 */
	private renderBookActions(container: HTMLElement, book: BookItem): void {
		// Edit button
		const editButton = container.createEl("a", {
			cls: "alrawi-action-icon-link",
			attr: {
				title: "تعديل الكتاب",
			},
		});
		setIcon(editButton, "edit-2");
		editButton.addEventListener("click", (e) => {
			e.preventDefault();
			this.editBook(book.filePath);
		});

		// Note link
		const noteLink = container.createEl("a", {
			cls: "alrawi-action-icon-link",
			attr: {
				title: "فتح الملاحظة",
			},
		});
		setIcon(noteLink, "file-text");
		noteLink.addEventListener("click", (e) => {
			e.preventDefault();
			SharedUtils.openFile(this.props.app, book.filePath);
		});

		// More actions menu
		const moreActionsBtn = container.createEl("a", {
			cls: "alrawi-action-icon-link",
			attr: {
				title: "المزيد من الإجراءات",
			},
		});
		setIcon(moreActionsBtn, "more-vertical");
		moreActionsBtn.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.showBookActionsMenu(book, moreActionsBtn);
		});
	}

	/**
	 * Shows book actions menu
	 */
	private showBookActionsMenu(book: BookItem, element: HTMLElement): void {
		const menu = new Menu();

		// Update progress
		menu.addItem((i) => {
			i.setTitle("تحديث تقدم القراءة")
				.setIcon("activity")
				.onClick(() => {
					this.showUpdateProgressDialog(book);
				});
		});

		// Edit book
		menu.addItem((i) => {
			i.setTitle("تحرير الكتاب")
				.setIcon("edit-2")
				.onClick(() => {
					this.editBook(book.filePath);
				});
		});

		// Open note
		menu.addItem((i) => {
			i.setTitle("فتح الملاحظة")
				.setIcon("file-text")
				.onClick(() => {
					SharedUtils.openFile(this.props.app, book.filePath);
				});
		});

		// Change status submenu
		menu.addItem((i) => {
			i.setTitle("تغيير الحالة")
				.setIcon("check-circle")
				.onClick(() => {
					const statusMenu = new Menu();

					this.props.settings.booksSettings.bookStatusOptions.forEach(
						(status: string) => {
							statusMenu.addItem((si) => {
								si.setTitle(status)
									.setChecked(book.status === status)
									.onClick(async () => {
										await this.props.dataService.updateStatus(
											book.filePath,
											status
										);

										book.status = status;

										// Update other fields based on status
										if (
											status === "قيد القراءة" &&
											!book.startDate
										) {
											const today = new Date()
												.toISOString()
												.split("T")[0];
											await this.props.dataService.updateBookStartDate(
												book.filePath,
												today
											);
										}

										if (status === "تمت القراءة") {
											if (!book.completionDate) {
												const today = new Date()
													.toISOString()
													.split("T")[0];
												await this.props.dataService.updateBookCompletionDate(
													book.filePath,
													today
												);
											}

											if (book.pagesRead < book.pages) {
												await this.props.dataService.updateBookProgress(
													book.filePath,
													book.pages
												);
											}
										}

										this.props.onRefresh();
									});
							});
						}
					);

					const rect = element.getBoundingClientRect();
					statusMenu.showAtPosition({ x: rect.left, y: rect.bottom });
				});
		});

		// Edit tags
		menu.addItem((i) => {
			i.setTitle("تعديل الوسوم")
				.setIcon("tag")
				.onClick(() => {
					SharedUtils.showEditTagsDialog(
						book,
						this.props.dataService,
						"books",
						this.props.onRefresh
					);
				});
		});

		// Edit categories
		menu.addItem((i) => {
			i.setTitle("تعديل التصنيفات")
				.setIcon("folder")
				.onClick(() => {
					SharedUtils.showEditCategoriesDialog(
						book,
						this.props.dataService,
						"books",
						this.props.onRefresh
					);
				});
		});

		// Delete
		menu.addItem((i) => {
			i.setTitle("حذف")
				.setIcon("trash-2")
				.onClick(() => {
					SharedUtils.confirmItemDelete(book, async () => {
						await SharedUtils.performItemDelete(
							this.props.dataService,
							book,
							this.props.onRefresh
						);
					});
				});
		});

		const rect = element.getBoundingClientRect();
		menu.showAtPosition({ x: rect.left, y: rect.bottom });
	}

	/**
	 * Shows update progress dialog for books
	 */
	private showUpdateProgressDialog(book: BookItem): void {
		const dialog = document.createElement("div");
		dialog.className = "alrawi-modal-dialog alrawi-update-progress-dialog";

		// Dialog header
		const header = dialog.createEl("div", { cls: "alrawi-dialog-header" });
		header.createEl("h3", {
			text: `تحديث تقدم قراءة: ${book.title}`,
			cls: "alrawi-dialog-title",
		});

		// Create content area
		const content = dialog.createEl("div", {
			cls: "alrawi-dialog-content",
		});

		// Current progress display
		content.createEl("div", {
			cls: "alrawi-current-progress",
			text: `التقدم الحالي: ${book.pagesRead} من ${
				book.pages
			} صفحة (${Math.round((book.pagesRead / book.pages) * 100)}%)`,
		});

		// Input for pages read
		const inputContainer = content.createEl("div", {
			cls: "alrawi-progress-input-container",
		});
		const label = inputContainer.createEl("label", {
			text: "الصفحات المقروءة:",
			cls: "alrawi-progress-label",
		});

		const input = inputContainer.createEl("input", {
			type: "number",
			value: book.pagesRead.toString(),
			cls: "alrawi-progress-input",
			attr: {
				min: "0",
				max: book.pages.toString(),
			},
		});

		// Progress slider
		const sliderContainer = content.createEl("div", {
			cls: "alrawi-progress-slider-container",
		});
		const progressSlider = sliderContainer.createEl("input", {
			type: "range",
			value: book.pagesRead.toString(),
			cls: "alrawi-progress-slider",
			attr: {
				min: "0",
				max: book.pages.toString(),
			},
		});

		// Display percentage
		const percentageDisplay = content.createEl("div", {
			cls: "alrawi-percentage-display",
			text: `${Math.round((book.pagesRead / book.pages) * 100)}%`,
		});

		// Sync input and slider
		input.addEventListener("input", () => {
			const value = parseInt(input.value) || 0;
			if (value >= 0 && value <= book.pages) {
				progressSlider.value = value.toString();
				percentageDisplay.textContent = `${Math.round(
					(value / book.pages) * 100
				)}%`;
			}
		});

		progressSlider.addEventListener("input", () => {
			input.value = progressSlider.value;
			const value = parseInt(progressSlider.value);
			percentageDisplay.textContent = `${Math.round(
				(value / book.pages) * 100
			)}%`;
		});

		// Status checkbox for completed
		const completeContainer = content.createEl("div", {
			cls: "alrawi-complete-container",
		});
		const completeCheckbox = completeContainer.createEl("input", {
			type: "checkbox",
			attr: { id: "mark-as-complete" },
			cls: "alrawi-complete-checkbox",
		});
		completeCheckbox.checked = book.pagesRead >= book.pages;

		const completeLabel = completeContainer.createEl("label", {
			attr: { for: "mark-as-complete" },
			text: "تعيين كمقروء بالكامل",
			cls: "alrawi-complete-label",
		});

		completeCheckbox.addEventListener("change", () => {
			if (completeCheckbox.checked) {
				input.value = book.pages.toString();
				progressSlider.value = book.pages.toString();
				percentageDisplay.textContent = "100%";
			}
		});

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
			const newProgress = parseInt(input.value);
			if (
				isNaN(newProgress) ||
				newProgress < 0 ||
				newProgress > book.pages
			) {
				new Notice("⚠️ الرجاء إدخال قيمة صحيحة");
				return;
			}

			const success = await this.props.dataService.updateBookProgress(
				book.filePath,
				newProgress
			);
			if (success) {
				new Notice("✅ تم تحديث تقدم القراءة");
				document.body.removeChild(dialog);
				book.pagesRead = newProgress;

				// Update status based on progress
				if (
					newProgress >= book.pages &&
					book.status !== "تمت القراءة"
				) {
					await this.props.dataService.updateStatus(
						book.filePath,
						"تمت القراءة"
					);
					book.status = "تمت القراءة";

					if (!book.completionDate) {
						const today = new Date().toISOString().split("T")[0];
						await this.props.dataService.updateBookCompletionDate(
							book.filePath,
							today
						);
					}
				} else if (
					newProgress > 0 &&
					newProgress < book.pages &&
					book.status !== "قيد القراءة"
				) {
					await this.props.dataService.updateStatus(
						book.filePath,
						"قيد القراءة"
					);
					book.status = "قيد القراءة";

					if (!book.startDate) {
						const today = new Date().toISOString().split("T")[0];
						await this.props.dataService.updateBookStartDate(
							book.filePath,
							today
						);
					}
				}

				// Update the UI without a full refresh
				const cell = document.querySelector(
					`td[data-book-path="${book.filePath}"]`
				);
				if (cell) {
					const progressBar = cell.querySelector(
						".alrawi-table-progress-bar .alrawi-table-progress-fill"
					);
					if (progressBar) {
						const newPercentage = Math.round(
							(newProgress / book.pages) * 100
						);
						progressBar.setAttribute(
							"style",
							`width: ${newPercentage}%`
						);

						const progressText = cell.querySelector(
							".alrawi-progress-text"
						);
						if (progressText) {
							progressText.textContent = ` / ${book.pages} (${newPercentage}%)`;
						}

						const progressInput = cell.querySelector(
							".alrawi-pages-read-input"
						) as HTMLInputElement;
						if (progressInput) {
							progressInput.value = newProgress.toString();
						}
					}
				}

				// Refresh to update status and other fields if needed
				this.props.onRefresh();
			} else {
				new Notice("❌ فشل تحديث تقدم القراءة");
			}
		});

		// Add dialog to the document
		document.body.appendChild(dialog);

		// Focus the input
		input.focus();
		input.select();
	}

	/**
	 * Edit a book
	 */
	private editBook(filePath: string): void {
		const modal = new BookModal(
			this.props.app,
			this.props.settings,
			filePath
		);

		// Set up auto-refresh when modal is closed
		const originalOnClose = modal.onClose;
		modal.onClose = async () => {
			originalOnClose.call(modal);
			await this.props.onRefresh();
		};

		modal.open();
	}

	/**
	 * Updates the selection UI without full re-render
	 */
	public updateSelectionUI(): void {
		// Update checkboxes to reflect current selection state
		const filterState = this.props.filterState.getVideoAndBookState();
		const startIndex = (filterState.page - 1) * filterState.itemsPerPage;
		const endIndex = Math.min(
			startIndex + filterState.itemsPerPage,
			this.props.books.length
		);
		const visibleBooks = this.props.books.slice(startIndex, endIndex);

		document
			.querySelectorAll(
				"table.alrawi-books-table tbody .alrawi-item-checkbox"
			)
			.forEach((checkbox: HTMLInputElement, idx) => {
				if (idx < visibleBooks.length) {
					const book = visibleBooks[idx];
					checkbox.checked = this.props.selectionState.isSelected(
						book.filePath
					);
				}
			});

		// Update select all checkbox
		const selectAllCheckbox = document.querySelector(
			"table.alrawi-books-table thead .alrawi-select-all"
		) as HTMLInputElement;
		if (selectAllCheckbox && visibleBooks.length > 0) {
			const allSelected = visibleBooks.every((book) =>
				this.props.selectionState.isSelected(book.filePath)
			);
			selectAllCheckbox.checked = allSelected;
		}
	}

	/**
	 * Handles "select all" action
	 */
	private handleSelectAll(isSelected: boolean): void {
		const filterState = this.props.filterState.getVideoAndBookState();
		const startIndex = (filterState.page - 1) * filterState.itemsPerPage;
		const endIndex = Math.min(
			startIndex + filterState.itemsPerPage,
			this.props.books.length
		);

		const visibleBooks = this.props.books.slice(startIndex, endIndex);
		const visibleFilePaths = visibleBooks.map((book) => book.filePath);

		if (isSelected) {
			this.props.selectionState.selectAll(visibleFilePaths);
		} else {
			this.props.selectionState.deselectAll(visibleFilePaths);
		}

		// Update checkboxes to reflect selection state
		document
			.querySelectorAll(
				"table.alrawi-books-table tbody .alrawi-item-checkbox"
			)
			.forEach((checkbox: HTMLInputElement, idx) => {
				if (idx < visibleBooks.length) {
					checkbox.checked = isSelected;
				}
			});
	}

	/**
	 * Clean up resources
	 */
	public destroy(): void {
		// Clean up any references or event listeners here
	}
}
