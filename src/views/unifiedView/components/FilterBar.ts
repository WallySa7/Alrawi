// src/views/unifiedView/components/EnhancedFilterBar.ts
import { SearchComponent, setIcon } from "obsidian";
import { ComponentProps } from "../types";
import { FilterState, FilterStateEvents } from "../state/FilterState";
import { CONTENT_TYPE } from "../constants";

interface EnhancedFilterBarProps extends ComponentProps {
	filterState: FilterState;
	onFilterChange: () => Promise<void>;
	presenters: string[];
	categories: string[];
	tags: string[];
	useDynamicOptions?: boolean;
}

/**
 * Enhanced filter bar component with optimized rendering and debouncing
 */
export class FilterBar {
	private props: EnhancedFilterBarProps;
	private searchInput: SearchComponent;
	private activeDropdown: string | null = null;
	private searchTimeout: number | null = null;

	// DOM references for efficient updates
	private dropdowns: Map<string, HTMLElement> = new Map();
	private optionsContainers: Map<string, HTMLElement> = new Map();
	private stateUnsubscribes: (() => void)[] = [];
	private element: HTMLElement | null = null;

	/**
	 * Creates a new EnhancedFilterBar component
	 * @param props - Component props
	 */
	constructor(props: EnhancedFilterBarProps) {
		this.props = props;

		// Subscribe to state changes related to available options
		if (props.useDynamicOptions) {
			const unsubscribe = this.props.filterState.subscribe(
				FilterStateEvents.AVAILABLE_OPTIONS_UPDATED,
				(data: { contentType: string; options: any }) => {
					if (data.contentType === this.props.contentType) {
						this.updateFilterOptions();
					}
				}
			);

			this.stateUnsubscribes.push(unsubscribe);
		}
	}

	/**
	 * Renders the filter bar
	 * @param container - Container element to render into
	 */
	public render(container: HTMLElement): void {
		if (this.props.contentType === CONTENT_TYPE.BENEFITS) {
			this.renderBenefitsFilterBar(container);
		} else {
			this.renderStandardFilterBar(container);
		}

		// Add selected filters display
		this.renderSelectedFilters(container);

		// Store reference to component
		(container as any)._filterBarComponent = this;
		this.element = container;
	}

	/**
	 * Renders the standard filter bar for videos and books
	 * @param container - Container element to render into
	 */
	private renderStandardFilterBar(container: HTMLElement): void {
		const filterBar = container.createEl("div", {
			cls: "alrawi-filter-bar",
		});
		const filterState = this.props.filterState.getVideoAndBookState();

		// Status filter - use appropriate status options
		if (this.props.contentType === CONTENT_TYPE.VIDEOS) {
			this.createMultiSelectFilter(
				filterBar,
				"الحالة",
				"status",
				this.props.settings.progressTracking.statusOptions || [],
				filterState.statuses
			);

			// Presenter filter for videos
			this.createMultiSelectFilter(
				filterBar,
				"الملقي",
				"presenter",
				this.props.presenters || [],
				filterState.presenters
			);

			// Type filter for videos
			this.createMultiSelectFilter(
				filterBar,
				"النوع",
				"type",
				["مقطع", "سلسلة"],
				filterState.types
			);

			// Categories filter for videos
			this.createMultiSelectFilter(
				filterBar,
				"التصنيفات",
				"category",
				this.props.categories || [],
				filterState.categories
			);
		} else {
			// Status filter for books
			this.createMultiSelectFilter(
				filterBar,
				"الحالة",
				"status",
				this.props.settings.booksSettings.bookStatusOptions || [],
				filterState.statuses
			);

			// Author filter for books (using presenters array in filter state)
			this.createMultiSelectFilter(
				filterBar,
				"المؤلف",
				"author",
				this.props.presenters || [],
				filterState.presenters
			);

			// Categories filter for books (using types array in filter state)
			this.createMultiSelectFilter(
				filterBar,
				"التصنيفات",
				"category",
				this.props.categories || [],
				filterState.types
			);
		}

		// Tags filter - common to all
		this.createMultiSelectFilter(
			filterBar,
			"الوسوم",
			"tag",
			this.props.tags || [],
			filterState.tags
		);

		// Date range filter - common to all
		this.renderDateRangeFilter(filterBar);

		// Search bar - common to all
		this.renderSearchBar(filterBar);
	}

	/**
	 * Renders the benefits filter bar
	 * @param container - Container element to render into
	 */
	private renderBenefitsFilterBar(container: HTMLElement): void {
		const filterBar = container.createEl("div", {
			cls: "alrawi-filter-bar",
		});
		const benefitFilterState = this.props.filterState.getBenefitsState();

		// Category filter
		this.createMultiSelectFilter(
			filterBar,
			"التصنيف",
			"category",
			this.props.categories || [],
			benefitFilterState.categories
		);

		// Source type filter
		this.createMultiSelectFilterForBenefits(
			filterBar,
			"نوع المصدر",
			"sourceType",
			["كتاب", "فيديو"],
			benefitFilterState.sourceTypes
		);

		// Sources filter
		this.createSourcesFilter(filterBar);

		// Tags filter
		this.createMultiSelectFilter(
			filterBar,
			"الوسوم",
			"tag",
			this.props.tags || [],
			benefitFilterState.tags
		);

		// Date range filter
		this.renderBenefitsDateRangeFilter(filterBar);

		// Search bar
		this.renderBenefitsSearchBar(filterBar);
	}

	/**
	 * Renders selected filters as clickable badges
	 * @param container - Container element to render into
	 */
	public renderSelectedFilters(container: HTMLElement): void {
		// Create or retrieve the selected filters container
		let selectedFiltersContainer = container.querySelector(
			".alrawi-selected-filters"
		);
		if (!selectedFiltersContainer) {
			selectedFiltersContainer = container.createEl("div", {
				cls: "alrawi-selected-filters",
			});
		} else {
			selectedFiltersContainer.empty();
		}

		if (this.props.contentType === CONTENT_TYPE.BENEFITS) {
			this.renderSelectedBenefitFilters(
				selectedFiltersContainer as HTMLElement
			);
		} else {
			this.renderSelectedStandardFilters(
				selectedFiltersContainer as HTMLElement
			);
		}
	}

	/**
	 * Renders selected filters for videos and books
	 * @param container - Container element to render into
	 */
	private renderSelectedStandardFilters(container: HTMLElement): void {
		const filterState = this.props.filterState.getVideoAndBookState();

		const hasFilters =
			filterState.statuses.length > 0 ||
			filterState.presenters.length > 0 ||
			filterState.types.length > 0 ||
			filterState.categories.length > 0 ||
			filterState.tags.length > 0 ||
			filterState.dateRange.from ||
			filterState.dateRange.to ||
			filterState.searchQuery;

		if (!hasFilters) return;

		const filtersLabel = container.createEl("div", {
			cls: "alrawi-selected-filters-label",
			text: "الفلاتر المطبقة:",
		});

		const filtersList = container.createEl("div", {
			cls: "alrawi-selected-filters-list",
		});

		// Status filters
		filterState.statuses.forEach((status) => {
			this.createFilterBadge(filtersList, "الحالة", status, () => {
				const updatedStatuses = filterState.statuses.filter(
					(s) => s !== status
				);
				this.props.filterState.updateVideoAndBookState({
					statuses: updatedStatuses,
					page: 1,
				});
				this.props.onFilterChange();
			});
		});

		// Presenter filters
		filterState.presenters.forEach((presenter) => {
			this.createFilterBadge(filtersList, "الملقي", presenter, () => {
				const updatedPresenters = filterState.presenters.filter(
					(p) => p !== presenter
				);
				this.props.filterState.updateVideoAndBookState({
					presenters: updatedPresenters,
					page: 1,
				});
				this.props.onFilterChange();
			});
		});

		// Type filters
		if (this.props.contentType === CONTENT_TYPE.VIDEOS) {
			filterState.types.forEach((type) => {
				this.createFilterBadge(filtersList, "النوع", type, () => {
					const updatedTypes = filterState.types.filter(
						(t) => t !== type
					);
					this.props.filterState.updateVideoAndBookState({
						types: updatedTypes,
						page: 1,
					});
					this.props.onFilterChange();
				});
			});
		}

		// Category filters
		if (this.props.contentType === CONTENT_TYPE.BOOKS) {
			// For Books, categories are stored in types
			filterState.types.forEach((category) => {
				this.createCategoryFilterBadge(filtersList, category, () => {
					const updatedTypes = filterState.types.filter(
						(c) => c !== category
					);
					this.props.filterState.updateVideoAndBookState({
						types: updatedTypes,
						page: 1,
					});
					this.props.onFilterChange();
				});
			});
		} else {
			// For Videos, use categories field
			filterState.categories.forEach((category) => {
				this.createCategoryFilterBadge(filtersList, category, () => {
					const updatedCategories = filterState.categories.filter(
						(c) => c !== category
					);
					this.props.filterState.updateVideoAndBookState({
						categories: updatedCategories,
						page: 1,
					});
					this.props.onFilterChange();
				});
			});
		}

		// Tag filters
		filterState.tags.forEach((tag) => {
			this.createTagFilterBadge(filtersList, tag, () => {
				const updatedTags = filterState.tags.filter((t) => t !== tag);
				this.props.filterState.updateVideoAndBookState({
					tags: updatedTags,
					page: 1,
				});
				this.props.onFilterChange();
			});
		});

		// Date range filter
		if (filterState.dateRange.from || filterState.dateRange.to) {
			const dateText = `${filterState.dateRange.from || "البداية"} إلى ${
				filterState.dateRange.to || "النهاية"
			}`;
			this.createFilterBadge(filtersList, "التاريخ", dateText, () => {
				this.props.filterState.updateVideoAndBookState({
					dateRange: { from: null, to: null },
					page: 1,
				});
				this.props.onFilterChange();
			});
		}

		// Search query
		if (filterState.searchQuery) {
			this.createFilterBadge(
				filtersList,
				"البحث",
				filterState.searchQuery,
				() => {
					this.props.filterState.updateVideoAndBookState({
						searchQuery: "",
						page: 1,
					});

					// Update search input if available
					if (this.searchInput) {
						this.searchInput.setValue("");
					}

					this.props.onFilterChange();
				}
			);
		}

		// Clear all button
		if (hasFilters) {
			const clearAllBtn = container.createEl("button", {
				cls: "alrawi-clear-filters-btn",
				text: "مسح الكل",
			});
			clearAllBtn.addEventListener("click", () => {
				this.props.filterState.reset();

				// Update search input if available
				if (this.searchInput) {
					this.searchInput.setValue("");
				}

				this.props.onFilterChange();
			});
		}
	}

	/**
	 * Renders selected filters for benefits
	 * @param container - Container element to render into
	 */
	private renderSelectedBenefitFilters(container: HTMLElement): void {
		const benefitFilterState = this.props.filterState.getBenefitsState();

		const hasFilters =
			benefitFilterState.categories.length > 0 ||
			benefitFilterState.sourceTypes.length > 0 ||
			benefitFilterState.sources.length > 0 ||
			benefitFilterState.tags.length > 0 ||
			benefitFilterState.dateRange.from ||
			benefitFilterState.dateRange.to ||
			benefitFilterState.searchQuery;

		if (!hasFilters) return;

		const filtersLabel = container.createEl("div", {
			cls: "alrawi-selected-filters-label",
			text: "الفلاتر المطبقة:",
		});

		const filtersList = container.createEl("div", {
			cls: "alrawi-selected-filters-list",
		});

		// Category filters
		benefitFilterState.categories.forEach((category) => {
			this.createCategoryFilterBadge(filtersList, category, () => {
				const updatedCategories = benefitFilterState.categories.filter(
					(c) => c !== category
				);
				this.props.filterState.updateBenefitsState({
					categories: updatedCategories,
					page: 1,
				});
				this.props.onFilterChange();
			});
		});

		// Source type filters
		benefitFilterState.sourceTypes.forEach((sourceType) => {
			const label = sourceType === "book" ? "كتاب" : "فيديو";
			this.createFilterBadge(filtersList, "نوع المصدر", label, () => {
				const updatedSourceTypes =
					benefitFilterState.sourceTypes.filter(
						(s) => s !== sourceType
					);
				this.props.filterState.updateBenefitsState({
					sourceTypes: updatedSourceTypes,
					page: 1,
				});
				this.props.onFilterChange();
			});
		});

		// Source filters - show source title instead of path
		// This requires async operation to get source titles, so we'll handle differently
		// We'll display a loading state first and update with actual titles
		if (benefitFilterState.sources.length > 0) {
			const sourceLoadingChips = benefitFilterState.sources.map(
				(source) => {
					const badge = this.createFilterBadge(
						filtersList,
						"المصدر",
						"...",
						() => {
							const updatedSources =
								benefitFilterState.sources.filter(
									(s) => s !== source
								);
							this.props.filterState.updateBenefitsState({
								sources: updatedSources,
								page: 1,
							});
							this.props.onFilterChange();
						}
					);
					return { badge, source };
				}
			);

			// Asynchronously load source titles
			this.loadSourceTitles(sourceLoadingChips);
		}

		// Tag filters
		benefitFilterState.tags.forEach((tag) => {
			this.createTagFilterBadge(filtersList, tag, () => {
				const updatedTags = benefitFilterState.tags.filter(
					(t) => t !== tag
				);
				this.props.filterState.updateBenefitsState({
					tags: updatedTags,
					page: 1,
				});
				this.props.onFilterChange();
			});
		});

		// Date range filter
		if (
			benefitFilterState.dateRange.from ||
			benefitFilterState.dateRange.to
		) {
			const dateText = `${
				benefitFilterState.dateRange.from || "البداية"
			} إلى ${benefitFilterState.dateRange.to || "النهاية"}`;
			this.createFilterBadge(filtersList, "التاريخ", dateText, () => {
				this.props.filterState.updateBenefitsState({
					dateRange: { from: null, to: null },
					page: 1,
				});
				this.props.onFilterChange();
			});
		}

		// Search query
		if (benefitFilterState.searchQuery) {
			this.createFilterBadge(
				filtersList,
				"البحث",
				benefitFilterState.searchQuery,
				() => {
					this.props.filterState.updateBenefitsState({
						searchQuery: "",
						page: 1,
					});

					// Update search input if available
					if (this.searchInput) {
						this.searchInput.setValue("");
					}

					this.props.onFilterChange();
				}
			);
		}

		// Clear all button
		if (hasFilters) {
			const clearAllBtn = container.createEl("button", {
				cls: "alrawi-clear-filters-btn",
				text: "مسح الكل",
			});
			clearAllBtn.addEventListener("click", () => {
				this.props.filterState.reset("benefits");

				// Update search input if available
				if (this.searchInput) {
					this.searchInput.setValue("");
				}

				this.props.onFilterChange();
			});
		}
	}

	/**
	 * Loads source titles for benefit filters asynchronously
	 * @param chips - Array of badges and source paths
	 */
	private async loadSourceTitles(
		chips: Array<{ badge: HTMLElement; source: string }>
	): Promise<void> {
		try {
			const sourcesWithCounts =
				await this.props.dataService.getBenefitSources();
			const sourceMap = new Map(
				sourcesWithCounts.map((s) => [s.path, s.title])
			);

			// Update badges with actual titles
			chips.forEach(({ badge, source }) => {
				const title = sourceMap.get(source) || source;
				const valueEl = badge.querySelector(
					".alrawi-filter-badge-value"
				);
				if (valueEl) {
					valueEl.textContent = title;
				}
			});
		} catch (error) {
			console.error("Error loading source titles:", error);
		}
	}

	/**
	 * Creates a filter badge for tag filters, handling hierarchical tags
	 * @param container - Container element to add badge to
	 * @param tag - Tag value
	 * @param onClick - Click handler for removing tag
	 * @returns Created badge element
	 */
	private createTagFilterBadge(
		container: HTMLElement,
		tag: string,
		onClick: () => void
	): HTMLElement {
		if (tag.includes("/")) {
			// Handle hierarchical tag
			const [parent, ...childParts] = tag.split("/");
			const child = childParts.join("/");

			const badge = container.createEl("div", {
				cls: "alrawi-filter-badge alrawi-hierarchical-tag",
			});

			badge.createEl("span", {
				cls: "alrawi-filter-badge-label",
				text: "الوسم:",
			});

			const valueSpan = badge.createEl("span", {
				cls: "alrawi-filter-badge-value",
			});
			valueSpan.createEl("span", {
				cls: "alrawi-filter-badge-parent",
				text: parent,
			});
			valueSpan.createEl("span", { text: "/" });
			valueSpan.createEl("span", {
				cls: "alrawi-filter-badge-child",
				text: child,
			});

			badge
				.createEl("button", {
					cls: "alrawi-filter-badge-remove",
					text: "×",
				})
				.addEventListener("click", (e) => {
					e.stopPropagation();
					onClick();
				});

			return badge;
		} else {
			// Regular tag
			return this.createFilterBadge(container, "الوسم", tag, onClick);
		}
	}

	/**
	 * Creates a filter badge for category filters, handling hierarchical categories
	 * @param container - Container element to add badge to
	 * @param category - Category value
	 * @param onClick - Click handler for removing category
	 * @returns Created badge element
	 */
	private createCategoryFilterBadge(
		container: HTMLElement,
		category: string,
		onClick: () => void
	): HTMLElement {
		if (category.includes("/")) {
			// Handle hierarchical category
			const [parent, ...childParts] = category.split("/");
			const child = childParts.join("/");

			const badge = container.createEl("div", {
				cls: "alrawi-filter-badge alrawi-hierarchical-category",
			});

			badge.createEl("span", {
				cls: "alrawi-filter-badge-label",
				text: "التصنيف:",
			});

			const valueSpan = badge.createEl("span", {
				cls: "alrawi-filter-badge-value",
			});
			valueSpan.createEl("span", {
				cls: "alrawi-filter-badge-parent",
				text: parent,
			});
			valueSpan.createEl("span", { text: "/" });
			valueSpan.createEl("span", {
				cls: "alrawi-filter-badge-child",
				text: child,
			});

			badge
				.createEl("button", {
					cls: "alrawi-filter-badge-remove",
					text: "×",
				})
				.addEventListener("click", (e) => {
					e.stopPropagation();
					onClick();
				});

			return badge;
		} else {
			// Regular category
			return this.createFilterBadge(
				container,
				"التصنيف",
				category,
				onClick
			);
		}
	}

	/**
	 * Creates a standard filter badge
	 * @param container - Container element to add badge to
	 * @param label - Badge label
	 * @param value - Badge value
	 * @param onClick - Click handler for removing filter
	 * @returns Created badge element
	 */
	private createFilterBadge(
		container: HTMLElement,
		label: string,
		value: string,
		onClick: () => void
	): HTMLElement {
		const badge = container.createEl("div", { cls: "alrawi-filter-badge" });
		badge.createEl("span", {
			cls: "alrawi-filter-badge-label",
			text: `${label}:`,
		});
		badge.createEl("span", {
			cls: "alrawi-filter-badge-value",
			text: value,
		});
		badge
			.createEl("button", {
				cls: "alrawi-filter-badge-remove",
				text: "×",
			})
			.addEventListener("click", (e) => {
				e.stopPropagation();
				onClick();
			});

		return badge;
	}

	/**
	 * Creates a multi-select filter
	 * @param container - Container to add filter to
	 * @param label - Filter label
	 * @param type - Filter type identifier
	 * @param options - Available options
	 * @param selectedValues - Currently selected values
	 */
	private createMultiSelectFilter(
		container: HTMLElement,
		label: string,
		type: string,
		options: string[],
		selectedValues: string[]
	): void {
		const filterGroup = container.createEl("div", {
			cls: "alrawi-filter-group",
		});
		filterGroup.createEl("label", {
			text: label,
			cls: "alrawi-filter-label",
		});

		const selectContainer = filterGroup.createEl("div", {
			cls: "alrawi-multi-select-container",
		});

		// Search input
		const searchInput = selectContainer.createEl("input", {
			type: "text",
			cls: "alrawi-multi-select-search",
			placeholder: "ابحث...",
		});

		// Options container
		const optionsContainer = selectContainer.createEl("div", {
			cls: "alrawi-multi-select-options",
		});
		optionsContainer.style.display = "none";

		// Store references for efficient updates
		this.dropdowns.set(type, selectContainer);
		this.optionsContainers.set(type, optionsContainer);

		// Ensure options are unique and valid
		let validOptions: string[];

		// Use dynamic options if enabled and available
		if (this.props.useDynamicOptions) {
			const dynamicOptions = this.props.filterState.getAvailableOptions(
				this.props.contentType,
				type
			);
			// Merge with selected values to ensure selected items are always shown
			const mergedOptions = [
				...new Set([...dynamicOptions, ...selectedValues]),
			];
			validOptions = mergedOptions
				.map((opt) => String(opt || ""))
				.filter((opt) => opt.trim() !== "");
		} else {
			// Use the original options if dynamic filtering is not enabled
			validOptions = [
				...new Set(
					options
						.map((opt) => String(opt || ""))
						.filter((opt) => opt.trim() !== "")
				),
			];
		}

		// For tags and categories, we'll handle them hierarchically
		if (type === "tag") {
			this.renderHierarchicalTagOptions(
				optionsContainer,
				validOptions,
				selectedValues,
				type
			);
		} else if (type === "category") {
			this.renderHierarchicalCategoryOptions(
				optionsContainer,
				validOptions,
				selectedValues,
				type
			);
		} else {
			// For other filters, use the flat implementation
			this.renderFlatOptions(
				optionsContainer,
				validOptions,
				selectedValues,
				type
			);
		}

		// Search functionality with debounce
		searchInput.addEventListener(
			"input",
			this.debounce(() => {
				const searchTerm = searchInput.value.toLowerCase();
				optionsContainer
					.querySelectorAll(".alrawi-multi-select-option")
					.forEach((option) => {
						const text =
							option
								.querySelector(
									".alrawi-multi-select-option-text"
								)
								?.textContent?.toLowerCase() || "";
						const dataValue =
							option.getAttribute("data-value")?.toLowerCase() ||
							"";
						const isVisible =
							text.includes(searchTerm) ||
							dataValue.includes(searchTerm);

						(option as HTMLElement).style.display = isVisible
							? "flex"
							: "none";

						// Handle hierarchical tag visibility
						if (option.classList.contains("alrawi-parent-tag")) {
							const parentValue =
								option.getAttribute("data-value") || "";
							const children = optionsContainer.querySelectorAll(
								`.alrawi-child-tag[data-value^="${parentValue}/"]`
							);

							if (!isVisible) {
								// Hide all children when parent is hidden
								children.forEach((child) => {
									(child as HTMLElement).style.display =
										"none";
								});
							} else {
								// When parent is visible, make children visible only if they match search
								children.forEach((child) => {
									const childText =
										child
											.querySelector(
												".alrawi-multi-select-option-text"
											)
											?.textContent?.toLowerCase() || "";
									const childValue =
										child
											.getAttribute("data-value")
											?.toLowerCase() || "";

									(child as HTMLElement).style.display =
										childText.includes(searchTerm) ||
										childValue.includes(searchTerm)
											? "flex"
											: "none";
								});
							}
						}
					});
			}, 100)
		);

		// Toggle dropdown visibility
		searchInput.addEventListener("click", (e) => {
			e.stopPropagation();

			if (this.activeDropdown === type) {
				this.activeDropdown = null;
				optionsContainer.style.display = "none";
			} else {
				this.closeAllDropdowns();
				this.activeDropdown = type;
				optionsContainer.style.display = "block";
			}
		});

		// Close dropdown when clicking outside
		document.addEventListener("click", (e) => {
			if (!selectContainer.contains(e.target as Node)) {
				optionsContainer.style.display = "none";
				if (this.activeDropdown === type) {
					this.activeDropdown = null;
				}
			}
		});
	}

	/**
	 * Renders hierarchical tag options
	 * @param container - Container for options
	 * @param options - Available options
	 * @param selectedValues - Currently selected values
	 * @param type - Filter type
	 */
	private renderHierarchicalTagOptions(
		container: HTMLElement,
		options: string[],
		selectedValues: string[],
		type: string
	): void {
		// Create a hierarchical structure
		const tagHierarchy = this.organizeHierarchicalTags(options);

		// Iterate through top-level tags first
		Object.keys(tagHierarchy)
			.sort()
			.forEach((parentTag) => {
				// Add parent tag option
				const parentOptionEl = container.createEl("label", {
					cls: "alrawi-multi-select-option alrawi-parent-tag",
					attr: { "data-value": parentTag },
				});

				const parentCheckbox = parentOptionEl.createEl("input", {
					type: "checkbox",
					value: parentTag,
				});
				parentCheckbox.checked = selectedValues.includes(parentTag);

				parentOptionEl.createEl("span", {
					text: parentTag,
					cls: "alrawi-multi-select-option-text",
				});

				// Handle checkbox change without closing dropdown
				parentCheckbox.addEventListener("change", (e) => {
					e.stopPropagation();
					this.handleCheckboxChange(
						parentCheckbox,
						parentTag,
						selectedValues,
						type
					);
				});

				// If this parent has children, add them with indentation
				const children = tagHierarchy[parentTag];
				if (children && children.length > 0) {
					children.sort().forEach((childTag) => {
						const fullChildTag = `${parentTag}/${childTag}`;
						const childOptionEl = container.createEl("label", {
							cls: "alrawi-multi-select-option alrawi-child-tag",
							attr: { "data-value": fullChildTag },
						});

						const childCheckbox = childOptionEl.createEl("input", {
							type: "checkbox",
							value: fullChildTag,
						});
						childCheckbox.checked =
							selectedValues.includes(fullChildTag);

						childOptionEl.createEl("span", {
							text: `${childTag}`,
							cls: "alrawi-multi-select-option-text",
						});

						// Handle checkbox change
						childCheckbox.addEventListener("change", (e) => {
							e.stopPropagation();
							this.handleCheckboxChange(
								childCheckbox,
								fullChildTag,
								selectedValues,
								type
							);
						});
					});
				}
			});
	}

	/**
	 * Renders hierarchical category options
	 * @param container - Container for options
	 * @param options - Available options
	 * @param selectedValues - Currently selected values
	 * @param type - Filter type
	 */
	private renderHierarchicalCategoryOptions(
		container: HTMLElement,
		options: string[],
		selectedValues: string[],
		type: string
	): void {
		// Create a hierarchical structure using SharedUtils helper
		const categoryHierarchy = this.organizeHierarchicalCategories(options);

		// Iterate through top-level categories first
		Object.keys(categoryHierarchy)
			.sort()
			.forEach((parentCategory) => {
				// Add parent category option
				const parentOptionEl = container.createEl("label", {
					cls: "alrawi-multi-select-option alrawi-parent-category",
					attr: { "data-value": parentCategory },
				});

				const parentCheckbox = parentOptionEl.createEl("input", {
					type: "checkbox",
					value: parentCategory,
				});
				parentCheckbox.checked =
					selectedValues.includes(parentCategory);

				parentOptionEl.createEl("span", {
					text: parentCategory,
					cls: "alrawi-multi-select-option-text",
				});

				// Handle checkbox change without closing dropdown
				parentCheckbox.addEventListener("change", (e) => {
					e.stopPropagation();
					this.handleCheckboxChange(
						parentCheckbox,
						parentCategory,
						selectedValues,
						type
					);
				});

				// If this parent has children, add them with indentation
				const children = categoryHierarchy[parentCategory];
				if (children && children.length > 0) {
					children.sort().forEach((childCategory: any) => {
						const fullChildCategory = `${parentCategory}/${childCategory}`;
						const childOptionEl = container.createEl("label", {
							cls: "alrawi-multi-select-option alrawi-child-category",
							attr: { "data-value": fullChildCategory },
						});

						const childCheckbox = childOptionEl.createEl("input", {
							type: "checkbox",
							value: fullChildCategory,
						});
						childCheckbox.checked =
							selectedValues.includes(fullChildCategory);

						childOptionEl.createEl("span", {
							text: `${childCategory}`,
							cls: "alrawi-multi-select-option-text",
						});

						// Handle checkbox change
						childCheckbox.addEventListener("change", (e) => {
							e.stopPropagation();
							this.handleCheckboxChange(
								childCheckbox,
								fullChildCategory,
								selectedValues,
								type
							);
						});
					});
				}
			});
	}

	/**
	 * Renders flat (non-hierarchical) options
	 * @param container - Container for options
	 * @param options - Available options
	 * @param selectedValues - Currently selected values
	 * @param type - Filter type
	 */
	private renderFlatOptions(
		container: HTMLElement,
		options: string[],
		selectedValues: string[],
		type: string
	): void {
		options.forEach((option) => {
			const optionEl = container.createEl("label", {
				cls: "alrawi-multi-select-option",
				attr: { "data-value": option },
			});

			const checkbox = optionEl.createEl("input", {
				type: "checkbox",
				value: option,
			});
			checkbox.checked = selectedValues.includes(option);

			optionEl.createEl("span", {
				text: option,
				cls: "alrawi-multi-select-option-text",
			});

			// Handle checkbox change without closing dropdown
			checkbox.addEventListener("change", (e) => {
				e.stopPropagation();
				this.handleCheckboxChange(
					checkbox,
					option,
					selectedValues,
					type
				);
			});
		});
	}

	/**
	 * Creates a multi-select filter for benefits
	 * @param container - Container element to render into
	 * @param label - Filter label
	 * @param type - Filter type
	 * @param options - Available options
	 * @param selectedValues - Currently selected values
	 */
	private createMultiSelectFilterForBenefits(
		container: HTMLElement,
		label: string,
		type: string,
		options: string[],
		selectedValues: string[]
	): void {
		const filterGroup = container.createEl("div", {
			cls: "alrawi-filter-group",
		});
		filterGroup.createEl("label", {
			text: label,
			cls: "alrawi-filter-label",
		});

		const selectContainer = filterGroup.createEl("div", {
			cls: "alrawi-multi-select-container",
		});

		// Search input
		const searchInput = selectContainer.createEl("input", {
			type: "text",
			cls: "alrawi-multi-select-search",
			placeholder: "ابحث...",
		});

		// Options container
		const optionsContainer = selectContainer.createEl("div", {
			cls: "alrawi-multi-select-options",
		});
		optionsContainer.style.display = "none";

		// Special handling for source type options
		["كتاب", "فيديو"].forEach((option) => {
			const sourceValue = option === "كتاب" ? "book" : "video";
			const optionEl = optionsContainer.createEl("label", {
				cls: "alrawi-multi-select-option",
				attr: { "data-value": sourceValue },
			});

			const checkbox = optionEl.createEl("input", {
				type: "checkbox",
				value: sourceValue,
			});
			checkbox.checked = selectedValues.includes(sourceValue);

			optionEl.createEl("span", {
				text: option,
				cls: "alrawi-multi-select-option-text",
			});

			checkbox.addEventListener("change", (e) => {
				e.stopPropagation();
				this.handleBenefitCheckboxChange(
					checkbox,
					sourceValue,
					selectedValues
				);
			});
		});

		// Search functionality
		searchInput.addEventListener("input", () => {
			const searchTerm = searchInput.value.toLowerCase();
			optionsContainer
				.querySelectorAll(".alrawi-multi-select-option")
				.forEach((option) => {
					const text =
						option
							.querySelector(".alrawi-multi-select-option-text")
							?.textContent?.toLowerCase() || "";
					const dataValue =
						option.getAttribute("data-value")?.toLowerCase() || "";
					const isVisible =
						text.includes(searchTerm) ||
						dataValue.includes(searchTerm);

					(option as HTMLElement).style.display = isVisible
						? "flex"
						: "none";
				});
		});

		// Toggle dropdown visibility
		searchInput.addEventListener("click", (e) => {
			e.stopPropagation();

			if (this.activeDropdown === type) {
				this.activeDropdown = null;
				optionsContainer.style.display = "none";
			} else {
				this.closeAllDropdowns();
				this.activeDropdown = type;
				optionsContainer.style.display = "block";
			}
		});

		// Close dropdown when clicking outside
		document.addEventListener("click", (e) => {
			if (!selectContainer.contains(e.target as Node)) {
				optionsContainer.style.display = "none";
				if (this.activeDropdown === type) {
					this.activeDropdown = null;
				}
			}
		});
	}

	/**
	 * Creates a sources filter for benefits
	 * @param container - Container element to render into
	 */
	private async createSourcesFilter(container: HTMLElement): Promise<void> {
		const filterGroup = container.createEl("div", {
			cls: "alrawi-filter-group",
		});
		filterGroup.createEl("label", {
			text: "المصادر",
			cls: "alrawi-filter-label",
		});

		const selectContainer = filterGroup.createEl("div", {
			cls: "alrawi-multi-select-container",
		});

		// Search input
		const searchInput = selectContainer.createEl("input", {
			type: "text",
			cls: "alrawi-multi-select-search",
			placeholder: "ابحث في المصادر...",
		});

		// Options container
		const optionsContainer = selectContainer.createEl("div", {
			cls: "alrawi-multi-select-options",
		});
		optionsContainer.style.display = "none";

		// Get sources with counts
		const sourcesWithCounts =
			await this.props.dataService.getBenefitSources();
		const benefitFilterState = this.props.filterState.getBenefitsState();

		// Create options for each source
		sourcesWithCounts.forEach((source) => {
			const optionEl = optionsContainer.createEl("label", {
				cls: "alrawi-multi-select-option",
				attr: { "data-value": source.path },
			});

			const checkbox = optionEl.createEl("input", {
				type: "checkbox",
				value: source.path,
			});
			checkbox.checked = benefitFilterState.sources.includes(source.path);

			// Create the label with source title and count
			const labelSpan = optionEl.createEl("span", {
				cls: "alrawi-multi-select-option-text",
			});

			labelSpan.createEl("span", {
				text: source.title,
				cls: "alrawi-source-title",
			});

			labelSpan.createEl("span", {
				text: ` (${source.count} فائدة)`,
				cls: "alrawi-source-count",
			});

			// Show source type icon
			const typeIcon = optionEl.createEl("span", {
				cls: `alrawi-source-type-icon alrawi-source-${source.type}`,
			});
			setIcon(typeIcon, source.type === "book" ? "book" : "play-circle");

			checkbox.addEventListener("change", (e) => {
				e.stopPropagation();
				this.handleSourceCheckboxChange(checkbox, source.path);
			});
		});

		// Search functionality
		searchInput.addEventListener("input", () => {
			const searchTerm = searchInput.value.toLowerCase();
			optionsContainer
				.querySelectorAll(".alrawi-multi-select-option")
				.forEach((option) => {
					const text =
						option
							.querySelector(".alrawi-source-title")
							?.textContent?.toLowerCase() || "";
					const isVisible = text.includes(searchTerm);
					(option as HTMLElement).style.display = isVisible
						? "flex"
						: "none";
				});
		});

		// Toggle dropdown
		searchInput.addEventListener("click", (e) => {
			e.stopPropagation();

			if (this.activeDropdown === "sources") {
				this.activeDropdown = null;
				optionsContainer.style.display = "none";
			} else {
				this.closeAllDropdowns();
				this.activeDropdown = "sources";
				optionsContainer.style.display = "block";
			}
		});

		// Close dropdown when clicking outside
		document.addEventListener("click", (e) => {
			if (!selectContainer.contains(e.target as Node)) {
				optionsContainer.style.display = "none";
				if (this.activeDropdown === "sources") {
					this.activeDropdown = null;
				}
			}
		});
	}

	/**
	 * Renders the date range filter
	 * @param container - Container element to render into
	 */
	private renderDateRangeFilter(container: HTMLElement): void {
		const filterState = this.props.filterState.getVideoAndBookState();
		const dateFilter = container.createEl("div", {
			cls: "alrawi-filter-group",
		});
		dateFilter.createEl("label", {
			text: "تاريخ الإضافة",
			cls: "alrawi-filter-label",
		});

		const dateContainer = dateFilter.createEl("div", {
			cls: "alrawi-date-range",
		});

		const fromInput = dateContainer.createEl("input", {
			type: "date",
			cls: "alrawi-date-input",
			value: filterState.dateRange.from || "",
		});
		fromInput.addEventListener("change", () => {
			this.props.filterState.updateVideoAndBookState({
				dateRange: { ...filterState.dateRange, from: fromInput.value },
				page: 1,
			});
			this.props.onFilterChange();
		});

		dateContainer.createEl("span", { text: "إلى" });

		const toInput = dateContainer.createEl("input", {
			type: "date",
			cls: "alrawi-date-input",
			value: filterState.dateRange.to || "",
		});
		toInput.addEventListener("change", () => {
			this.props.filterState.updateVideoAndBookState({
				dateRange: { ...filterState.dateRange, to: toInput.value },
				page: 1,
			});
			this.props.onFilterChange();
		});
	}

	/**
	 * Renders the benefits date range filter
	 * @param container - Container element to render into
	 */
	private renderBenefitsDateRangeFilter(container: HTMLElement): void {
		const benefitFilterState = this.props.filterState.getBenefitsState();
		const dateFilter = container.createEl("div", {
			cls: "alrawi-filter-group",
		});
		dateFilter.createEl("label", {
			text: "تاريخ الإضافة",
			cls: "alrawi-filter-label",
		});

		const dateContainer = dateFilter.createEl("div", {
			cls: "alrawi-date-range",
		});

		const fromInput = dateContainer.createEl("input", {
			type: "date",
			cls: "alrawi-date-input",
			value: benefitFilterState.dateRange.from || "",
		});
		fromInput.addEventListener("change", () => {
			this.props.filterState.updateBenefitsState({
				dateRange: {
					...benefitFilterState.dateRange,
					from: fromInput.value,
				},
				page: 1,
			});
			this.props.onFilterChange();
		});

		dateContainer.createEl("span", { text: "إلى" });

		const toInput = dateContainer.createEl("input", {
			type: "date",
			cls: "alrawi-date-input",
			value: benefitFilterState.dateRange.to || "",
		});
		toInput.addEventListener("change", () => {
			this.props.filterState.updateBenefitsState({
				dateRange: {
					...benefitFilterState.dateRange,
					to: toInput.value,
				},
				page: 1,
			});
			this.props.onFilterChange();
		});
	}

	/**
	 * Renders the search bar
	 * @param container - Container element to render into
	 */
	private renderSearchBar(container: HTMLElement): void {
		const filterState = this.props.filterState.getVideoAndBookState();
		const searchContainer = container.createEl("div", {
			cls: "alrawi-search-container",
		});
		this.searchInput = new SearchComponent(searchContainer);
		this.searchInput.setPlaceholder(
			this.props.contentType === CONTENT_TYPE.VIDEOS
				? "ابحث عن فيديوهات أو سلاسل..."
				: "ابحث عن كتب..."
		);
		this.searchInput.setValue(filterState.searchQuery);

		// Use debounce to prevent too many renders during typing
		this.searchInput.onChange(
			this.debounce((value: string) => {
				this.props.filterState.updateVideoAndBookState({
					searchQuery: value,
					page: 1,
				});
				this.props.onFilterChange();
			}, 300)
		);
	}

	/**
	 * Renders the benefits search bar
	 * @param container - Container element to render into
	 */
	private renderBenefitsSearchBar(container: HTMLElement): void {
		const benefitFilterState = this.props.filterState.getBenefitsState();
		const searchContainer = container.createEl("div", {
			cls: "alrawi-search-container",
		});
		this.searchInput = new SearchComponent(searchContainer);
		this.searchInput.setPlaceholder("ابحث في الفوائد...");
		this.searchInput.setValue(benefitFilterState.searchQuery);

		// Use debounce to prevent too many renders during typing
		this.searchInput.onChange(
			this.debounce((value: string) => {
				this.props.filterState.updateBenefitsState({
					searchQuery: value,
					page: 1,
				});
				this.props.onFilterChange();
			}, 300)
		);
	}

	/**
	 * Handles checkbox change in multi-select filters
	 * @param checkbox - Checkbox element
	 * @param option - Option value
	 * @param selectedValues - Array of selected values to update
	 * @param type - Filter type
	 */
	private handleCheckboxChange(
		checkbox: HTMLInputElement,
		option: string,
		selectedValues: string[],
		type: string
	): void {
		if (checkbox.checked) {
			if (!selectedValues.includes(option)) {
				selectedValues.push(option);
			}
		} else {
			const index = selectedValues.indexOf(option);
			if (index > -1) {
				selectedValues.splice(index, 1);
			}
		}

		// Update filter state based on filter type
		if (this.props.contentType === CONTENT_TYPE.BENEFITS) {
			let updateObj: any = { page: 1 };

			if (type === "category") updateObj.categories = selectedValues;
			else if (type === "tag") updateObj.tags = selectedValues;

			this.props.filterState.updateBenefitsState(updateObj);
		} else {
			let updateObj: any = { page: 1 };

			if (type === "status") updateObj.statuses = selectedValues;
			else if (type === "presenter" || type === "author")
				updateObj.presenters = selectedValues;
			else if (type === "type") updateObj.types = selectedValues;
			// Here's the fix - update the correct field based on content type
			else if (type === "category") {
				if (this.props.contentType === CONTENT_TYPE.BOOKS) {
					updateObj.types = selectedValues; // Update types for books
				} else {
					updateObj.categories = selectedValues; // Update categories for videos
				}
			} else if (type === "tag") updateObj.tags = selectedValues;

			this.props.filterState.updateVideoAndBookState(updateObj);
		}

		this.props.onFilterChange();
	}

	/**
	 * Handles benefit checkbox change
	 * @param checkbox - Checkbox element
	 * @param option - Option value
	 * @param selectedValues - Array of selected values
	 */
	private handleBenefitCheckboxChange(
		checkbox: HTMLInputElement,
		option: string,
		selectedValues: string[]
	): void {
		if (checkbox.checked) {
			if (!selectedValues.includes(option)) {
				selectedValues.push(option);
			}
		} else {
			const index = selectedValues.indexOf(option);
			if (index > -1) {
				selectedValues.splice(index, 1);
			}
		}

		// Update filter state
		this.props.filterState.updateBenefitsState({
			sourceTypes: selectedValues,
			page: 1,
		});

		this.props.onFilterChange();
	}

	/**
	 * Handles source checkbox change
	 * @param checkbox - Checkbox element
	 * @param source - Source path
	 */
	private handleSourceCheckboxChange(
		checkbox: HTMLInputElement,
		source: string
	): void {
		const benefitFilterState = this.props.filterState.getBenefitsState();

		if (checkbox.checked) {
			if (!benefitFilterState.sources.includes(source)) {
				benefitFilterState.sources.push(source);
			}
		} else {
			const index = benefitFilterState.sources.indexOf(source);
			if (index > -1) {
				benefitFilterState.sources.splice(index, 1);
			}
		}

		this.props.filterState.updateBenefitsState({
			sources: benefitFilterState.sources,
			page: 1,
		});

		this.props.onFilterChange();
	}

	/**
	 * Organizes tags into a hierarchical structure
	 * @param tags - Flat array of tags
	 * @returns Object mapping parent tags to arrays of child tags
	 */
	private organizeHierarchicalTags(tags: string[]): {
		[key: string]: string[];
	} {
		const tagHierarchy: { [key: string]: string[] } = {};

		tags.forEach((tag) => {
			const parts = tag.split("/");
			if (parts.length > 1) {
				// This is a hierarchical tag
				const parent = parts[0];
				const child = parts.slice(1).join("/"); // In case there are deeper hierarchies

				if (!tagHierarchy[parent]) {
					tagHierarchy[parent] = [];
				}
				tagHierarchy[parent].push(child);
			} else {
				// Top-level tag
				if (!tagHierarchy[tag]) {
					tagHierarchy[tag] = [];
				}
			}
		});

		return tagHierarchy;
	}

	/**
	 * Organizes categories into a hierarchical structure
	 * @param categories - Flat array of categories
	 * @returns Object mapping parent categories to arrays of child categories
	 */
	private organizeHierarchicalCategories(categories: string[]): {
		[key: string]: string[];
	} {
		const categoryHierarchy: { [key: string]: string[] } = {};

		categories.forEach((category) => {
			const parts = category.split("/");
			if (parts.length > 1) {
				// This is a hierarchical category
				const parent = parts[0];
				const child = parts.slice(1).join("/"); // In case there are deeper hierarchies

				if (!categoryHierarchy[parent]) {
					categoryHierarchy[parent] = [];
				}
				categoryHierarchy[parent].push(child);
			} else {
				// Top-level category
				if (!categoryHierarchy[category]) {
					categoryHierarchy[category] = [];
				}
			}
		});

		return categoryHierarchy;
	}

	/**
	 * Updates filter options based on dynamic filtering
	 */
	private updateFilterOptions(): void {
		for (const [type, container] of this.optionsContainers.entries()) {
			// Get the currently selected values
			let selectedValues: string[] = [];

			if (this.props.contentType === CONTENT_TYPE.BENEFITS) {
				const benefitState = this.props.filterState.getBenefitsState();
				if (type === "category")
					selectedValues = benefitState.categories;
				else if (type === "sourceType")
					selectedValues = benefitState.sourceTypes;
				else if (type === "tag") selectedValues = benefitState.tags;
				else if (type === "source")
					selectedValues = benefitState.sources;
			} else {
				const standardState =
					this.props.filterState.getVideoAndBookState();
				if (type === "status") selectedValues = standardState.statuses;
				else if (type === "presenter" || type === "author")
					selectedValues = standardState.presenters;
				else if (type === "type")
					selectedValues = standardState.types || [];
				else if (type === "category")
					selectedValues = standardState.categories || [];
				else if (type === "tag") selectedValues = standardState.tags;
			}

			// Get available options
			const availableOptions = this.props.filterState.getAvailableOptions(
				this.props.contentType,
				type
			);

			// Add selected values to ensure they're always shown even if they're not in available options
			const mergedOptions = [
				...new Set([...availableOptions, ...selectedValues]),
			];

			// Clear existing options
			container.empty();

			// Render new options
			if (type === "tag") {
				this.renderHierarchicalTagOptions(
					container,
					mergedOptions,
					selectedValues,
					type
				);
			} else if (type === "category") {
				this.renderHierarchicalCategoryOptions(
					container,
					mergedOptions,
					selectedValues,
					type
				);
			} else if (type === "sourceType") {
				// Special handling for source types
				const validSourceTypes = [
					...new Set([
						...availableOptions,
						...selectedValues.map((v) =>
							v === "book" ? "كتاب" : "فيديو"
						),
					]),
				];

				validSourceTypes.forEach((option) => {
					const sourceValue = option === "كتاب" ? "book" : "video";
					const optionEl = container.createEl("label", {
						cls: "alrawi-multi-select-option",
						attr: { "data-value": sourceValue },
					});

					const checkbox = optionEl.createEl("input", {
						type: "checkbox",
						value: sourceValue,
					});
					checkbox.checked = selectedValues.includes(sourceValue);

					optionEl.createEl("span", {
						text: option,
						cls: "alrawi-multi-select-option-text",
					});

					checkbox.addEventListener("change", (e) => {
						e.stopPropagation();
						this.handleBenefitCheckboxChange(
							checkbox,
							sourceValue,
							selectedValues
						);
					});
				});
			} else {
				this.renderFlatOptions(
					container,
					mergedOptions,
					selectedValues,
					type
				);
			}
		}
	}

	/**
	 * Closes all open dropdowns
	 */
	private closeAllDropdowns(): void {
		this.activeDropdown = null;
		document
			.querySelectorAll(".alrawi-multi-select-options")
			.forEach((el) => {
				(el as HTMLElement).style.display = "none";
			});
	}

	/**
	 * Creates a debounced function
	 * @param func - Function to debounce
	 * @param wait - Debounce delay in ms
	 * @returns Debounced function
	 */
	private debounce<T extends (...args: any[]) => any>(
		func: T,
		wait: number
	): (...args: Parameters<T>) => void {
		let timeout: number | null = null;

		return (...args: Parameters<T>): void => {
			const later = () => {
				timeout = null;
				func(...args);
			};

			if (timeout !== null) {
				clearTimeout(timeout);
			}

			timeout = window.setTimeout(later, wait);
		};
	}

	/**
	 * Clean up resources
	 */
	public destroy(): void {
		// Cleanup state subscriptions
		this.stateUnsubscribes.forEach((unsubscribe) => unsubscribe());
		this.stateUnsubscribes = [];

		// Clear dropdowns map
		this.dropdowns.clear();
		this.optionsContainers.clear();

		// Clear search timeout if active
		if (this.searchTimeout) {
			clearTimeout(this.searchTimeout);
			this.searchTimeout = null;
		}
	}
}
