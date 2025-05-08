// src/views/unifiedView/content/books/BookCard.ts
import { Menu, Notice, setIcon } from "obsidian";
import { BookItem } from "../../../../types";
import { ComponentProps } from "../../types";
import { SelectionState } from "../../state/SelectionState";
import { BookModal } from "../../../../modals/contentModals/bookModal";
import { FilterState } from "../../state/FilterState";
import { SharedUtils } from "../SharedUtils";

interface BookCardProps extends ComponentProps {
	books: BookItem[];
	selectionState: SelectionState;
	filterState: FilterState;
	onRefresh: () => Promise<void>;
}

/**
 * Renders books in card view
 */
export class BookCard {
	private props: BookCardProps;

	constructor(props: BookCardProps) {
		this.props = props;
	}

	/**
	 * Renders the books in card view
	 */
	public render(container: HTMLElement): void {
		// Add select all control for card view
		if (this.props.books.length > 0) {
			this.addSelectAllForCardView(container);
		}

		// Create card container
		const cardContainer = container.createEl("div", {
			cls: "alrawi-card-view",
		});

		if (this.props.books.length === 0) {
			cardContainer.createEl("div", {
				cls: "alrawi-card-empty",
				text: "لا توجد نتائج تطابق معايير البحث الخاصة بك",
			});
			return;
		}

		// Get books for current page
		const filterState = this.props.filterState.getVideoAndBookState();
		const startIndex = (filterState.page - 1) * filterState.itemsPerPage;
		const endIndex = Math.min(
			startIndex + filterState.itemsPerPage,
			this.props.books.length
		);

		// Render cards for visible books
		for (let i = startIndex; i < endIndex; i++) {
			const book = this.props.books[i];
			this.renderBookCard(cardContainer, book);
		}
	}

	/**
	 * Adds "select all" control for card view
	 */
	private addSelectAllForCardView(container: HTMLElement): HTMLElement {
		// Create a "Select All" control for card view
		const selectAllContainer = container.createEl("div", {
			cls: "alrawi-card-select-all",
		});

		const selectAllCheckbox = selectAllContainer.createEl("input", {
			type: "checkbox",
			cls: "alrawi-card-select-all-checkbox",
		});

		selectAllContainer.createEl("label", {
			text: "تحديد الكل",
			cls: "alrawi-card-select-all-label",
		});

		selectAllCheckbox.addEventListener("change", (e) => {
			const isChecked = (e.target as HTMLInputElement).checked;
			this.handleSelectAll(isChecked);
		});

		return selectAllContainer;
	}

	/**
	 * Renders a single book card
	 */
	private renderBookCard(container: HTMLElement, book: BookItem): void {
		const card = container.createEl("div", { cls: "alrawi-book-card" });

		// Checkbox for selection
		const checkbox = card.createEl("input", {
			type: "checkbox",
			cls: "alrawi-card-checkbox",
		});
		checkbox.checked = this.props.selectionState.isSelected(book.filePath);
		checkbox.addEventListener("change", (e) => {
			this.props.selectionState.toggleItem(
				book.filePath,
				(e.target as HTMLInputElement).checked
			);
		});

		// Cover section
		const coverContainer = card.createEl("div", {
			cls: "alrawi-book-cover-container",
		});

		if (book.coverUrl && this.props.settings.booksSettings.showCovers) {
			coverContainer.createEl("img", {
				attr: {
					src: book.coverUrl,
					alt: book.title,
				},
				cls: "alrawi-book-cover-img",
			});
		} else {
			// Placeholder for books without covers
			const placeholderDiv = coverContainer.createEl("div", {
				cls: "alrawi-book-no-cover",
			});
			setIcon(placeholderDiv, "book");
		}

		// Progress overlay
		const progressPercentage =
			book.pages > 0
				? Math.round((book.pagesRead / book.pages) * 100)
				: 0;

		coverContainer.createEl("div", {
			cls: "alrawi-book-progress-indicator",
		}).style.width = `${progressPercentage}%`;

		coverContainer.createEl("div", {
			cls: "alrawi-book-progress-text",
			text: `${progressPercentage}%`,
		});

		// Content section
		const contentSection = card.createEl("div", {
			cls: "alrawi-card-content",
		});

		// Title
		contentSection.createEl("div", {
			text: book.title,
			cls: "alrawi-card-title",
		});

		// Author info
		const authorInfo = contentSection.createEl("div", {
			cls: "alrawi-card-info",
		});
		setIcon(authorInfo, "user");
		authorInfo.createEl("span", { text: book.author });

		// Pages info
		const pagesInfo = contentSection.createEl("div", {
			cls: "alrawi-card-info",
		});
		setIcon(pagesInfo, "file-text");
		pagesInfo.createEl("span", {
			text: `${book.pagesRead} / ${book.pages} صفحة`,
		});

		// Rating
		if (book.rating && book.rating > 0) {
			const ratingInfo = contentSection.createEl("div", {
				cls: "alrawi-card-info",
			});
			setIcon(ratingInfo, "star");
			const ratingDisplay = ratingInfo.createEl("div", {
				cls: "alrawi-stars-display",
			});
			this.createRatingDisplay(ratingDisplay, book.rating);
		}

		// Categories if available
		if (book.categories && book.categories.length > 0) {
			const categoriesInfo = contentSection.createEl("div", {
				cls: "alrawi-card-info",
			});
			setIcon(categoriesInfo, "folder");
			categoriesInfo.createEl("span", {
				text: Array.isArray(book.categories)
					? book.categories.slice(0, 3).join(", ") +
					  (book.categories.length > 3 ? "..." : "")
					: book.categories,
			});
		}

		// Tags if available
		if (book.tags && book.tags.length > 0) {
			const tagsInfo = contentSection.createEl("div", {
				cls: "alrawi-card-info",
			});
			setIcon(tagsInfo, "tag");

			const tagsContainer = tagsInfo.createEl("div", {
				cls: "alrawi-tags-container",
			});

			// Only show a few tags to save space
			const displayCount = Math.min(2, book.tags.length);
			for (let i = 0; i < displayCount; i++) {
				const tag = book.tags[i];
				const tagElement = tagsContainer.createEl("span", {
					cls: "alrawi-card-tag",
				});
				SharedUtils.formatTagForDisplay(tag, tagElement);

				// Add separator except for last tag
				if (i < displayCount - 1) {
					tagsContainer.createEl("span", { text: ", " });
				}
			}

			// Show indication if there are more tags
			if (book.tags.length > displayCount) {
				tagsContainer.createEl("span", { text: "..." });
			}
		}

		// Footer with status and actions
		const footer = card.createEl("div", { cls: "alrawi-card-footer" });

		// Status dropdown
		const statusContainer = footer.createEl("div");
		SharedUtils.createStatusDropdown(
			statusContainer,
			book,
			this.props.settings.booksSettings.bookStatusOptions,
			this.props.dataService,
			this.props.onRefresh
		);

		// Action buttons
		const actionsContainer = footer.createEl("div", {
			cls: "alrawi-card-actions",
		});

		// Edit button
		const editButton = actionsContainer.createEl("a", {
			cls: "alrawi-card-action-btn",
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
		const noteLink = actionsContainer.createEl("a", {
			cls: "alrawi-card-action-btn",
			attr: {
				title: "فتح الملاحظة",
			},
		});
		setIcon(noteLink, "file-text");
		noteLink.addEventListener("click", (e) => {
			e.preventDefault();
			SharedUtils.openFile(this.props.app, book.filePath);
		});

		// More actions
		const moreActionsBtn = actionsContainer.createEl("a", {
			cls: "alrawi-card-action-btn",
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
	 * Creates a rating display for books
	 */
	private createRatingDisplay(container: HTMLElement, rating: number): void {
		// Create star display
		for (let i = 1; i <= 5; i++) {
			const star = container.createEl("span", {
				cls: i <= rating ? "alrawi-star filled" : "alrawi-star",
				text: "★",
			});
		}
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
			.querySelectorAll(".alrawi-book-card .alrawi-card-checkbox")
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
			".alrawi-card-select-all-checkbox"
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
			.querySelectorAll(".alrawi-book-card .alrawi-card-checkbox")
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
