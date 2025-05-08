// src/views/unifiedView/content/videos/VideoRenderer.ts
import { BaseContentRenderer, BaseRendererProps } from "../BaseContentRenderer";
import { VideoItem, PlaylistItem } from "../../../../types";
import { VideoStats } from "./VideoStats";
import { VideoTable } from "./VideoTable";
import { VideoCard } from "./VideoCard";
import { VIEW_MODE } from "../../constants";
import { SelectionState } from "../../state/SelectionState";

/**
 * Props for the VideoRenderer
 */
export interface VideoRendererProps extends BaseRendererProps {
	videos: VideoItem[];
	playlists: PlaylistItem[];
	presenters: string[];
	categories: string[];
	tags: string[];
	selectionState: SelectionState;
}

/**
 * Enhanced video renderer with optimized rendering
 */
export class VideoRenderer extends BaseContentRenderer<
	VideoItem | PlaylistItem,
	VideoRendererProps
> {
	// References to rendered components for partial updates
	private statsComponent: VideoStats | null = null;
	private contentComponent: VideoTable | VideoCard | null = null;

	/**
	 * Renders statistics about videos
	 * @param container - Container to render into
	 */
	protected renderStats(container: HTMLElement): void {
		const statsContainer = container.createEl("div", {
			cls: "alrawi-stats-section",
		});

		this.statsComponent = new VideoStats({
			...this.props,
			videos: this.props.videos,
			playlists: this.props.playlists,
		});

		this.statsComponent.render(statsContainer);
	}

	/**
	 * Renders video content based on view mode
	 * @param container - Container to render into
	 */
	protected renderContent(container: HTMLElement): void {
		// Create container for the main content
		const contentContainer = container.createEl("div", {
			cls: "alrawi-content-container",
		});

		// No results message if needed
		if (this.filteredItems.length === 0) {
			contentContainer.createEl("div", {
				cls: "alrawi-no-results",
				text: "لا توجد نتائج تطابق معايير البحث الخاصة بك",
			});
			return;
		}

		// Render content based on view mode
		if (this.props.settings.viewMode === VIEW_MODE.TABLE) {
			this.renderTableView(contentContainer);
		} else {
			this.renderCardView(contentContainer);
		}
	}

	/**
	 * Renders videos in table view
	 * @param container - Container to render into
	 */
	private renderTableView(container: HTMLElement): void {
		// Clean up previous component if needed
		if (
			this.contentComponent &&
			this.contentComponent instanceof VideoCard
		) {
			this.contentComponent = null;
		}

		this.contentComponent = new VideoTable({
			...this.props,
			items: this.filteredItems,
			selectionState: this.props.selectionState,
			onRefresh: this.props.onRefresh,
		});

		this.contentComponent.render(container);
	}

	/**
	 * Renders videos in card view
	 * @param container - Container to render into
	 */
	private renderCardView(container: HTMLElement): void {
		// Clean up previous component if needed
		if (
			this.contentComponent &&
			this.contentComponent instanceof VideoTable
		) {
			this.contentComponent = null;
		}

		this.contentComponent = new VideoCard({
			...this.props,
			items: this.filteredItems,
			selectionState: this.props.selectionState,
			onRefresh: this.props.onRefresh,
		});

		this.contentComponent.render(container);
	}

	/**
	 * Updates selection UI without full re-render
	 */
	protected updateSelectionUI(): void {
		// Delegate to the content component if possible
		if (
			this.contentComponent &&
			"updateSelectionUI" in this.contentComponent
		) {
			(this.contentComponent as any).updateSelectionUI();
		}
	}

	/**
	 * Gets filtered videos and playlists based on filter state
	 * @returns Filtered array of videos and playlists
	 */
	protected getFilteredItemsInternal(): (VideoItem | PlaylistItem)[] {
		const items = [...this.props.videos, ...this.props.playlists];
		const filterState = this.props.filterState.getVideoAndBookState();

		// Apply filters
		let filteredItems = items;

		// Status filter
		if (filterState.statuses.length > 0) {
			filteredItems = filteredItems.filter((item) =>
				filterState.statuses.includes(item.status || "")
			);
		}

		// Presenter filter
		if (filterState.presenters.length > 0) {
			filteredItems = filteredItems.filter(
				(item) =>
					"presenter" in item &&
					filterState.presenters.includes(item.presenter)
			);
		}

		// Type filter
		if (filterState.types.length > 0) {
			filteredItems = filteredItems.filter((item) =>
				filterState.types.includes(item.type)
			);
		}

		// Category filter
		if (filterState.categories && filterState.categories.length > 0) {
			filteredItems = filteredItems.filter(
				(item) =>
					item.categories &&
					item.categories.some((category) =>
						filterState.categories.includes(category)
					)
			);
		}

		// Tags filter - enhanced for hierarchical tags
		if (filterState.tags.length > 0) {
			filteredItems = filteredItems.filter(
				(item) =>
					item.tags &&
					item.tags.some(
						(tag) =>
							// Direct match
							filterState.tags.includes(tag) ||
							// Parent tag match (selected parent tag matches this tag's parent)
							filterState.tags.some((filterTag) =>
								tag.startsWith(filterTag + "/")
							) ||
							// Child tag match (this tag is a parent of selected tag)
							filterState.tags.some((filterTag) =>
								filterTag.startsWith(tag + "/")
							)
					)
			);
		}

		// Date range filter
		if (filterState.dateRange.from || filterState.dateRange.to) {
			filteredItems = filteredItems.filter((item) => {
				if (!item.dateAdded) return false;

				const itemDate = new Date(item.dateAdded);
				const fromDate = filterState.dateRange.from
					? new Date(filterState.dateRange.from)
					: null;
				const toDate = filterState.dateRange.to
					? new Date(filterState.dateRange.to)
					: null;

				if (fromDate && itemDate < fromDate) return false;
				if (toDate) {
					// Set toDate to end of day to include the specified date
					toDate.setHours(23, 59, 59, 999);
					if (itemDate > toDate) return false;
				}
				return true;
			});
		}

		// Search query filter
		if (filterState.searchQuery) {
			const query = filterState.searchQuery.toLowerCase();
			filteredItems = filteredItems.filter(
				(item) =>
					item.title.toLowerCase().includes(query) ||
					("presenter" in item &&
						typeof item.presenter === "string" &&
						item.presenter.toLowerCase().includes(query)) ||
					item.type.toLowerCase().includes(query) ||
					(item.tags &&
						item.tags.some(
							(tag) =>
								typeof tag === "string" &&
								tag.toLowerCase().includes(query)
						)) ||
					(item.categories &&
						item.categories.some(
							(category) =>
								typeof category === "string" &&
								category.toLowerCase().includes(query)
						))
			);
		}

		// Apply sorting
		return this.applySorting(filteredItems);
	}

	/**
	 * Applies sorting to items
	 * @param items - Items to sort
	 * @returns Sorted array
	 */
	private applySorting(
		items: (VideoItem | PlaylistItem)[]
	): (VideoItem | PlaylistItem)[] {
		const filterState = this.props.filterState.getVideoAndBookState();

		if (!filterState.sortBy) return items;

		return [...items].sort((a, b) => {
			let aValue: any, bValue: any;

			// Determine sort values based on sort field
			switch (filterState.sortBy) {
				case "title":
					aValue = a.title;
					bValue = b.title;
					break;
				case "presenter":
					aValue = "presenter" in a ? a.presenter : "";
					bValue = "presenter" in b ? b.presenter : "";
					break;
				case "type":
					aValue = a.type;
					bValue = b.type;
					break;
				case "status":
					aValue = a.status || "";
					bValue = b.status || "";
					break;
				case "duration":
					// Use durationSeconds for videos, convert duration string for playlists
					if ("durationSeconds" in a) {
						aValue = a.durationSeconds;
					} else if ("duration" in a) {
						aValue = this.getDurationSeconds(a.duration);
					} else {
						aValue = 0;
					}

					if ("durationSeconds" in b) {
						bValue = b.durationSeconds;
					} else if ("duration" in b) {
						bValue = this.getDurationSeconds(b.duration);
					} else {
						bValue = 0;
					}
					break;
				case "dateAdded":
					aValue = a.dateAdded ? new Date(a.dateAdded).getTime() : 0;
					bValue = b.dateAdded ? new Date(b.dateAdded).getTime() : 0;
					break;
				default:
					return 0;
			}

			// Compare values based on sort order
			if (aValue === null || aValue === undefined) aValue = "";
			if (bValue === null || bValue === undefined) bValue = "";

			if (aValue < bValue) {
				return filterState.sortOrder === "asc" ? -1 : 1;
			}
			if (aValue > bValue) {
				return filterState.sortOrder === "asc" ? 1 : -1;
			}
			return 0;
		});
	}

	/**
	 * Updates available filter options based on filtered items
	 */
	protected updateAvailableFilterOptions(): void {
		if (!this.props.filterState) return;

		// Extract unique values from filtered items
		const statuses = new Set<string>();
		const presenters = new Set<string>();
		const types = new Set<string>();
		const categories = new Set<string>();
		const tags = new Set<string>();

		this.filteredItems.forEach((item) => {
			// Add status
			if (item.status) statuses.add(item.status);

			// Add presenter
			if ("presenter" in item && item.presenter)
				presenters.add(item.presenter);

			// Add type
			if (item.type) types.add(item.type);

			// Add categories
			if (item.categories && Array.isArray(item.categories)) {
				item.categories.forEach((category) => categories.add(category));
			}

			// Add tags
			if (item.tags && Array.isArray(item.tags)) {
				item.tags.forEach((tag) => tags.add(tag));
			}
		});

		// Update available options in filter state
		this.props.filterState.setAvailableVideoOptions({
			statuses: Array.from(statuses),
			presenters: Array.from(presenters),
			types: Array.from(types),
			categories: Array.from(categories),
			tags: Array.from(tags),
		});
	}

	/**
	 * Converts duration string to seconds for sorting
	 * @param duration - Duration string in HH:MM:SS format
	 * @returns Duration in seconds
	 */
	private getDurationSeconds(duration: string): number {
		if (!duration) return 0;
		const [h = "0", m = "0", s = "0"] = duration.split(":");
		return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s);
	}

	/**
	 * Clean up resources when component is destroyed
	 */
	public destroy(): void {
		super.destroy();

		// Clean up component references
		this.statsComponent = null;

		if (this.contentComponent && "destroy" in this.contentComponent) {
			(this.contentComponent as any).destroy();
		}
		this.contentComponent = null;
	}
}
