// src/views/unifiedView/components/EnhancedPagination.ts
import { ComponentProps } from "../types";
import { PAGE_SIZE_OPTIONS } from "../constants";
import { FilterState, FilterStateEvents } from "../state/FilterState";

interface EnhancedPaginationProps extends ComponentProps {
    totalItems: number;
    filterState: FilterState;
    onPageChange: () => Promise<void>;
}

/**
 * Enhanced pagination component with optimized updates
 */
export class Pagination {
    private props: EnhancedPaginationProps;
    private container: HTMLElement | null = null;
    private pageInfoEl: HTMLElement | null = null;
    private prevBtn: HTMLButtonElement | null = null;
    private nextBtn: HTMLButtonElement | null = null;
    private itemsPerPageSelect: HTMLSelectElement | null = null;
    private pageInputEl: HTMLInputElement | null = null;
    private totalPagesEl: HTMLElement | null = null;
    private stateUnsubscribes: (() => void)[] = [];
    
    /**
     * Creates a new EnhancedPagination component
     * @param props - Component props
     */
    constructor(props: EnhancedPaginationProps) {
        this.props = props;
        
        // Subscribe to filter state changes
        const unsubscribeFilter = this.props.filterState.subscribe(
            this.props.contentType === 'benefits' ? 
                FilterStateEvents.BENEFITS_STATE_UPDATED : 
                FilterStateEvents.VIDEO_BOOK_STATE_UPDATED,
            () => {
                this.updatePagination();
            }
        );
        
        this.stateUnsubscribes.push(unsubscribeFilter);
    }
    
    /**
     * Renders the pagination controls
     * @param container - Container to render into
     */
    public render(container: HTMLElement): void {
        this.container = container;
        
        const pagination = container.createEl('div', { cls: 'alrawi-pagination' });
        
        // Items per page selector
        this.renderItemsPerPageSelector(pagination);
        
        // Page info
        this.pageInfoEl = pagination.createEl('div', { cls: 'alrawi-page-info' });
        
        // Navigation controls
        const pageNav = pagination.createEl('div', { cls: 'alrawi-page-nav' });
        
        // Previous page button
        this.prevBtn = pageNav.createEl('button', {
            cls: 'alrawi-page-btn',
            text: 'السابق',
        });
        
        // Page input and total pages
        const pageInputContainer = pageNav.createEl('div', { cls: 'alrawi-page-input-container' });
        
        // Add page input
        this.pageInputEl = pageInputContainer.createEl('input', {
            cls: 'alrawi-page-input',
            type: 'number',
            attr: {
                min: '1',
            }
        });
        
        pageInputContainer.createEl('span', { text: ' من ' });
        
        // Total pages display
        this.totalPagesEl = pageInputContainer.createEl('span', { cls: 'alrawi-total-pages' });
        
        // Next page button
        this.nextBtn = pageNav.createEl('button', {
            cls: 'alrawi-page-btn',
            text: 'التالي',
        });
        
        // Set up event handlers
        this.setupEventHandlers();
        
        // Initialize display
        this.updatePagination();
    }
    
    /**
     * Sets up event handlers for pagination controls
     */
    private setupEventHandlers(): void {
        if (!this.prevBtn || !this.nextBtn || !this.pageInputEl || !this.itemsPerPageSelect) return;
        
        // Previous page button
        this.prevBtn.addEventListener('click', () => {
            this.goToPreviousPage();
        });
        
        // Next page button
        this.nextBtn.addEventListener('click', () => {
            this.goToNextPage();
        });
        
        // Page input
        this.pageInputEl.addEventListener('change', () => {
            this.handlePageInputChange();
        });
        
        // Items per page selector
        this.itemsPerPageSelect.addEventListener('change', () => {
            this.handleItemsPerPageChange();
        });
        
        // Handle keyboard navigation
        document.addEventListener('keydown', this.handleKeyboardNavigation);
    }
    
    /**
     * Handles keyboard navigation
     * @param e - Keyboard event
     */
    private handleKeyboardNavigation = (e: KeyboardEvent): void => {
        // Only handle if not in an input field
        if (document.activeElement?.tagName === 'INPUT' || 
            document.activeElement?.tagName === 'TEXTAREA' ||
            document.activeElement?.tagName === 'SELECT') {
            return;
        }
        
        const filterState = this.getFilterState();
        
        // If ArrowRight key was pressed, go to previous page (RTL pagination)
        if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            if (filterState.page > 1) {
                this.goToPreviousPage();
                e.preventDefault();
            }
        }
        
        // If ArrowLeft key was pressed, go to next page (RTL pagination)
        else if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const totalPages = Math.ceil(this.props.totalItems / filterState.itemsPerPage);
            if (filterState.page < totalPages) {
                this.goToNextPage();
                e.preventDefault();
            }
        }
    }
    
    /**
     * Renders the items per page selector
     * @param container - Container to render into
     */
    private renderItemsPerPageSelector(container: HTMLElement): void {
        const itemsPerPageContainer = container.createEl('div', { cls: 'alrawi-items-per-page' });
        itemsPerPageContainer.createEl('span', { text: 'العناصر لكل صفحة:' });
        
        const filterState = this.getFilterState();
        
        this.itemsPerPageSelect = itemsPerPageContainer.createEl('select', { 
            cls: 'alrawi-items-select'
        });
        
        PAGE_SIZE_OPTIONS.forEach(num => {
            const option = this.itemsPerPageSelect!.createEl('option', { 
                value: num.toString(),
                text: num.toString()
            });
            if (num === filterState.itemsPerPage) {
                option.selected = true;
            }
        });
    }
    
    /**
     * Updates the pagination display
     */
    private updatePagination(): void {
        if (!this.pageInfoEl || !this.prevBtn || !this.nextBtn || 
            !this.pageInputEl || !this.totalPagesEl) {
            return;
        }
        
        const filterState = this.getFilterState();
        const totalPages = Math.ceil(this.props.totalItems / filterState.itemsPerPage);
        const currentPage = Math.min(Math.max(1, filterState.page), Math.max(1, totalPages));
        
        // Calculate start and end items
        const startItem = (currentPage - 1) * filterState.itemsPerPage + 1;
        const endItem = Math.min(currentPage * filterState.itemsPerPage, this.props.totalItems);
        
        // Update page info
        this.pageInfoEl.textContent = `عرض ${startItem}-${endItem} من ${this.props.totalItems}`;
        
        // Update page input and total pages
        this.pageInputEl.value = currentPage.toString();
        this.pageInputEl.max = totalPages.toString();
        this.totalPagesEl.textContent = totalPages.toString();
        
        // Update navigation buttons state
        this.prevBtn.disabled = currentPage === 1;
        this.nextBtn.disabled = currentPage >= totalPages;
        
        // Update items per page select
        if (this.itemsPerPageSelect) {
            const selectedOption = this.itemsPerPageSelect.querySelector(`option[value="${filterState.itemsPerPage}"]`);
            if (selectedOption) {
                (selectedOption as HTMLOptionElement).selected = true;
            }
        }
    }
    
    /**
     * Goes to the previous page
     */
    private goToPreviousPage(): void {
        const filterState = this.getFilterState();
        
        if (filterState.page > 1) {
            this.updateFilterState({ page: filterState.page - 1 });
            this.props.onPageChange();
        }
    }
    
    /**
     * Goes to the next page
     */
    private goToNextPage(): void {
        const filterState = this.getFilterState();
        const totalPages = Math.ceil(this.props.totalItems / filterState.itemsPerPage);
        
        if (filterState.page < totalPages) {
            this.updateFilterState({ page: filterState.page + 1 });
            this.props.onPageChange();
        }
    }
    
    /**
     * Handles page input change
     */
    private handlePageInputChange(): void {
        if (!this.pageInputEl) return;
        
        const filterState = this.getFilterState();
        const totalPages = Math.ceil(this.props.totalItems / filterState.itemsPerPage);
        
        // Parse the input value
        let newPage = parseInt(this.pageInputEl.value);
        
        // Validate the new page
        if (isNaN(newPage) || newPage < 1) {
            newPage = 1;
        } else if (newPage > totalPages) {
            newPage = totalPages;
        }
        
        // Update the filter state if changed
        if (newPage !== filterState.page) {
            this.updateFilterState({ page: newPage });
            this.props.onPageChange();
        }
        
        // Always update the input to ensure valid display
        this.pageInputEl.value = newPage.toString();
    }
    
    /**
     * Handles items per page change
     */
    private handleItemsPerPageChange(): void {
        if (!this.itemsPerPageSelect) return;
        
        const filterState = this.getFilterState();
        const newItemsPerPage = parseInt(this.itemsPerPageSelect.value);
        
        if (newItemsPerPage !== filterState.itemsPerPage) {
            // When changing items per page, reset to first page
            this.updateFilterState({ 
                itemsPerPage: newItemsPerPage,
                page: 1 
            });
            
            this.props.onPageChange();
        }
    }
    
    /**
     * Gets the appropriate filter state based on content type
     * @returns Filter state object
     */
    private getFilterState(): any {
        return this.props.contentType === 'benefits' 
            ? this.props.filterState.getBenefitsState() 
            : this.props.filterState.getVideoAndBookState();
    }
    
    /**
     * Updates the filter state based on content type
     * @param update - Partial state update
     */
    private updateFilterState(update: any): void {
        if (this.props.contentType === 'benefits') {
            this.props.filterState.updateBenefitsState(update);
        } else {
            this.props.filterState.updateVideoAndBookState(update);
        }
    }
    
    /**
     * Destroys the component and cleans up resources
     */
    public destroy(): void {
        // Unsubscribe from state events
        this.stateUnsubscribes.forEach(unsubscribe => unsubscribe());
        
        // Remove keyboard event listener
        document.removeEventListener('keydown', this.handleKeyboardNavigation);
        
        // Clear references
        this.container = null;
        this.pageInfoEl = null;
        this.prevBtn = null;
        this.nextBtn = null;
        this.pageInputEl = null;
        this.totalPagesEl = null;
        this.itemsPerPageSelect = null;
    }
}