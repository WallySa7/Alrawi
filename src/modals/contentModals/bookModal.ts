// src/modals/contentModals/bookModal.ts
import {
	App,
	TextComponent,
	DropdownComponent,
	SliderComponent,
	Setting,
	ButtonComponent,
} from "obsidian";
import { BaseModal } from "../baseModal";
import { AlRawiSettings } from "../../core/settings";
import { DataService } from "../../services/dataService";
import { formatDate } from "../../utils/dateUtils";

/**
 * Modal for adding or editing a book
 */
export class BookModal extends BaseModal {
	private titleInput: TextComponent;
	private authorInput: TextComponent;
	private pagesInput: TextComponent;
	private pagesReadInput: TextComponent;
	private isbnInput: TextComponent;
	private publisherInput: TextComponent;
	private publishYearInput: TextComponent;
	private startDateInput: TextComponent;
	private completionDateInput: TextComponent;
	private languageInput: DropdownComponent;
	private statusInput: DropdownComponent;
	private categoriesInput: TextComponent;
	private tagsInput: TextComponent;
	private ratingInput: SliderComponent;
	private coverUrlInput: TextComponent;
	private notesInput: TextComponent;
	private coverPreview: HTMLElement;
	private dataService: DataService;
	private editMode = false;
	private bookPath: string | null = null;

	/**
	 * Creates a new BookModal
	 * @param app Obsidian app instance
	 * @param settings Plugin settings
	 * @param bookPath Path to existing book (for edit mode) or null (for new book)
	 */
	constructor(
		app: App,
		settings: AlRawiSettings,
		bookPath: string | null = null
	) {
		super(app, settings);
		this.dataService = new DataService(app, settings);
		this.bookPath = bookPath;
		this.editMode = !!bookPath;
	}

	/**
	 * Gets the submit button text based on mode
	 */
	protected getSubmitButtonText(): string {
		return this.editMode ? "حفظ التغييرات" : "إضافة كتاب";
	}

	/**
	 * Renders the modal content
	 */
	protected renderModalContent(): void {
		const { contentEl } = this;

		contentEl.createEl("h2", {
			text: this.editMode ? "تعديل كتاب" : "إضافة كتاب جديد",
		});

		const form = contentEl.createEl("div", { cls: "alrawi-form" });

		// Render form sections
		this.renderBasicInfoSection(form);
		this.renderPublishingInfoSection(form);
		this.renderReadingInfoSection(form);
		this.renderCategoriesSection(form);
		this.renderCoverSection(form);
		this.renderNotesSection(form);

		// Button container
		const buttonContainer = form.createEl("div", { cls: "alrawi-buttons" });
		this.renderActionButtons(buttonContainer);

		// Load book data if in edit mode
		if (this.editMode && this.bookPath) {
			this.loadBookData(this.bookPath);
		}
	}

	/**
	 * Renders basic book information fields
	 * @param form Form container
	 */
	private renderBasicInfoSection(form: HTMLElement): void {
		// Title input
		this.createFormField(form, "عنوان الكتاب", () => {
			this.titleInput = new TextComponent(form);
			this.titleInput.setPlaceholder("أدخل عنوان الكتاب");
			this.titleInput.inputEl.addClass("alrawi-input");
			return this.titleInput.inputEl;
		});

		// Author input with autocomplete
		this.createFormField(form, "المؤلف", () => {
			const container = form.createEl("div");
			this.authorInput = new TextComponent(container);
			this.authorInput.setPlaceholder("اسم المؤلف");
			this.authorInput.setValue(
				this.settings.booksSettings.defaultAuthor
			);
			this.authorInput.inputEl.addClass("alrawi-input");

			const datalist = container.createEl("datalist");
			datalist.id = "author-suggestions";
			this.authorInput.inputEl.setAttr("list", "author-suggestions");

			this.dataService.getBookAuthors().then((authors) => {
				authors.forEach((author) => {
					const option = datalist.createEl("option");
					option.value = author;
				});
			});

			return container;
		});

		// Pages input
		this.createFormField(form, "عدد الصفحات", () => {
			this.pagesInput = new TextComponent(form);
			this.pagesInput.setPlaceholder("عدد الصفحات الإجمالي");
			this.pagesInput.inputEl.type = "number";
			this.pagesInput.inputEl.min = "1";
			this.pagesInput.inputEl.addClass("alrawi-input");
			return this.pagesInput.inputEl;
		});

		// Pages read input
		this.createFormField(form, "الصفحات المقروءة", () => {
			this.pagesReadInput = new TextComponent(form);
			this.pagesReadInput.setPlaceholder("عدد الصفحات التي تمت قراءتها");
			this.pagesReadInput.inputEl.type = "number";
			this.pagesReadInput.inputEl.min = "0";
			this.pagesReadInput.setValue("0");
			this.pagesReadInput.inputEl.addClass("alrawi-input");
			return this.pagesReadInput.inputEl;
		});
	}

	/**
	 * Renders publishing information fields
	 * @param form Form container
	 */
	private renderPublishingInfoSection(form: HTMLElement): void {
		// ISBN input
		this.createFormField(form, "الرقم المعياري (ISBN)", () => {
			this.isbnInput = new TextComponent(form);
			this.isbnInput.setPlaceholder("اختياري");
			this.isbnInput.inputEl.addClass("alrawi-input");
			return this.isbnInput.inputEl;
		});

		// Publisher input
		this.createFormField(form, "دار النشر", () => {
			this.publisherInput = new TextComponent(form);
			this.publisherInput.setPlaceholder("اختياري");
			this.publisherInput.inputEl.addClass("alrawi-input");
			return this.publisherInput.inputEl;
		});

		// Publish year input
		this.createFormField(form, "سنة النشر", () => {
			this.publishYearInput = new TextComponent(form);
			this.publishYearInput.setPlaceholder("اختياري");
			this.publishYearInput.inputEl.type = "number";
			this.publishYearInput.inputEl.min = "1";
			this.publishYearInput.inputEl.max = new Date()
				.getFullYear()
				.toString();
			this.publishYearInput.inputEl.addClass("alrawi-input");
			return this.publishYearInput.inputEl;
		});

		// Language dropdown
		this.createFormField(form, "لغة الكتاب", () => {
			const container = form.createEl("div");
			this.languageInput = new DropdownComponent(container);
			this.languageInput.addOption("العربية", "العربية");
			this.languageInput.addOption("الإنجليزية", "الإنجليزية");
			this.languageInput.addOption("الفرنسية", "الفرنسية");
			this.languageInput.addOption("الألمانية", "الألمانية");
			this.languageInput.addOption("أخرى", "أخرى");
			this.languageInput.setValue("العربية");
			return container;
		});
	}

	/**
	 * Renders reading information fields
	 * @param form Form container
	 */
	private renderReadingInfoSection(form: HTMLElement): void {
		// Start date input
		this.createFormField(form, "تاريخ بدء القراءة", () => {
			this.startDateInput = new TextComponent(form);
			this.startDateInput.setPlaceholder("اختياري");
			this.startDateInput.inputEl.type = "date";
			this.startDateInput.inputEl.addClass("alrawi-input");
			return this.startDateInput.inputEl;
		});

		// Completion date input
		this.createFormField(form, "تاريخ الانتهاء", () => {
			this.completionDateInput = new TextComponent(form);
			this.completionDateInput.setPlaceholder("اختياري");
			this.completionDateInput.inputEl.type = "date";
			this.completionDateInput.inputEl.addClass("alrawi-input");
			return this.completionDateInput.inputEl;
		});

		// Status dropdown
		this.createFormField(form, "حالة القراءة", () => {
			const container = form.createEl("div");
			this.statusInput = new DropdownComponent(container);
			this.settings.booksSettings.bookStatusOptions.forEach((option) => {
				this.statusInput.addOption(option, option);
			});
			this.statusInput.setValue(
				this.settings.booksSettings.defaultStatus
			);
			return container;
		});

		// Rating slider
		this.createFormField(form, "التقييم", () => {
			const container = form.createEl("div", {
				cls: "alrawi-rating-container",
			});
			this.ratingInput = new SliderComponent(container);
			this.ratingInput.setLimits(0, 5, 1);
			this.ratingInput.setValue(0);
			this.ratingInput.setDynamicTooltip();

			const ratingDisplay = container.createEl("div", {
				cls: "alrawi-rating-display",
				text: "0/5",
			});

			this.ratingInput.onChange((value) => {
				ratingDisplay.textContent = `${value}/5`;
			});

			return container;
		});
	}

	/**
	 * Renders categories and tags fields
	 * @param form Form container
	 */
	private renderCategoriesSection(form: HTMLElement): void {
		// Categories input
		this.createFormField(form, "تصنيفات الكتاب", () => {
			const container = form.createEl("div");
			this.categoriesInput = new TextComponent(container);
			this.categoriesInput.setPlaceholder(
				"تصنيفات مفصولة بفواصل (اختياري)"
			);
			this.categoriesInput.inputEl.addClass("alrawi-input");

			// Add category suggestions
			this.dataService.getBookCategories().then((categories) => {
				if (categories.length === 0) return;

				const categorySuggestions = container.createEl("div", {
					cls: "alrawi-tag-suggestions",
				});
				categories.slice(0, 10).forEach((category) => {
					const categoryChip = categorySuggestions.createEl("span", {
						text: category,
						cls: "alrawi-tag-chip",
					});
					categoryChip.addEventListener("click", () => {
						const currentCategories = this.categoriesInput
							.getValue()
							.split(",")
							.map((t) => t.trim())
							.filter((t) => t);
						if (!currentCategories.includes(category)) {
							const newCategoriesValue =
								currentCategories.length > 0
									? `${this.categoriesInput.getValue()}, ${category}`
									: category;
							this.categoriesInput.setValue(newCategoriesValue);
						}
					});
				});
			});

			return container;
		});

		// Tags input
		this.createFormField(form, "وسوم", () => {
			const container = form.createEl("div");
			this.tagsInput = new TextComponent(container);
			this.tagsInput.setPlaceholder("وسوم مفصولة بفواصل (اختياري)");
			this.tagsInput.inputEl.addClass("alrawi-input");

			// Add tag suggestions
			this.dataService.getTags("books").then((tags) => {
				if (tags.length === 0) return;

				const tagSuggestions = container.createEl("div", {
					cls: "alrawi-tag-suggestions",
				});
				tags.slice(0, 10).forEach((tag) => {
					const tagChip = tagSuggestions.createEl("span", {
						text: tag,
						cls: "alrawi-tag-chip",
					});
					tagChip.addEventListener("click", () => {
						const currentTags = this.tagsInput
							.getValue()
							.split(",")
							.map((t) => t.trim())
							.filter((t) => t);
						if (!currentTags.includes(tag)) {
							const newTagsValue =
								currentTags.length > 0
									? `${this.tagsInput.getValue()}, ${tag}`
									: tag;
							this.tagsInput.setValue(newTagsValue);
						}
					});
				});
			});

			return container;
		});
	}

	/**
	 * Renders cover URL input and preview
	 * @param form Form container
	 */
	private renderCoverSection(form: HTMLElement): void {
		// Cover URL input with preview button
		this.createFormField(form, "رابط صورة الغلاف", () => {
			const container = form.createEl("div", {
				cls: "alrawi-url-container",
			});

			this.coverUrlInput = new TextComponent(container);
			this.coverUrlInput.setPlaceholder("رابط صورة الغلاف (اختياري)");
			this.coverUrlInput.inputEl.addClass("alrawi-input");

			// Add preview button
			const previewButton = new ButtonComponent(container)
				.setButtonText("معاينة")
				.setClass("alrawi-preview-button")
				.onClick(() => {
					this.previewCover();
				});

			return container;
		});

		// Cover preview container
		this.coverPreview = form.createEl("div", {
			cls: "alrawi-cover-preview",
		});
		this.coverPreview.style.display = "none";
	}

	/**
	 * Renders notes input field
	 * @param form Form container
	 */
	private renderNotesSection(form: HTMLElement): void {
		this.createFormField(form, "ملاحظات", () => {
			const container = form.createEl("div");
			const textarea = container.createEl("textarea", {
				cls: "alrawi-input alrawi-textarea",
				attr: {
					placeholder: "ملاحظات حول الكتاب (اختياري)",
				},
			});
			textarea.style.width = "100%";
			textarea.style.height = "100px";
			textarea.style.resize = "vertical";

			// Create a custom TextComponent-like object
			this.notesInput = {
				inputEl: textarea,
				getValue: () => textarea.value,
				setValue: (value: string) => {
					textarea.value = value;
					return this.notesInput;
				},
			} as unknown as TextComponent;

			return container;
		});
	}

	/**
	 * Loads book data for editing
	 * @param filePath Path to the book file
	 */
	private async loadBookData(filePath: string): Promise<void> {
		this.isLoading = true;
		this.loadingMessage = "جاري تحميل بيانات الكتاب...";
		this.updateLoadingUI();

		try {
			const bookData = await this.dataService.getBookData(filePath);

			if (bookData) {
				this.titleInput.setValue(bookData.title || "");
				this.authorInput.setValue(
					bookData.author || this.settings.booksSettings.defaultAuthor
				);
				this.pagesInput.setValue(bookData.pages?.toString() || "");
				this.pagesReadInput.setValue(
					bookData.pagesRead?.toString() || "0"
				);
				this.isbnInput.setValue(bookData.isbn || "");
				this.publisherInput.setValue(bookData.publisher || "");
				this.publishYearInput.setValue(
					bookData.publishYear?.toString() || ""
				);
				this.startDateInput.setValue(bookData.startDate || "");
				this.completionDateInput.setValue(
					bookData.completionDate || ""
				);
				this.languageInput.setValue(bookData.language || "العربية");
				this.statusInput.setValue(
					bookData.status || this.settings.booksSettings.defaultStatus
				);
				this.categoriesInput.setValue(
					Array.isArray(bookData.categories)
						? bookData.categories.join(", ")
						: bookData.categories || ""
				);
				this.tagsInput.setValue(
					Array.isArray(bookData.tags)
						? bookData.tags.join(", ")
						: bookData.tags || ""
				);
				this.ratingInput.setValue(bookData.rating || 0);
				this.coverUrlInput.setValue(bookData.coverUrl || "");
				this.notesInput.setValue(bookData.notes || "");

				// Preview cover if available
				if (bookData.coverUrl) {
					this.previewCover();
				}
			}
		} catch (error) {
			console.error("Error loading book data:", error);
			this.showError("حدث خطأ أثناء تحميل بيانات الكتاب");
		} finally {
			this.isLoading = false;
			this.updateLoadingUI();
		}
	}

	/**
	 * Previews the book cover from the URL
	 */
	private previewCover(): void {
		const url = this.coverUrlInput.getValue().trim();
		if (!url) {
			this.coverPreview.style.display = "none";
			return;
		}

		this.coverPreview.empty();
		this.coverPreview.style.display = "block";

		const img = this.coverPreview.createEl("img", {
			cls: "alrawi-book-cover",
			attr: {
				src: url,
				alt: "صورة غلاف الكتاب",
			},
		});

		// Handle image loading errors
		img.onerror = () => {
			this.coverPreview.empty();
			this.coverPreview.createEl("div", {
				cls: "alrawi-cover-error",
				text: "تعذر تحميل صورة الغلاف",
			});
		};
	}

	/**
	 * Handles form submission
	 */
	protected async onSubmit(): Promise<void> {
		if (this.isLoading) return;

		// Validate required fields
		const title = this.titleInput.getValue().trim();
		if (!title) {
			this.showWarning("الرجاء إدخال عنوان الكتاب");
			return;
		}

		const author =
			this.authorInput.getValue().trim() ||
			this.settings.booksSettings.defaultAuthor;

		const pagesStr = this.pagesInput.getValue().trim();
		if (!pagesStr) {
			this.showWarning("الرجاء إدخال عدد صفحات الكتاب");
			return;
		}

		const pages = parseInt(pagesStr);
		if (isNaN(pages) || pages <= 0) {
			this.showWarning("عدد الصفحات يجب أن يكون رقماً موجباً");
			return;
		}

		const pagesReadStr = this.pagesReadInput.getValue().trim();
		const pagesRead = parseInt(pagesReadStr || "0");
		if (isNaN(pagesRead) || pagesRead < 0) {
			this.showWarning("عدد الصفحات المقروءة يجب أن يكون رقماً غير سالب");
			return;
		}

		if (pagesRead > pages) {
			this.showWarning(
				"عدد الصفحات المقروءة لا يمكن أن يتجاوز إجمالي عدد الصفحات"
			);
			return;
		}

		// Set loading state
		this.isLoading = true;
		this.loadingMessage = this.editMode
			? "جاري تحديث بيانات الكتاب..."
			: "جاري إضافة الكتاب...";
		this.updateLoadingUI();

		try {
			// Process input data
			const tagInput = this.tagsInput.getValue().trim();
			const tags = tagInput
				? tagInput
						.split(",")
						.map((t) => t.trim())
						.filter((t) => t)
				: [];

			const categoriesInput = this.categoriesInput.getValue().trim();
			const categories = categoriesInput
				? categoriesInput
						.split(",")
						.map((c) => c.trim())
						.filter((c) => c)
				: [];

			// Get publishYear as number or undefined
			let publishYear: number | undefined = undefined;
			const publishYearStr = this.publishYearInput.getValue().trim();
			if (publishYearStr) {
				const yearNum = parseInt(publishYearStr);
				if (!isNaN(yearNum) && yearNum > 0) {
					publishYear = yearNum;
				}
			}

			// Prepare book data
			const bookData = {
				title,
				author,
				isbn: this.isbnInput.getValue().trim(),
				pages,
				pagesRead,
				publisher: this.publisherInput.getValue().trim(),
				publishYear,
				startDate: this.startDateInput.getValue().trim(),
				completionDate: this.completionDateInput.getValue().trim(),
				language: this.languageInput.getValue(),
				status: this.statusInput.getValue(),
				rating: this.ratingInput.getValue(),
				categories,
				tags,
				type: "كتاب", // Book type
				coverUrl: this.coverUrlInput.getValue().trim(),
				notes: this.notesInput.getValue().trim(),
			};

			let success = false;

			if (this.editMode && this.bookPath) {
				// Update existing book
				success = await this.dataService.updateBook(
					this.bookPath,
					bookData
				);
				if (success) {
					this.showSuccess("تم تحديث بيانات الكتاب بنجاح");
				}
			} else {
				// Create new book
				success = await this.dataService.createBook(bookData);
				if (success) {
					this.showSuccess("تمت إضافة الكتاب بنجاح");
				}
			}

			if (!success) {
				this.showError("حدث خطأ أثناء حفظ بيانات الكتاب");
			} else {
				this.close();
			}
		} catch (error) {
			console.error("Error saving book:", error);
			this.showError("حدث خطأ أثناء معالجة بيانات الكتاب");
		} finally {
			this.isLoading = false;
			this.updateLoadingUI();
		}
	}
}
