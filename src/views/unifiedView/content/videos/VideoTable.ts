// src/views/unifiedView/content/videos/VideoTable.ts
import { Menu, setIcon } from "obsidian";
import { VideoItem, PlaylistItem } from "../../../../types";
import { ComponentProps } from "../../types";
import { SelectionState } from "../../state/SelectionState";
import { ColumnConfigModal } from "../../../../modals/settingsModals/columnConfigModal";
import { moment } from "obsidian";
import { FilterState } from "../../state/FilterState";
import { SharedUtils } from "../SharedUtils";

interface VideoTableProps extends ComponentProps {
	items: (VideoItem | PlaylistItem)[];
	selectionState: SelectionState;
	filterState: FilterState;
	onRefresh: () => Promise<void>;
}

/**
 * Renders videos in table view
 */
export class VideoTable {
	private props: VideoTableProps;

	constructor(props: VideoTableProps) {
		this.props = props;
	}

	/**
	 * Renders the videos table
	 */
	public render(container: HTMLElement): void {
		const tableContainer = container.createEl("div", {
			cls: "alrawi-table-container",
		});

		// Add config button
		this.renderTableConfig(tableContainer);

		// Create table
		const table = tableContainer.createEl("table", {
			cls: "alrawi-videos-table",
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
			"videos",
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
		const columns = this.props.settings.tableColumns.videos
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

		if (this.props.items.length === 0) {
			// Calculate colspan based on visible columns
			const visibleColumnsCount =
				this.props.settings.tableColumns.videos.filter(
					(col: { enabled: boolean }) => col.enabled
				).length;

			this.renderNoResults(tbody, visibleColumnsCount);
		} else {
			this.renderVideoTableRows(tbody);
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
	 * Renders video table rows
	 */
	private renderVideoTableRows(tbody: HTMLElement): void {
		const filterState = this.props.filterState.getVideoAndBookState();
		const startIndex = (filterState.page - 1) * filterState.itemsPerPage;
		const endIndex = Math.min(
			startIndex + filterState.itemsPerPage,
			this.props.items.length
		);

		// Get column config sorted by order
		const columns = this.props.settings.tableColumns.videos
			.filter((col: { enabled: boolean }) => col.enabled)
			.sort(
				(a: { order: number }, b: { order: number }) =>
					a.order - b.order
			);

		for (let i = startIndex; i < endIndex; i++) {
			const item = this.props.items[i] as VideoItem | PlaylistItem;
			const row = tbody.createEl("tr");

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
									item.filePath
								);
							checkbox.addEventListener("change", (e) => {
								this.props.selectionState.toggleItem(
									item.filePath,
									(e.target as HTMLInputElement).checked
								);
							});
							break;

						case "title":
							// Title with thumbnail
							const titleCell = row.createEl("td", {
								cls: "alrawi-title-cell",
							});

							if (
								this.props.settings.showThumbnailsInStats &&
								"thumbnailUrl" in item &&
								item.thumbnailUrl
							) {
								const thumbnailContainer = titleCell.createEl(
									"div",
									{ cls: "alrawi-mini-thumbnail" }
								);
								thumbnailContainer.createEl("img", {
									attr: {
										src: item.thumbnailUrl,
										alt: item.title,
									},
								});
							}

							titleCell.createEl("span", { text: item.title });
							break;

						case "presenter":
							row.createEl("td").textContent =
								"presenter" in item ? item.presenter : "";
							break;

						case "type":
							row.createEl("td").textContent = item.type;
							break;

						case "status":
							// Status with dropdown
							const statusCell = row.createEl("td");
							if (
								"presenter" in item &&
								"duration" in item &&
								"url" in item
							) {
								SharedUtils.createStatusDropdown(
									statusCell,
									item,
									this.props.settings.progressTracking
										.statusOptions,
									this.props.dataService,
									this.props.onRefresh
								);
							}
							break;

						case "duration":
							row.createEl("td").textContent =
								"duration" in item ? item.duration : "";
							break;

						case "dateAdded":
							row.createEl("td").textContent = item.dateAdded
								? moment(item.dateAdded).format("YYYY-MM-DD")
								: "غير معروف";
							break;

						case "tags":
							// Tags cell with chips/tags display
							const tagsCell = row.createEl("td", {
								cls: "alrawi-tags-cell",
							});
							if (item.tags && item.tags.length > 0) {
								const tagsContainer = tagsCell.createEl("div", {
									cls: "alrawi-table-tags-container",
								});

								// Display up to 3 tags to save space
								const displayCount = Math.min(
									3,
									item.tags.length
								);
								item.tags
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
								if (item.tags.length > displayCount) {
									tagsContainer.createEl("span", {
										text: ` +${
											item.tags.length - displayCount
										}`,
										cls: "alrawi-table-tag-more",
									});
								}
							} else {
								tagsCell.textContent = "-";
							}
							break;

						case "categories":
							// Categories cell with chips/tags display
							const categoriesCell = row.createEl("td", {
								cls: "alrawi-tags-cell",
							});
							if (item.categories && item.categories.length > 0) {
								const categoriesContainer =
									categoriesCell.createEl("div", {
										cls: "alrawi-table-tags-container",
									});

								// Display up to 3 categories to save space
								const displayCount = Math.min(
									3,
									item.categories.length
								);
								item.categories
									.slice(0, displayCount)
									.forEach((category, index) => {
										categoriesContainer.createEl("span", {
											cls: "alrawi-table-tag-chip",
											text: category,
										});

										// Add separator except for last category
										if (index < displayCount - 1) {
											categoriesContainer.createEl(
												"span",
												{ text: ", " }
											);
										}
									});

								// Show indication if there are more categories
								if (item.categories.length > displayCount) {
									categoriesContainer.createEl("span", {
										text: ` +${
											item.categories.length -
											displayCount
										}`,
										cls: "alrawi-table-tag-more",
									});
								}
							} else {
								categoriesCell.textContent = "-";
							}
							break;

						case "actions":
							// Actions
							const actionsCell = row.createEl("td", {
								cls: "alrawi-actions-cell",
							});
							this.renderVideoActions(actionsCell, item);
							break;
					}
				}
			);
		}
	}

	/**
	 * Renders video action buttons
	 */
	private renderVideoActions(
		container: HTMLElement,
		item: VideoItem | PlaylistItem
	): void {
		// YouTube link
		const youtubeLink = container.createEl("a", {
			href: "url" in item ? item.url : "#",
			cls: "alrawi-action-icon-link",
			attr: {
				title: "مشاهدة على اليوتيوب",
				target: "_blank",
			},
		});
		setIcon(youtubeLink, "youtube");

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
			SharedUtils.openFile(this.props.app, item.filePath);
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
			this.showVideoActionsMenu(item, moreActionsBtn);
		});
	}

	/**
	 * Shows the video actions menu
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
										await this.props.dataService.updateItemStatus(
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
			.querySelectorAll(
				"table.alrawi-videos-table tbody .alrawi-item-checkbox"
			)
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
			"table.alrawi-videos-table thead .alrawi-select-all"
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
			.querySelectorAll(
				"table.alrawi-videos-table tbody .alrawi-item-checkbox"
			)
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
