// src/views/unifiedView/UnifiedView.ts
import { ItemView, WorkspaceLeaf, Notice } from "obsidian";
import { DataService } from "../../services/dataService";
import { VideoItem, PlaylistItem, BookItem, Benefit } from "../../types";
import { ContentType, UnifiedViewProps } from "./types";
import {
	VIEW_TYPE_ALRAWI_UNIFIED,
	CONTENT_TYPE,
	LOCAL_STORAGE_KEYS,
} from "./constants";
import { FilterState, FilterStateEvents } from "./state/FilterState";
import { SelectionState, SelectionStateEvents } from "./state/SelectionState";
import { Header } from "./components/Header";
import { FilterBar } from "./components/FilterBar";
import { Pagination } from "./components/Pagination";
import { BulkActions } from "./components/BulkActions";
import { VideoRenderer } from "./content/videos/VideoRenderer";
import { BookRenderer } from "./content/books/BookRenderer";
import { BenefitRenderer } from "./content/benefits/BenefitRenderer";
import { AlRawiSettings } from "src/core/settings";

/**
 * UnifiedView provides a unified interface for managing videos, books, and benefits
 * with optimized rendering and state management
 */
export class UnifiedView extends ItemView {
	// Core properties
	private plugin: any; // AlRawiPlugin reference
	private settings: any;
	private contentType: ContentType = CONTENT_TYPE.VIDEOS;
	private dataService: DataService;

	// Enhanced state management
	private filterState: FilterState;
	private selectionState: SelectionState;

	// UI Containers
	private contentContainer: HTMLElement | null = null;
	private filterContainer: HTMLElement | null = null;
	private mainContentContainer: HTMLElement | null = null;
	private paginationContainer: HTMLElement | null = null;
	private bulkActionsContainer: HTMLElement | null = null;
	private headerContainer: HTMLElement | null = null;

	// Component references
	private headerComponent: Header | null = null;
	private filterBarComponent: FilterBar | null = null;
	private paginationComponent: Pagination | null = null;
	private bulkActionsComponent: BulkActions | null = null;
	private contentRenderer:
		| VideoRenderer
		| BookRenderer
		| BenefitRenderer
		| null = null;

	// State event unsubscribes
	private stateUnsubscribes: (() => void)[] = [];

	// Data containers with caching
	private data = {
		videos: [] as VideoItem[],
		playlists: [] as PlaylistItem[],
		books: [] as BookItem[],
		benefits: [] as Benefit[],
		presenters: [] as string[],
		authors: [] as string[],
		categories: {
			videos: [] as string[],
			books: [] as string[],
			benefits: [] as string[],
		},
		tags: {
			videos: [] as string[],
			books: [] as string[],
			benefits: [] as string[],
		},
	};

	/**
	 * Creates a new UnifiedView
	 * @param leaf - The workspace leaf to attach the view to
	 * @param plugin - The AlRawiPlugin instance
	 */
	constructor(leaf: WorkspaceLeaf, plugin: any) {
		super(leaf);
		this.plugin = plugin;
		this.settings = plugin.settings;
		this.dataService = new DataService(this.app, this.plugin.settings);

		// Initialize enhanced state managers
		this.filterState = new FilterState();
		this.selectionState = new SelectionState();

		// Set up state change listeners
		this.setupStateListeners();
	}

	/**
	 * Sets up listeners for state changes to perform targeted updates
	 */
	private setupStateListeners(): void {
		// Listen for filter state changes to update content display
		const unsubscribeVideoBook = this.filterState.subscribe(
			FilterStateEvents.VIDEO_BOOK_STATE_UPDATED,
			() => {
				this.renderContent();
			}
		);

		const unsubscribeBenefits = this.filterState.subscribe(
			FilterStateEvents.BENEFITS_STATE_UPDATED,
			() => {
				this.renderContent();
			}
		);

		// Listen for selection changes to update bulk actions
		const unsubscribeSelection = this.selectionState.subscribe(
			SelectionStateEvents.SELECTION_CHANGED,
			() => {
				this.updateBulkActions();
			}
		);

		this.stateUnsubscribes.push(unsubscribeVideoBook);
		this.stateUnsubscribes.push(unsubscribeBenefits);
		this.stateUnsubscribes.push(unsubscribeSelection);
	}

	/**
	 * Gets the view type identifier
	 * @returns The view type identifier string
	 */
	getViewType(): string {
		return VIEW_TYPE_ALRAWI_UNIFIED;
	}

	/**
	 * Gets the display text for the view based on content type
	 * @returns The display text
	 */
	getDisplayText(): string {
		if (this.contentType === CONTENT_TYPE.VIDEOS) {
			return "📊 إحصائيات الراوي";
		} else if (this.contentType === CONTENT_TYPE.BOOKS) {
			return "📚 مكتبة الراوي";
		} else {
			return "📝 فوائد الراوي";
		}
	}

	/**
	 * Gets the icon for the view based on content type
	 * @returns The icon name
	 */
	getIcon(): string {
		if (this.contentType === CONTENT_TYPE.VIDEOS) {
			return "bar-chart";
		} else if (this.contentType === CONTENT_TYPE.BOOKS) {
			return "book";
		} else {
			return "calendar-check";
		}
	}

	/**
	 * Called when the view is opened
	 */
	async onOpen(): Promise<void> {
		// Try to retrieve last used content type from localStorage
		const savedContentType = localStorage.getItem(
			LOCAL_STORAGE_KEYS.CONTENT_TYPE
		);
		if (
			savedContentType === CONTENT_TYPE.BOOKS ||
			savedContentType === CONTENT_TYPE.VIDEOS ||
			savedContentType === CONTENT_TYPE.BENEFITS
		) {
			this.contentType = savedContentType;
		}

		// Set up the UI structure once
		this.setupUIStructure();

		// Initial data load and rendering
		await this.loadData();
		this.renderView();
	}

	/**
	 * Creates the basic UI structure for the view
	 * This is only done once to avoid unnecessary DOM manipulation
	 */
	private setupUIStructure(): void {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass("alrawi-container");

		// Header section (content type switcher, actions)
		this.headerContainer = container.createEl("div", {
			cls: "alrawi-header-container",
		});

		// Create the filter container (for filter bar and selected filters)
		this.filterContainer = container.createEl("div", {
			cls: "alrawi-filter-section",
		});

		// Create bulk actions container
		this.bulkActionsContainer = container.createEl("div", {
			cls: "alrawi-bulk-actions-section",
		});

		// Create the main content container
		this.mainContentContainer = container.createEl("div", {
			cls: "alrawi-main-content",
		});

		// Create the pagination container
		this.paginationContainer = container.createEl("div", {
			cls: "alrawi-pagination-section",
		});
	}

	/**
	 * Called when the view is closed
	 */
	async onClose(): Promise<void> {
		// Clean up resources
		this.resetAllComponents();

		// Clean up state listeners
		this.stateUnsubscribes.forEach((unsubscribe) => unsubscribe());
		this.stateUnsubscribes = [];

		// Reset state
		this.filterState.reset();
		this.selectionState.clearSelection();

		// Clean up DOM references
		this.headerContainer = null;
		this.filterContainer = null;
		this.bulkActionsContainer = null;
		this.mainContentContainer = null;
		this.paginationContainer = null;
	}

	/**
	 * Resets and cleans up all component references
	 */
	private resetAllComponents(): void {
		// Clean up header component
		if (this.headerComponent) {
			this.headerComponent.destroy?.();
			this.headerComponent = null;
		}

		// Clean up filter bar component
		if (this.filterBarComponent) {
			this.filterBarComponent.destroy?.();
			this.filterBarComponent = null;
		}

		// Clean up pagination component
		if (this.paginationComponent) {
			this.paginationComponent.destroy?.();
			this.paginationComponent = null;
		}

		// Clean up bulk actions component
		if (this.bulkActionsComponent) {
			this.bulkActionsComponent.destroy?.();
			this.bulkActionsComponent = null;
		}

		// Clean up content renderer
		if (this.contentRenderer) {
			this.contentRenderer.destroy?.();
			this.contentRenderer = null;
		}
	}

	/**
	 * Loads data for the current content type
	 * @param forceRefresh - Whether to force a refresh of cached data
	 */
	async loadData(forceRefresh = false): Promise<void> {
		if (this.contentType === CONTENT_TYPE.VIDEOS) {
			if (this.data.videos.length === 0 || forceRefresh) {
				// Load videos and playlists
				const videoData =
					await this.dataService.getVideosAndPlaylists();
				this.data.videos = videoData.videos;
				this.data.playlists = videoData.playlists;
				this.data.presenters = videoData.presenters;
				this.data.categories.videos = videoData.categories;
				this.data.tags.videos = await this.dataService.getTags(
					"videos"
				);

				this.filterState.setAvailableVideoOptions({
					statuses:
						this.settings.progressTracking.statusOptions || [],
					presenters: this.data.presenters || [],
					types: ["مقطع", "سلسلة"],
					categories: this.data.categories.videos || [],
					tags: this.data.tags.videos || [],
				});
			}
		} else if (this.contentType === CONTENT_TYPE.BOOKS) {
			if (this.data.books.length === 0 || forceRefresh) {
				// Load books
				const bookData = await this.dataService.getBooks(forceRefresh);
				this.data.books = bookData.books;
				this.data.authors = bookData.authors;
				this.data.categories.books = bookData.categories;
				this.data.tags.books = await this.dataService.getTags("books");

				this.filterState.setAvailableBookOptions({
					statuses:
						this.settings.booksSettings.bookStatusOptions || [],
					presenters: this.data.authors || [],
					types: this.data.categories.books || [],
					tags: this.data.tags.books || [],
				});
			}
		} else if (this.contentType === CONTENT_TYPE.BENEFITS) {
			if (this.data.benefits.length === 0 || forceRefresh) {
				// Load benefits
				const benefits = await this.dataService.getAllBenefits();
				this.data.benefits = benefits;

				// Extract categories and tags
				const categories = new Set<string>();
				const tags = new Set<string>();

				benefits.forEach((benefit) => {
					if (benefit.category) {
						categories.add(benefit.category);
					}

					if (benefit.tags && benefit.tags.length > 0) {
						benefit.tags.forEach((tag) => {
							tags.add(tag);
						});
					}
				});

				this.data.categories.benefits = Array.from(categories).sort();
				this.data.tags.benefits = Array.from(tags).sort();

				this.filterState.setAvailableBenefitOptions({
					categories: this.data.categories.benefits || [],
					sourceTypes: ["book", "video"],
					sources: this.data.benefits.map((b) => b.sourcePath),
					tags: this.data.tags.benefits || [],
				});
			}
		}
	}

	/**
	 * Renders the entire view
	 */
	private renderView(): void {
		if (!this.headerContainer) return;

		// Render the header (with content type switching)
		this.renderHeader();

		// Render bulk actions
		this.renderBulkActions();

		// Render filter bar
		this.renderFilterBar();

		// Render content
		this.renderContent();
	}

	/**
	 * Renders the header component
	 */
	private renderHeader(): void {
		if (!this.headerContainer) return;
		this.headerContainer.empty();

		this.headerComponent = new Header({
			app: this.app,
			leaf: this.leaf,
			plugin: this.plugin,
			settings: this.settings,
			dataService: this.dataService,
			contentType: this.contentType,
			onContentTypeChange: this.toggleContentType.bind(this),
			onViewModeChange: this.toggleViewMode.bind(this),
			onRefresh: this.handleRefresh.bind(this),
			selectionState: this.selectionState,
		});

		this.headerComponent.render(this.headerContainer);
	}

	/**
	 * Renders the bulk actions component
	 */
	private renderBulkActions(): void {
		if (!this.bulkActionsContainer) return;
		this.bulkActionsContainer.empty();

		this.bulkActionsComponent = new BulkActions({
			app: this.app,
			plugin: this.plugin,
			settings: this.settings,
			dataService: this.dataService,
			contentType: this.contentType,
			onRefresh: this.handleRefresh.bind(this),
			selectionState: this.selectionState,
			onOperationComplete: this.handleBulkOperationComplete.bind(this),
		});

		this.bulkActionsComponent.render(this.bulkActionsContainer);

		// Initial update of visibility
		this.updateBulkActions();
	}

	/**
	 * Updates the bulk actions visibility based on selection state
	 */
	private updateBulkActions(): void {
		// Only re-render bulk actions when needed
		if (this.bulkActionsContainer) {
			const hasSelection = this.selectionState.hasSelection();
			this.bulkActionsContainer.style.display = hasSelection
				? "block"
				: "none";
		}
	}

	/**
	 * Renders the filter bar component
	 */
	private renderFilterBar(): void {
		if (!this.filterContainer) return;
		this.filterContainer.empty();

		// Destroy previous instance if exists
		if (this.filterBarComponent) {
			this.filterBarComponent.destroy?.();
			this.filterBarComponent = null;
		}

		// Get appropriate data based on content type
		let presenters: string[] = [];
		let categories: string[] = [];
		let tags: string[] = [];

		if (this.contentType === CONTENT_TYPE.VIDEOS) {
			presenters = this.data.presenters;
			categories = this.data.categories.videos;
			tags = this.data.tags.videos;
		} else if (this.contentType === CONTENT_TYPE.BOOKS) {
			presenters = this.data.authors;
			categories = this.data.categories.books;
			tags = this.data.tags.books;
		} else {
			categories = this.data.categories.benefits;
			tags = this.data.tags.benefits;
		}

		this.filterBarComponent = new FilterBar({
			app: this.app,
			plugin: this.plugin,
			settings: this.settings,
			dataService: this.dataService,
			contentType: this.contentType,
			onRefresh: this.handleFilterChange.bind(this),
			onFilterChange: this.handleFilterChange.bind(this),
			filterState: this.filterState,
			presenters: presenters,
			categories: categories,
			tags: tags,
			useDynamicOptions: true,
		});

		this.filterBarComponent.render(this.filterContainer);
	}

	/**
	 * Renders the main content based on content type
	 */
	private renderContent(): void {
		if (!this.mainContentContainer || !this.paginationContainer) return;

		// Clean up previous content
		this.mainContentContainer.empty();
		this.paginationContainer.empty();

		// Destroy previous renderer if exists
		if (this.contentRenderer) {
			this.contentRenderer.destroy();
			this.contentRenderer = null;
		}

		// Create component props
		const props: UnifiedViewProps = {
			app: this.app,
			leaf: this.leaf,
			plugin: this.plugin,
			settings: this.settings,
			dataService: this.dataService,
		};

		// Render appropriate content based on content type
		if (this.contentType === CONTENT_TYPE.VIDEOS) {
			this.renderVideosContent(props);
		} else if (this.contentType === CONTENT_TYPE.BOOKS) {
			this.renderBooksContent(props);
		} else if (this.contentType === CONTENT_TYPE.BENEFITS) {
			this.renderBenefitsContent(props);
		}
	}

	/**
	 * Renders the videos content
	 */
	private renderVideosContent(props: UnifiedViewProps): void {
		const videoRenderer = new VideoRenderer({
			...props,
			contentType: this.contentType,
			videos: this.data.videos,
			playlists: this.data.playlists,
			presenters: this.data.presenters,
			categories: this.data.categories.videos,
			tags: this.data.tags.videos,
			filterState: this.filterState,
			selectionState: this.selectionState,
			onRefresh: this.handleContentUpdate.bind(this),
		});

		// Store renderer reference
		this.contentRenderer = videoRenderer;

		// Render content
		videoRenderer.render(this.mainContentContainer!);

		// Render pagination if there are items
		const filteredItems = videoRenderer.getFilteredItems();
		if (filteredItems.length > 0) {
			this.renderPagination(filteredItems.length);
		}
	}

	/**
	 * Renders the books content
	 */
	private renderBooksContent(props: UnifiedViewProps): void {
		const bookRenderer = new BookRenderer({
			...props,
			contentType: this.contentType,
			books: this.data.books,
			authors: this.data.authors,
			categories: this.data.categories.books,
			tags: this.data.tags.books,
			filterState: this.filterState,
			selectionState: this.selectionState,
			onRefresh: this.handleContentUpdate.bind(this),
		});

		// Store renderer reference
		this.contentRenderer = bookRenderer;

		// Render content
		bookRenderer.render(this.mainContentContainer!);

		// Render pagination if there are items
		const filteredItems = bookRenderer.getFilteredItems();
		if (filteredItems.length > 0) {
			this.renderPagination(filteredItems.length);
		}
	}

	/**
	 * Renders the benefits content
	 */
	private renderBenefitsContent(props: UnifiedViewProps): void {
		const benefitRenderer = new BenefitRenderer({
			...props,
			contentType: this.contentType,
			benefits: this.data.benefits,
			categories: this.data.categories.benefits,
			tags: this.data.tags.benefits,
			filterState: this.filterState,
			onRefresh: this.handleContentUpdate.bind(this),
		});

		// Store renderer reference
		this.contentRenderer = benefitRenderer;

		// Render content
		benefitRenderer.render(this.mainContentContainer!);

		// Render pagination if there are items
		const filteredItems = benefitRenderer.getFilteredItems();
		if (filteredItems.length > 0) {
			this.renderPagination(filteredItems.length);
		}
	}

	/**
	 * Renders the pagination component
	 * @param totalItems - Total number of items for pagination
	 */
	private renderPagination(totalItems: number): void {
		if (!this.paginationContainer) return;
		this.paginationContainer.empty();

		// Destroy previous component if exists
		if (this.paginationComponent) {
			this.paginationComponent.destroy?.();
			this.paginationComponent = null;
		}

		this.paginationComponent = new Pagination({
			app: this.app,
			plugin: this.plugin,
			settings: this.settings,
			dataService: this.dataService,
			contentType: this.contentType,
			onRefresh: this.handlePageChange.bind(this),
			totalItems: totalItems,
			filterState: this.filterState,
			onPageChange: this.handlePageChange.bind(this),
		});

		this.paginationComponent.render(this.paginationContainer);
	}

	/**
	 * Toggle between videos, books, and benefits content
	 * @param type - The content type to switch to
	 */
	public toggleContentType(type: ContentType): void {
		if (this.contentType !== type) {
			this.contentType = type;

			// Reset filter state when changing content type
			this.filterState.reset();
			this.selectionState.clearSelection();

			// Save content type preference
			localStorage.setItem(LOCAL_STORAGE_KEYS.CONTENT_TYPE, type);

			// Load data for the new content type and re-render
			this.loadData().then(() => {
				this.renderView();
			});

			// Update leaf view state
			this.leaf.setViewState({ type: this.getViewType(), active: true });
		}
	}

	/**
	 * Toggle between table and card view
	 * @param viewMode - The view mode to switch to
	 */
	private toggleViewMode(viewMode: "table" | "card"): void {
		if (this.settings.viewMode !== viewMode) {
			this.settings.viewMode = viewMode;
			this.plugin.saveSettings();

			// Only re-render the content, not the entire view
			this.renderContent();

			// Update header if it exists
			if (
				this.headerComponent &&
				typeof this.headerComponent.updateViewMode === "function"
			) {
				this.headerComponent.updateViewMode(viewMode);
			}
		}
	}

	/**
	 * Handle filter change events
	 * Only updates the necessary components
	 */
	private handleFilterChange(): Promise<void> {
		// Force update selected filters
		if (
			this.filterBarComponent &&
			typeof this.filterBarComponent.renderSelectedFilters ===
				"function" &&
			this.filterContainer
		) {
			this.filterBarComponent.renderSelectedFilters(this.filterContainer);
		}

		// Only re-render the content and pagination, not the entire view
		this.renderContent();
		return Promise.resolve();
	}

	/**
	 * Handle page change events
	 * Only updates the content display, not filtering components
	 */
	private handlePageChange(): Promise<void> {
		// Only re-render the content, not filters or other components
		this.renderContent();
		return Promise.resolve();
	}

	/**
	 * Handle content updates from child components
	 */
	private handleContentUpdate(): Promise<void> {
		// Re-render only the content, not the entire view
		this.renderContent();
		return Promise.resolve();
	}

	/**
	 * Handle bulk operation completion
	 */
	private handleBulkOperationComplete(): Promise<void> {
		// Reload data and re-render the view after bulk operations
		return this.handleRefresh();
	}

	/**
	 * Handle refresh action
	 * Forces a data reload and full re-render
	 */
	private async handleRefresh(): Promise<void> {
		await this.loadData(true);
		this.renderView();
		new Notice("✅ تم تحديث البيانات");
	}
}
