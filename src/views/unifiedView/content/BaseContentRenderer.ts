// src/views/unifiedView/content/BaseContentRenderer.ts
import { ComponentProps } from "../types";
import { FilterState, FilterStateEvents } from "../state/FilterState";
import { SelectionState, SelectionStateEvents } from "../state/SelectionState";

/**
 * Base props shared by all content renderers
 */
export interface BaseRendererProps extends ComponentProps {
	filterState: FilterState;
	selectionState?: SelectionState;
	onRefresh: () => Promise<void>;
}

/**
 * Base content renderer class with shared functionality
 * Abstract class that implements common rendering logic
 */
export abstract class BaseContentRenderer<T, P extends BaseRendererProps> {
	protected props: P;
	protected container: HTMLElement | null = null;
	protected stateUnsubscribes: (() => void)[] = [];
	protected filteredItems: T[] = [];

	constructor(props: P) {
		this.props = props;
	}

	/**
	 * Renders the content
	 * @param container - Container element to render into
	 */
	public render(container: HTMLElement): void {
		this.container = container;

		// Set up filter state change listener
		if (this.props.filterState) {
			this.setupStateListeners();
		}

		// Get filtered items first
		this.filteredItems = this.getFilteredItemsInternal();

		// Update available filter options based on filtered items
		this.updateAvailableFilterOptions();

		// Render stats
		this.renderStats(container);

		// Render the actual content
		this.renderContent(container);
	}

	/**
	 * Sets up state change listeners
	 */
	protected setupStateListeners(): void {
		// Listen for filter state changes
		const filterStateEvent =
			this.props.contentType === "benefits"
				? FilterStateEvents.BENEFITS_STATE_UPDATED
				: FilterStateEvents.VIDEO_BOOK_STATE_UPDATED;

		const unsubscribeFilter = this.props.filterState.subscribe(
			filterStateEvent,
			() => {
				// Only update filtered items and re-render content when filter state changes
				this.updateFilteredItems();
			}
		);

		this.stateUnsubscribes.push(unsubscribeFilter);

		// Listen for selection changes if we have a selection state
		if (this.props.selectionState) {
			const unsubscribeSelection = this.props.selectionState.subscribe(
				SelectionStateEvents.SELECTION_CHANGED,
				() => {
					// Only update selection state in the UI
					this.updateSelectionUI();
				}
			);

			this.stateUnsubscribes.push(unsubscribeSelection);
		}
	}

	/**
	 * Gets filtered items in response to a filter change
	 */
	protected updateFilteredItems(): void {
		this.filteredItems = this.getFilteredItemsInternal();

		// Update available filter options based on filtered items
		this.updateAvailableFilterOptions();

		if (this.container) {
			// Clear and re-render just the content, not stats
			const contentContainer = this.container.querySelector(
				".alrawi-content-container"
			);
			if (contentContainer) {
				contentContainer.empty();
				this.renderContent(this.container);
			} else {
				// If for some reason the container doesn't exist, render everything
				this.container.empty();
				this.renderStats(this.container);
				this.renderContent(this.container);
			}
		}
	}

	/**
	 * Updates available filter options based on filtered items
	 */
	protected abstract updateAvailableFilterOptions(): void;

	/**
	 * Updates selection UI without full re-render
	 * Implemented by specific renderers
	 */
	protected updateSelectionUI(): void {
		// Implement in subclasses
	}

	/**
	 * Gets filtered items based on filter state
	 * Public method for external use
	 * @returns Filtered items array
	 */
	public getFilteredItems(): T[] {
		return [...this.filteredItems];
	}

	/**
	 * Gets filtered items based on filter state
	 * Internal implementation
	 * @returns Filtered items array
	 */
	protected abstract getFilteredItemsInternal(): T[];

	/**
	 * Renders statistics for the content
	 * @param container - Container to render into
	 */
	protected abstract renderStats(container: HTMLElement): void;

	/**
	 * Renders the content (table/cards)
	 * @param container - Container to render into
	 */
	protected abstract renderContent(container: HTMLElement): void;

	/**
	 * Cleans up resources
	 */
	public destroy(): void {
		// Unsubscribe from state changes
		this.stateUnsubscribes.forEach((unsubscribe) => unsubscribe());
		this.stateUnsubscribes = [];

		// Clear references
		this.container = null;
		this.filteredItems = [];
	}
}
