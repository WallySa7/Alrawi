// src/views/unifiedView/content/books/BookRenderer.ts
import { BaseContentRenderer, BaseRendererProps } from "../BaseContentRenderer";
import { BookItem } from "../../../../types";
import { BookStats } from "./BookStats";
import { BookTable } from "./BookTable";
import { BookCard } from "./BookCard";
import { VIEW_MODE } from "../../constants";
import { SelectionState } from "../../state/SelectionState";

/**
 * Props for the BookRenderer
 */
export interface BookRendererProps extends BaseRendererProps {
	books: BookItem[];
	authors: string[];
	categories: string[];
	tags: string[];
	selectionState: SelectionState;
}

/**
 * Enhanced book renderer with optimized rendering
 */
export class BookRenderer extends BaseContentRenderer<
	BookItem,
	BookRendererProps
> {
	// References to rendered components for partial updates
	private statsComponent: BookStats | null = null;
	private contentComponent: BookTable | BookCard | null = null;

	/**
	 * Renders statistics about books
	 * @param container - Container to render into
	 */
	protected renderStats(container: HTMLElement): void {
		const statsContainer = container.createEl("div", {
			cls: "alrawi-stats-section",
		});

		this.statsComponent = new BookStats({
			...this.props,
			books: this.props.books,
		});

		this.statsComponent.render(statsContainer);
	}

	/**
	 * Renders book content based on view mode
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
	 * Renders books in table view
	 * @param container - Container to render into
	 */
	private renderTableView(container: HTMLElement): void {
		// Clean up previous component if needed
		if (
			this.contentComponent &&
			this.contentComponent instanceof BookCard
		) {
			this.contentComponent = null;
		}

		this.contentComponent = new BookTable({
			...this.props,
			books: this.filteredItems,
			selectionState: this.props.selectionState,
			onRefresh: this.props.onRefresh,
		});

		this.contentComponent.render(container);
	}

	/**
	 * Renders books in card view
	 * @param container - Container to render into
	 */
	private renderCardView(container: HTMLElement): void {
		// Clean up previous component if needed
		if (
			this.contentComponent &&
			this.contentComponent instanceof BookTable
		) {
			this.contentComponent = null;
		}

		this.contentComponent = new BookCard({
			...this.props,
			books: this.filteredItems,
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
	 * Gets filtered books based on filter state
	 * @returns Filtered array of books
	 */
	protected getFilteredItemsInternal(): BookItem[] {
		const books = [...this.props.books];
		const filterState = this.props.filterState.getVideoAndBookState();

		// Apply filters
		let filteredBooks = books;

		// Status filter
		if (filterState.statuses.length > 0) {
			filteredBooks = filteredBooks.filter((book) =>
				filterState.statuses.includes(book.status || "")
			);
		}

		// Author/presenter filter
		if (filterState.presenters.length > 0) {
			filteredBooks = filteredBooks.filter((book) =>
				filterState.presenters.includes(book.author)
			);
		}

		// Categories filter (using types in filter state)
		if (filterState.types.length > 0) {
			filteredBooks = filteredBooks.filter(
				(book) =>
					book.categories &&
					book.categories.some(
						(category) =>
							// Direct match
							filterState.types.includes(category) ||
							// Parent category match (selected parent category matches this category's parent)
							filterState.types.some((filterCategory) =>
								category.startsWith(filterCategory + "/")
							) ||
							// Child category match (this category is a parent of selected category)
							filterState.types.some((filterCategory) =>
								filterCategory.startsWith(category + "/")
							)
					)
			);
		}

		// Updated tag filtering to support hierarchical tags
		if (filterState.tags.length > 0) {
			filteredBooks = filteredBooks.filter(
				(book) =>
					book.tags &&
					book.tags.some(
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

		// Apply date range filter
		if (filterState.dateRange.from || filterState.dateRange.to) {
			filteredBooks = filteredBooks.filter((book) => {
				if (!book.dateAdded) return false;

				const itemDate = new Date(book.dateAdded);
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

		// Apply search query
		if (filterState.searchQuery) {
			const query = filterState.searchQuery.toLowerCase();
			filteredBooks = filteredBooks.filter(
				(book) =>
					book.title.toLowerCase().includes(query) ||
					book.author.toLowerCase().includes(query) ||
					(book.publisher &&
						book.publisher.toLowerCase().includes(query)) ||
					(book.isbn && book.isbn.toLowerCase().includes(query)) ||
					(book.tags &&
						book.tags.some((tag) =>
							tag.toLowerCase().includes(query)
						)) ||
					(book.categories &&
						book.categories.some((cat) =>
							cat.toLowerCase().includes(query)
						))
			);
		}

		// Apply sorting
		return this.applySorting(filteredBooks);
	}

	/**
	 * Applies sorting to books
	 * @param books - Books to sort
	 * @returns Sorted array of books
	 */
	private applySorting(books: BookItem[]): BookItem[] {
		const filterState = this.props.filterState.getVideoAndBookState();

		if (!filterState.sortBy) return books;

		return [...books].sort((a, b) => {
			let aValue: any, bValue: any;

			// Determine sort values based on sort field
			switch (filterState.sortBy) {
				case "title":
					aValue = a.title;
					bValue = b.title;
					break;
				case "author":
					aValue = a.author;
					bValue = b.author;
					break;
				case "status":
					aValue = a.status || "";
					bValue = b.status || "";
					break;
				case "pages":
					aValue = a.pages || 0;
					bValue = b.pages || 0;
					break;
				case "pagesRead":
					aValue = a.pagesRead || 0;
					bValue = b.pagesRead || 0;
					break;
				case "rating":
					aValue = a.rating || 0;
					bValue = b.rating || 0;
					break;
				case "dateAdded":
					aValue = a.dateAdded ? new Date(a.dateAdded).getTime() : 0;
					bValue = b.dateAdded ? new Date(b.dateAdded).getTime() : 0;
					break;
				case "isbn":
					aValue = a.isbn || "";
					bValue = b.isbn || "";
					break;
				case "publisher":
					aValue = a.publisher || "";
					bValue = b.publisher || "";
					break;
				case "publishYear":
					aValue = a.publishYear || 0;
					bValue = b.publishYear || 0;
					break;
				case "startDate":
					aValue = a.startDate ? new Date(a.startDate).getTime() : 0;
					bValue = b.startDate ? new Date(b.startDate).getTime() : 0;
					break;
				case "completionDate":
					aValue = a.completionDate
						? new Date(a.completionDate).getTime()
						: 0;
					bValue = b.completionDate
						? new Date(b.completionDate).getTime()
						: 0;
					break;
				case "language":
					aValue = a.language || "";
					bValue = b.language || "";
					break;
				case "categories":
					aValue =
						a.categories && a.categories.length > 0
							? a.categories[0]
							: "";
					bValue =
						b.categories && b.categories.length > 0
							? b.categories[0]
							: "";
					break;
				case "tags":
					aValue = a.tags && a.tags.length > 0 ? a.tags[0] : "";
					bValue = b.tags && b.tags.length > 0 ? b.tags[0] : "";
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
		const authors = new Set<string>();
		const categories = new Set<string>();
		const tags = new Set<string>();

		this.filteredItems.forEach((book) => {
			// Add status
			if (book.status) statuses.add(book.status);

			// Add author
			if (book.author) authors.add(book.author);

			// Add categories
			if (book.categories && Array.isArray(book.categories)) {
				book.categories.forEach((category) => categories.add(category));
			}

			// Add tags
			if (book.tags && Array.isArray(book.tags)) {
				book.tags.forEach((tag) => tags.add(tag));
			}
		});

		// Update available options in filter state
		this.props.filterState.setAvailableBookOptions({
			statuses: Array.from(statuses),
			presenters: Array.from(authors), // authors are stored as presenters in the filter state
			types: Array.from(categories), // categories are stored as types in the filter state
			tags: Array.from(tags),
		});
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
