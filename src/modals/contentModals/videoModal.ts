// src/modals/contentModals/videoModal.ts
import {
	App,
	TextComponent,
	DropdownComponent,
	Notice,
	ButtonComponent,
} from "obsidian";
import { BaseModal } from "../baseModal";
import { AlRawiSettings } from "../../core/settings";
import { YouTubeService } from "../../services/youtubeService";
import { DataService } from "../../services/dataService";
import {
	extractVideoId,
	extractPlaylistId,
	determineYoutubeUrlType,
} from "../../utils";

/**
 * Modal for adding a new video or playlist
 */
export class VideoModal extends BaseModal {
	private urlInput: TextComponent;
	private typeInput: DropdownComponent;
	private presenterInput: TextComponent;
	private titleInput: TextComponent;
	private descriptionInput: TextComponent;
	private tagsInput: TextComponent;
	private statusInput: DropdownComponent;
	private youtubeService: YouTubeService;
	private dataService: DataService;
	private thumbnailPreview: HTMLElement;
	private previewContainer: HTMLElement;
	private videoPreviewContainer: HTMLElement;
	private playlistThumbnailUrl?: string = "";
	private categoriesInput: TextComponent;

	/**
	 * Creates a new VideoModal
	 * @param app Obsidian app instance
	 * @param settings Plugin settings
	 */
	constructor(app: App, settings: AlRawiSettings) {
		super(app, settings);
		this.youtubeService = new YouTubeService(this.settings.youtubeApiKey);
		this.dataService = new DataService(app, settings);
	}

	/**
	 * Gets the submit button text
	 */
	protected getSubmitButtonText(): string {
		return "إضافة";
	}

	/**
	 * Renders the modal content
	 */
	protected renderModalContent(): void {
		const { contentEl } = this;

		contentEl.createEl("h2", { text: "إضافة فيديو جديد" });

		const form = contentEl.createEl("div", { cls: "alrawi-form" });

		this.renderUrlSection(form);
		this.renderPreviewContainer(form);
		this.renderContentFields(form);

		// Button container
		const buttonContainer = form.createEl("div", { cls: "alrawi-buttons" });
		this.renderActionButtons(buttonContainer);
	}

	/**
	 * Renders the URL input section with preview button
	 * @param form Form container
	 */
	private renderUrlSection(form: HTMLElement): void {
		this.createFormField(form, "رابط اليوتيوب", () => {
			const container = form.createEl("div", {
				cls: "alrawi-url-container",
			});

			this.urlInput = new TextComponent(container);
			this.urlInput.setPlaceholder(
				"https://www.youtube.com/watch?v=... أو قائمة"
			);
			this.urlInput.inputEl.addClass("alrawi-input");

			// Add preview button
			const previewButton = new ButtonComponent(container)
				.setButtonText("معاينة")
				.setClass("alrawi-preview-button")
				.onClick(async () => {
					await this.previewVideo();
				});

			return container;
		});
	}

	/**
	 * Creates the preview containers
	 * @param form Form container
	 */
	private renderPreviewContainer(form: HTMLElement): void {
		// Preview container (initially hidden)
		this.previewContainer = form.createEl("div", {
			cls: "alrawi-preview-container",
		});
		this.previewContainer.style.display = "none";

		this.thumbnailPreview = this.previewContainer.createEl("div", {
			cls: "alrawi-thumbnail-container",
		});

		// Video preview container (for embedding iframe)
		this.videoPreviewContainer = this.previewContainer.createEl("div", {
			cls: "alrawi-video-embed-container",
		});
		this.videoPreviewContainer.style.display = "none";
	}

	/**
	 * Renders content-related form fields
	 * @param form Form container
	 */
	private renderContentFields(form: HTMLElement): void {
		// Content type selection
		this.createFormField(form, "نوع المحتوى", () => {
			const container = form.createEl("div");
			this.typeInput = new DropdownComponent(container);
			this.typeInput.addOption("مقطع", "مقطع");
			this.typeInput.addOption("سلسلة", "سلسلة");
			this.typeInput.setValue("مقطع");
			return container;
		});

		// Presenter input with autocomplete
		this.createFormField(form, "اسم الملقي", () => {
			const container = form.createEl("div");
			this.presenterInput = new TextComponent(container);
			this.presenterInput.setPlaceholder("اسم الملقي أو المحاضر");
			this.presenterInput.inputEl.addClass("alrawi-input");

			const datalist = container.createEl("datalist");
			datalist.id = "presenter-suggestions";
			this.presenterInput.inputEl.setAttr(
				"list",
				"presenter-suggestions"
			);

			this.dataService.getPresenterList().then((presenters) => {
				presenters.forEach((presenter) => {
					const option = datalist.createEl("option");
					option.value = presenter;
				});
			});

			return container;
		});

		// Title input
		this.createFormField(form, "عنوان الفيديو", () => {
			this.titleInput = new TextComponent(form);
			this.titleInput.setPlaceholder("سيتم ملؤه تلقائياً");
			this.titleInput.inputEl.addClass("alrawi-input");
			return this.titleInput.inputEl;
		});

		// Description input
		this.createFormField(form, "وصف الفيديو", () => {
			this.descriptionInput = new TextComponent(form);
			this.descriptionInput.setPlaceholder("وصف مختصر (اختياري)");
			this.descriptionInput.inputEl.addClass("alrawi-input");
			return this.descriptionInput.inputEl;
		});

		// Categories field
		this.renderCategoriesSection(form);

		// Tags input with suggestions
		this.createFormField(form, "وسوم", () => {
			const container = form.createEl("div");
			this.tagsInput = new TextComponent(container);
			this.tagsInput.setPlaceholder("وسوم مفصولة بفواصل (اختياري)");
			this.tagsInput.inputEl.addClass("alrawi-input");

			// Add tag suggestions
			this.dataService.getTags("videos").then((tags) => {
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

		// Status dropdown (if enabled in settings)
		this.createFormField(form, "حالة المشاهدة", () => {
			const container = form.createEl("div");
			this.statusInput = new DropdownComponent(container);
			this.settings.progressTracking.statusOptions.forEach((option) => {
				this.statusInput.addOption(option, option);
			});
			this.statusInput.setValue(
				this.settings.progressTracking.defaultStatus
			);
			return container;
		});
	}

	// Dedicated method for categories section
	private renderCategoriesSection(form: HTMLElement): void {
		// Categories input
		this.createFormField(form, "التصنيفات", () => {
			const container = form.createEl("div");
			this.categoriesInput = new TextComponent(container);
			this.categoriesInput.setPlaceholder(
				"تصنيفات مفصولة بفواصل (اختياري)"
			);
			this.categoriesInput.inputEl.addClass("alrawi-input");

			// Add category suggestions
			this.dataService.getVideoCategories().then((categories) => {
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
	}

	/**
	 * Previews the video or playlist from URL
	 */
	private async previewVideo(): Promise<void> {
		const url = this.urlInput.getValue().trim();
		if (!url) {
			this.showWarning("الرجاء إدخال رابط اليوتيوب");
			return;
		}

		this.isLoading = true;
		this.loadingMessage = "جاري جلب معلومات الفيديو...";
		this.updateLoadingUI();

		try {
			// Determine URL type using the new helper
			const urlType = determineYoutubeUrlType(url);

			if (urlType === "video") {
				// Treat as a video
				const videoId = extractVideoId(url);
				if (!videoId) {
					this.showError("لم نتمكن من استخراج معرف الفيديو");
					return;
				}

				const response = await this.youtubeService.getVideoDetails(
					videoId
				);
				if (!response.success) {
					this.showError(
						response.error || "فشل في جلب معلومات الفيديو"
					);
					return;
				}

				if (!response.data) {
					this.showError("فشل في جلب معلومات الفيديو");
					return;
				}
				const { title, thumbnailUrl } = response.data;

				// Update title input if empty
				if (!this.titleInput.getValue()) {
					this.titleInput.setValue(title);
				}

				// Show thumbnail
				this.thumbnailPreview.empty();
				const img = this.thumbnailPreview.createEl("img", {
					cls: "alrawi-thumbnail",
					attr: { src: thumbnailUrl, alt: title },
				});
				// Add size constraints
				img.style.maxWidth = "100%";
				img.style.maxHeight = "200px";
				img.style.objectFit = "contain";

				this.previewContainer.style.display = "block";

				// Add click to play behavior
				img.addEventListener("click", () => {
					this.showVideoEmbed(videoId);
				});

				// Add play button overlay
				const playButton = this.thumbnailPreview.createEl("div", {
					cls: "alrawi-play-button",
				});
				playButton.createEl("div", { cls: "alrawi-play-icon" });
			} else if (urlType === "playlist") {
				// Pure playlist URL
				const playlistId = extractPlaylistId(url);
				if (playlistId) {
					await this.previewPlaylist(playlistId);
				} else {
					this.showError("لم نتمكن من استخراج معرف السلسلة");
				}
			} else {
				this.showError("رابط اليوتيوب غير صالح");
			}
		} catch (error) {
			console.error("Error previewing video:", error);
			this.showError("حدث خطأ أثناء معاينة الفيديو");
		} finally {
			this.isLoading = false;
			this.updateLoadingUI();
		}
	}

	/**
	 * Previews a playlist
	 * @param playlistId YouTube playlist ID
	 */
	private async previewPlaylist(playlistId: string): Promise<void> {
		try {
			const response = await this.youtubeService.getPlaylistDetails(
				playlistId
			);
			if (!response.success) {
				this.showError(response.error || "فشل في جلب معلومات السلسلة");
				return;
			}

			if (!response.data) {
				this.showError("فشل في جلب معلومات الفيديو");
				return;
			}

			const { title, itemCount, thumbnailUrl } = response.data;

			// Update form
			if (!this.titleInput.getValue()) {
				this.titleInput.setValue(title);
			}

			// Store the thumbnail URL for later use
			this.playlistThumbnailUrl = thumbnailUrl; // Add this property to the class

			// Set type to playlist
			const playlistType = "سلسلة";
			this.typeInput.setValue(playlistType);

			// Show playlist info
			this.thumbnailPreview.empty();
			const playlistInfo = this.thumbnailPreview.createEl("div", {
				cls: "alrawi-playlist-info",
			});
			playlistInfo.createEl("h3", { text: title });
			playlistInfo.createEl("p", { text: `عدد المقاطع: ${itemCount}` });

			// Show thumbnail if available
			if (thumbnailUrl) {
				const img = this.thumbnailPreview.createEl("img", {
					cls: "alrawi-thumbnail",
					attr: {
						src: thumbnailUrl,
						alt: "Playlist thumbnail",
					},
				});
			}

			this.previewContainer.style.display = "block";
		} catch (error) {
			console.error("Error previewing playlist:", error);
			this.showError("حدث خطأ أثناء معاينة السلسلة");
		} finally {
			this.isLoading = false;
			this.updateLoadingUI();
		}
	}

	/**
	 * Shows video embed instead of thumbnail
	 * @param videoId YouTube video ID
	 */
	private showVideoEmbed(videoId: string): void {
		// Hide thumbnail and show video container
		this.thumbnailPreview.style.display = "none";
		this.videoPreviewContainer.style.display = "block";
		this.videoPreviewContainer.empty();

		// Create iframe with proper attributes for YouTube embedding
		const iframe = this.videoPreviewContainer.createEl("iframe", {
			attr: {
				src: `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`,
				frameborder: "0",
				allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
				allowfullscreen: "true",
				width: "100%",
				height: "100%",
			},
		});
		iframe.addClass("alrawi-video-iframe");

		// Add close button
		const closeBtn = this.videoPreviewContainer.createEl("button", {
			text: "×",
			cls: "alrawi-video-close-btn",
		});
		closeBtn.addEventListener("click", () => {
			this.videoPreviewContainer.style.display = "none";
			this.thumbnailPreview.style.display = "block";
			this.videoPreviewContainer.empty();
		});
	}

	/**
	 * Handles form submission
	 */
	protected async onSubmit(): Promise<void> {
		if (this.isLoading) return;

		const url = this.urlInput.getValue().trim();
		if (!url) {
			this.showWarning("الرجاء إدخال رابط اليوتيوب");
			return;
		}

		this.isLoading = true;
		this.loadingMessage = "جاري معالجة الطلب...";
		this.updateLoadingUI();

		try {
			// IMPORTANT: If URL contains watch?v=, always treat as video
			if (url.includes("watch?v=")) {
				this.loadingMessage = "جاري جلب تفاصيل الفيديو...";
				this.updateLoadingUI();
				await this.handleSingleVideo(url);
			}
			// Only treat as playlist if it's a pure playlist URL
			else if (url.includes("playlist?list=")) {
				this.loadingMessage = "جاري جلب تفاصيل السلسلة...";
				this.updateLoadingUI();
				await this.handlePlaylist(url);
			} else {
				this.showError("رابط اليوتيوب غير صالح");
				this.isLoading = false;
				this.updateLoadingUI();
				return;
			}
			this.close();
		} catch (error) {
			console.error("Error adding video:", error);
			this.showError("حدث خطأ أثناء إضافة الفيديو");
		} finally {
			this.isLoading = false;
			this.updateLoadingUI();
		}
	}

	/**
	 * Handles adding a single video
	 * @param url YouTube video URL
	 */
	private async handleSingleVideo(url: string): Promise<void> {
		const videoId = extractVideoId(url);
		if (!videoId) {
			this.showError("رابط اليوتيوب غير صالح");
			return;
		}

		try {
			// Fetch video details from YouTube
			this.loadingMessage = "جاري جلب تفاصيل الفيديو من يوتيوب...";
			this.updateLoadingUI();

			const response = await this.youtubeService.getVideoDetails(videoId);
			if (!response.success) {
				this.showError(response.error || "فشل في جلب معلومات الفيديو");
				return;
			}

			if (!response.data) {
				this.showError("فشل في جلب معلومات الفيديو");
				return;
			}
			const { title, duration, thumbnailUrl } = response.data;

			// Get form values
			const presenter =
				this.presenterInput.getValue().trim() ||
				this.settings.defaultPresenter;
			const type = this.typeInput.getValue();
			const description = this.descriptionInput.getValue().trim();
			const tagInput = this.tagsInput.getValue().trim();
			const tags = tagInput
				? tagInput.split(",").map((t) => t.trim())
				: [];
			const status =
				this.statusInput?.getValue() ||
				this.settings.progressTracking.defaultStatus;

			// Get categories
			const categoriesInput = this.categoriesInput.getValue().trim();
			const categories = categoriesInput
				? categoriesInput
						.split(",")
						.map((c) => c.trim())
						.filter((c) => c)
				: [];

			// Create the note
			this.loadingMessage = "جاري إنشاء الملاحظة...";
			this.updateLoadingUI();

			const success = await this.dataService.createVideo({
				url,
				videoId,
				title: this.titleInput.getValue().trim() || title,
				duration,
				presenter,
				type,
				description,
				tags,
				categories,
				thumbnailUrl,
				status,
			});

			if (success) {
				this.showSuccess("تمت إضافة الفيديو بنجاح");
			} else {
				this.showError("حدث خطأ أثناء إنشاء الملاحظة");
			}
		} catch (error) {
			console.error("Error creating video note:", error);
			this.showError("حدث خطأ أثناء إضافة الفيديو");
			throw error;
		}
	}

	/**
	 * Handles adding a playlist
	 * @param url YouTube playlist URL
	 */
	private async handlePlaylist(url: string): Promise<void> {
		const playlistId = extractPlaylistId(url);
		if (!playlistId) {
			this.showError("رابط السلسلة غير صالح");
			return;
		}

		try {
			new Notice("⏳ جاري جلب تفاصيل السلسلة...");

			const response = await this.youtubeService.getPlaylistDetails(
				playlistId
			);
			if (!response.success) {
				this.showError(response.error || "فشل في جلب معلومات السلسلة");
				return;
			}

			if (!response.data) {
				this.showError("فشل في جلب معلومات الفيديو");
				return;
			}
			const { title, itemCount, duration, thumbnailUrl } = response.data;

			// Get form values
			const presenter =
				this.presenterInput.getValue().trim() ||
				this.settings.defaultPresenter;
			const type = this.typeInput.getValue(); // Use selected type directly

			// Process tags
			const tagInput = this.tagsInput.getValue().trim();
			const tags = tagInput
				? tagInput
						.split(",")
						.map((t) => t.trim())
						.filter((t) => t)
				: [];

			const status =
				this.statusInput?.getValue() ||
				this.settings.progressTracking.defaultStatus;

			// Get categories
			const categoriesInput = this.categoriesInput.getValue().trim();
			const categories = categoriesInput
				? categoriesInput
						.split(",")
						.map((c) => c.trim())
						.filter((c) => c)
				: [];

			// Create the note
			const success = await this.dataService.createPlaylist({
				url,
				playlistId,
				title: this.titleInput.getValue().trim() || title,
				presenter,
				type,
				itemCount,
				duration,
				status,
				categories,
				thumbnailUrl: thumbnailUrl || this.playlistThumbnailUrl, // Use fetched or stored thumbnail
				tags,
			});

			if (success) {
				this.showSuccess(`تمت إضافة السلسلة "${title}" بنجاح`);
			} else {
				this.showError("حدث خطأ أثناء إنشاء ملاحظة السلسلة");
			}
		} catch (error) {
			console.error("Error adding playlist:", error);
			this.showError("حدث خطأ أثناء إضافة السلسلة");
			throw error;
		}
	}
}

// Alias for backward compatibility
export const AlRawiModal = VideoModal;
