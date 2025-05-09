// src/views/unifiedView/content/videos/VideoCard.ts
import { Menu, Notice, setIcon } from "obsidian";
import { VideoItem, PlaylistItem } from "../../../../types";
import { ComponentProps } from "../../types";
import { SelectionState } from "../../state/SelectionState";
import { moment } from "obsidian";
import { FilterState } from "../../state/FilterState";
import { SharedUtils } from "../SharedUtils";

interface VideoCardProps extends ComponentProps {
	items: (VideoItem | PlaylistItem)[];
	selectionState: SelectionState;
	filterState: FilterState;
	onRefresh: () => Promise<void>;
}

/**
 * Renders videos in card view
 */
export class VideoCard {
	private props: VideoCardProps;

	constructor(props: VideoCardProps) {
		this.props = props;
	}

	/**
	 * Renders the videos in card view
	 */
	public render(container: HTMLElement): void {
		// Add select all control for card view
		if (this.props.items.length > 0) {
			this.addSelectAllForCardView(container);
		}

		// Create card container
		const cardContainer = container.createEl("div", {
			cls: "alrawi-card-view",
		});

		if (this.props.items.length === 0) {
			cardContainer.createEl("div", {
				cls: "alrawi-card-empty",
				text: "لا توجد نتائج تطابق معايير البحث الخاصة بك",
			});
			return;
		}

		// Get items for current page
		const filterState = this.props.filterState.getVideoAndBookState();
		const startIndex = (filterState.page - 1) * filterState.itemsPerPage;
		const endIndex = Math.min(
			startIndex + filterState.itemsPerPage,
			this.props.items.length
		);

		// Render cards for visible items
		for (let i = startIndex; i < endIndex; i++) {
			const item = this.props.items[i];
			this.renderVideoCard(cardContainer, item);
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
	 * Renders a single video card
	 */
	private renderVideoCard(
		container: HTMLElement,
		item: VideoItem | PlaylistItem
	): void {
		const card = container.createEl("div", { cls: "alrawi-card" });

		// Checkbox for selection
		const checkbox = card.createEl("input", {
			type: "checkbox",
			cls: "alrawi-card-checkbox",
		});
		checkbox.checked = this.props.selectionState.isSelected(item.filePath);
		checkbox.addEventListener("change", (e) => {
			this.props.selectionState.toggleItem(
				item.filePath,
				(e.target as HTMLInputElement).checked
			);
		});

		// Thumbnail section
		const thumbnailContainer = card.createEl("div", {
			cls: "alrawi-card-thumbnail",
		});

		if (
			"thumbnailUrl" in item &&
			item.thumbnailUrl &&
			this.props.settings.showThumbnailsInStats
		) {
			thumbnailContainer.createEl("img", {
				attr: {
					src: item.thumbnailUrl,
					alt: item.title,
				},
			});
		} else {
			// Placeholder for videos without thumbnails
			const placeholderDiv = thumbnailContainer.createEl("div", {
				cls: "alrawi-card-no-thumbnail",
			});
			setIcon(placeholderDiv, item.type === "مقطع" ? "play" : "list");
		}

		// Type badge
		thumbnailContainer.createEl("div", {
			cls: "alrawi-card-type",
			text: item.type,
		});

		// Duration badge
		thumbnailContainer.createEl("div", {
			cls: "alrawi-card-duration",
			text: "duration" in item ? item.duration : "",
		});

		// Content section
		const contentSection = card.createEl("div", {
			cls: "alrawi-card-content",
		});

		// Title
		contentSection.createEl("div", {
			text: item.title,
			cls: "alrawi-card-title",
		});

		// Presenter info
		const presenterInfo = contentSection.createEl("div", {
			cls: "alrawi-card-info",
		});
		setIcon(presenterInfo, "user");
		presenterInfo.createEl("span", {
			text: "presenter" in item ? item.presenter : "",
		});

		// Date info
		const dateInfo = contentSection.createEl("div", {
			cls: "alrawi-card-info",
		});
		setIcon(dateInfo, "calendar");
		dateInfo.createEl("span", {
			text: item.dateAdded
				? moment(item.dateAdded).format("YYYY-MM-DD")
				: "غير معروف",
		});

		// Categories if available
		if (item.categories && item.categories.length > 0) {
			const categoriesInfo = contentSection.createEl("div", {
				cls: "alrawi-card-info",
			});
			setIcon(categoriesInfo, "folder");

			const categoriesContainer = categoriesInfo.createEl("div", {
				cls: "alrawi-tags-container",
			});

			// Only show a few categories to save space
			const displayCount = Math.min(3, item.categories.length);
			for (let i = 0; i < displayCount; i++) {
				const category = item.categories[i];
				const categoryElement = categoriesContainer.createEl("span", {
					cls: "alrawi-card-tag",
				});

				// Use the hierarchical category formatter
				SharedUtils.formatCategoryForDisplay(category, categoryElement);

				// Add separator except for last category
				if (i < displayCount - 1) {
					categoriesContainer.createEl("span", { text: ", " });
				}
			}

			// Show indication if there are more categories
			if (item.categories.length > displayCount) {
				categoriesContainer.createEl("span", { text: "..." });
			}
		}

		// Tags if available
		if (item.tags && item.tags.length > 0) {
			const tagsInfo = contentSection.createEl("div", {
				cls: "alrawi-card-info",
			});
			setIcon(tagsInfo, "tag");

			const tagsContainer = tagsInfo.createEl("div", {
				cls: "alrawi-tags-container",
			});

			// Only show a few tags to save space
			const displayCount = Math.min(3, item.tags.length);
			for (let i = 0; i < displayCount; i++) {
				const tag = item.tags[i];
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
			if (item.tags.length > displayCount) {
				tagsContainer.createEl("span", { text: "..." });
			}
		}

		// Footer with status and actions
		const footer = card.createEl("div", { cls: "alrawi-card-footer" });

		// Status dropdown
		const statusContainer = footer.createEl("div");
		SharedUtils.createStatusDropdown(
			statusContainer,
			item,
			this.props.settings.progressTracking.statusOptions,
			this.props.dataService,
			this.props.onRefresh
		);

		// Action buttons
		const actionsContainer = footer.createEl("div", {
			cls: "alrawi-card-actions",
		});

		// YouTube link
		const youtubeLink = actionsContainer.createEl("a", {
			href: "url" in item ? item.url : "#",
			cls: "alrawi-card-action-btn",
			attr: {
				title: "مشاهدة على اليوتيوب",
				target: "_blank",
			},
		});
		setIcon(youtubeLink, "youtube");

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
			SharedUtils.openFile(this.props.app, item.filePath);
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
			this.showVideoActionsMenu(item, moreActionsBtn);
		});
	}

	/**
	 * Shows video actions menu
	 */
	private showVideoActionsMenu(
		item: VideoItem | PlaylistItem,
		element: HTMLElement
	): void {
		const menu = new Menu();

		// View on YouTube
		menu.addItem((i) => {
			i.setTitle("مشاهدة على اليوتيوب")
				.setIcon("youtube")
				.onClick(() => {
					window.open(item.url, "_blank");
				});
		});

		// Open note
		menu.addItem((i) => {
			i.setTitle("فتح الملاحظة")
				.setIcon("file-text")
				.onClick(() => {
					SharedUtils.openFile(this.props.app, item.filePath);
				});
		});

		// Change status submenu
		menu.addItem((i) => {
			i.setTitle("تغيير الحالة")
				.setIcon("check-circle")
				.onClick(() => {
					const statusMenu = new Menu();

					this.props.settings.progressTracking.statusOptions.forEach(
						(status: string) => {
							statusMenu.addItem((si) => {
								si.setTitle(status)
									.setChecked(item.status === status)
									.onClick(async () => {
										await this.props.dataService.updateStatus(
											item.filePath,
											status
										);
										item.status = status;
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
						item,
						this.props.dataService,
						"videos",
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
						item,
						this.props.dataService,
						"videos",
						this.props.onRefresh
					);
				});
		});

		// Delete
		menu.addItem((i) => {
			i.setTitle("حذف")
				.setIcon("trash-2")
				.onClick(() => {
					SharedUtils.confirmItemDelete(item, async () => {
						await SharedUtils.performItemDelete(
							this.props.dataService,
							item,
							this.props.onRefresh
						);
					});
				});
		});

		const rect = element.getBoundingClientRect();
		menu.showAtPosition({ x: rect.left, y: rect.bottom });
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
			this.props.items.length
		);
		const visibleItems = this.props.items.slice(startIndex, endIndex);

		document
			.querySelectorAll(".alrawi-card .alrawi-card-checkbox")
			.forEach((checkbox: HTMLInputElement, idx) => {
				if (idx < visibleItems.length) {
					const item = visibleItems[idx];
					checkbox.checked = this.props.selectionState.isSelected(
						item.filePath
					);
				}
			});

		// Update select all checkbox
		const selectAllCheckbox = document.querySelector(
			".alrawi-card-select-all-checkbox"
		) as HTMLInputElement;
		if (selectAllCheckbox && visibleItems.length > 0) {
			const allSelected = visibleItems.every((item) =>
				this.props.selectionState.isSelected(item.filePath)
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
			this.props.items.length
		);

		const visibleItems = this.props.items.slice(startIndex, endIndex);
		const visibleFilePaths = visibleItems.map((item) => item.filePath);

		if (isSelected) {
			this.props.selectionState.selectAll(visibleFilePaths);
		} else {
			this.props.selectionState.deselectAll(visibleFilePaths);
		}

		// Update checkboxes to reflect selection state
		document
			.querySelectorAll(".alrawi-card .alrawi-card-checkbox")
			.forEach((checkbox: HTMLInputElement, idx) => {
				if (idx < visibleItems.length) {
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
