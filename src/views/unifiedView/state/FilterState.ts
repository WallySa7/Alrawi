// src/views/unifiedView/state/EnhancedFilterState.ts
import { FilterState as OriginalFilterState, BenefitFilterState } from "../../../types";
import { EventEmitter } from "../state/EventEmitter";

// Event types for filter state changes
export enum FilterStateEvents {
    VIDEO_BOOK_STATE_UPDATED = 'videoBookStateUpdated',
    BENEFITS_STATE_UPDATED = 'benefitsStateUpdated',
    AVAILABLE_OPTIONS_UPDATED = 'availableOptionsUpdated',
}

/**
 * Enhanced filter state with event emitter for optimized rendering
 * Manages filter state for different content types and notifies subscribers of changes
 */
export class FilterState {
    // Event emitter for state changes
    private events: EventEmitter = new EventEmitter();
    
    // Standard filter state for videos and books
    private videoAndBookState: OriginalFilterState;
    
    // Benefits filter state
    private benefitsState: BenefitFilterState;
    
    // Available options for dynamic filtering
    private availableVideoOptions: {
        statuses: Set<string>;
        presenters: Set<string>;
        types: Set<string>;
        categories: Set<string>;
        tags: Set<string>;
    } = {
        statuses: new Set(),
        presenters: new Set(),
        types: new Set(),
        categories: new Set(),
        tags: new Set()
    };
    
    private availableBookOptions: {
        statuses: Set<string>;
        presenters: Set<string>; // authors
        types: Set<string>; // categories
        tags: Set<string>;
    } = {
        statuses: new Set(),
        presenters: new Set(),
        types: new Set(),
        tags: new Set()
    };
    
    private availableBenefitOptions: {
        categories: Set<string>;
        sourceTypes: Set<string>;
        tags: Set<string>;
        sources: Set<string>;
    } = {
        categories: new Set(),
        sourceTypes: new Set(),
        tags: new Set(),
        sources: new Set()
    };
    
    constructor() {
        this.videoAndBookState = this.getDefaultFilterState();
        this.benefitsState = this.getDefaultBenefitFilterState();
    }
    
    /**
     * Subscribe to filter state events
     * @param event - Event to subscribe to
     * @param callback - Function to call when event occurs
     * @returns Unsubscribe function
     */
    public subscribe(event: FilterStateEvents, callback: Function): () => void {
        return this.events.on(event, callback);
    }
    
    /**
     * Creates the default filter state for videos and books
     */
    private getDefaultFilterState(): OriginalFilterState {
        return {
            statuses: [],
            presenters: [],
            types: [],
            categories: [],
            tags: [],
            dateRange: {
                from: null,
                to: null
            },
            searchQuery: '',
            page: 1,
            itemsPerPage: 10,
            sortBy: 'dateAdded',
            sortOrder: 'desc'
        };
    }
    
    /**
     * Creates the default filter state for benefits
     */
    private getDefaultBenefitFilterState(): BenefitFilterState {
        return {
            categories: [],
            sourceTypes: [],
            tags: [],
            sources: [],
            dateRange: {
                from: null,
                to: null
            },
            searchQuery: '',
            page: 1,
            itemsPerPage: 10,
            sortBy: 'dateAdded',
            sortOrder: 'desc'
        };
    }
    

    
    /**
     * Resets the filter state for the specified content type
     * @param contentType - Content type to reset filters for
     */
    public reset(contentType: 'videos' | 'books' | 'benefits' = 'videos'): void {
        if (contentType === 'benefits') {
            const itemsPerPage = this.benefitsState.itemsPerPage;
            const sortBy = this.benefitsState.sortBy;
            const sortOrder = this.benefitsState.sortOrder;
            
            this.benefitsState = this.getDefaultBenefitFilterState();
            
            // Preserve pagination and sorting settings
            this.benefitsState.itemsPerPage = itemsPerPage;
            this.benefitsState.sortBy = sortBy;
            this.benefitsState.sortOrder = sortOrder;
            
            // Notify subscribers about state change
            this.events.emit(FilterStateEvents.BENEFITS_STATE_UPDATED, this.benefitsState);
        } else {
            const itemsPerPage = this.videoAndBookState.itemsPerPage;
            const sortBy = this.videoAndBookState.sortBy;
            const sortOrder = this.videoAndBookState.sortOrder;
            
            this.videoAndBookState = this.getDefaultFilterState();
            
            // Preserve pagination and sorting settings
            this.videoAndBookState.itemsPerPage = itemsPerPage;
            this.videoAndBookState.sortBy = sortBy;
            this.videoAndBookState.sortOrder = sortOrder;
            
            // Notify subscribers about state change
            this.events.emit(FilterStateEvents.VIDEO_BOOK_STATE_UPDATED, this.videoAndBookState);
        }
    }
    
    /**
     * Gets the current filter state for videos and books
     */
    public getVideoAndBookState(): OriginalFilterState {
        return { ...this.videoAndBookState };
    }
    
    /**
     * Gets the current filter state for benefits
     */
    public getBenefitsState(): BenefitFilterState {
        return { ...this.benefitsState };
    }
    
    /**
     * Updates the filter state for videos and books
     * @param updatedState - Partial state to update
     * @param silent - If true, don't emit events (for batch updates)
     */
    public updateVideoAndBookState(updatedState: Partial<OriginalFilterState>, silent = false): void {
        this.videoAndBookState = { ...this.videoAndBookState, ...updatedState };
        
        if (!silent) {
            this.events.emit(FilterStateEvents.VIDEO_BOOK_STATE_UPDATED, this.videoAndBookState);
        }
    }
    
    /**
     * Updates the filter state for benefits
     * @param updatedState - Partial state to update
     * @param silent - If true, don't emit events (for batch updates)
     */
    public updateBenefitsState(updatedState: Partial<BenefitFilterState>, silent = false): void {
        this.benefitsState = { ...this.benefitsState, ...updatedState };
        
        if (!silent) {
            this.events.emit(FilterStateEvents.BENEFITS_STATE_UPDATED, this.benefitsState);
        }
    }
    
    /**
     * Sets available options for video filters
     * @param options - Available options to set
     */
    public setAvailableVideoOptions(options: {
        statuses?: string[];
        presenters?: string[];
        types?: string[];
        categories?: string[];
        tags?: string[];
    }): void {
        let updated = false;
        
        if (options.statuses) {
            this.availableVideoOptions.statuses = new Set(options.statuses);
            updated = true;
        }
        if (options.presenters) {
            this.availableVideoOptions.presenters = new Set(options.presenters);
            updated = true;
        }
        if (options.types) {
            this.availableVideoOptions.types = new Set(options.types);
            updated = true;
        }
        if (options.categories) {
            this.availableVideoOptions.categories = new Set(options.categories);
            updated = true;
        }
        if (options.tags) {
            this.availableVideoOptions.tags = new Set(options.tags);
            updated = true;
        }
        
        if (updated) {
            this.events.emit(FilterStateEvents.AVAILABLE_OPTIONS_UPDATED, {
                contentType: 'videos',
                options: this.availableVideoOptions
            });
        }
    }
    
    /**
     * Sets available options for book filters
     * @param options - Available options to set
     */
    public setAvailableBookOptions(options: {
        statuses?: string[];
        presenters?: string[]; // authors
        types?: string[]; // categories
        tags?: string[];
    }): void {
        let updated = false;
        
        if (options.statuses) {
            this.availableBookOptions.statuses = new Set(options.statuses);
            updated = true;
        }
        if (options.presenters) {
            this.availableBookOptions.presenters = new Set(options.presenters);
            updated = true;
        }
        if (options.types) {
            this.availableBookOptions.types = new Set(options.types);
            updated = true;
        }
        if (options.tags) {
            this.availableBookOptions.tags = new Set(options.tags);
            updated = true;
        }
        
        if (updated) {
            this.events.emit(FilterStateEvents.AVAILABLE_OPTIONS_UPDATED, {
                contentType: 'books',
                options: this.availableBookOptions
            });
        }
    }
    
    /**
     * Sets available options for benefit filters
     * @param options - Available options to set
     */
    public setAvailableBenefitOptions(options: {
        categories?: string[];
        sourceTypes?: string[];
        tags?: string[];
        sources?: string[];
    }): void {
        let updated = false;
        
        if (options.categories) {
            this.availableBenefitOptions.categories = new Set(options.categories);
            updated = true;
        }
        if (options.sourceTypes) {
            this.availableBenefitOptions.sourceTypes = new Set(options.sourceTypes);
            updated = true;
        }
        if (options.tags) {
            this.availableBenefitOptions.tags = new Set(options.tags);
            updated = true;
        }
        if (options.sources) {
            this.availableBenefitOptions.sources = new Set(options.sources);
            updated = true;
        }
        
        if (updated) {
            this.events.emit(FilterStateEvents.AVAILABLE_OPTIONS_UPDATED, {
                contentType: 'benefits',
                options: this.availableBenefitOptions
            });
        }
    }
    
    /**
     * Gets available options for the given content type and filter
     * @param contentType - Content type to get options for
     * @param filterType - Filter type to get options for
     * @returns Array of available options
     */
    public getAvailableOptions(contentType: string, filterType: string): string[] {
        if (contentType === 'videos') {
            switch (filterType) {
                case 'status': return Array.from(this.availableVideoOptions.statuses);
                case 'presenter': return Array.from(this.availableVideoOptions.presenters);
                case 'type': return Array.from(this.availableVideoOptions.types);
                case 'category': return Array.from(this.availableVideoOptions.categories);
                case 'tag': return Array.from(this.availableVideoOptions.tags);
            }
        } else if (contentType === 'books') {
            switch (filterType) {
                case 'status': return Array.from(this.availableBookOptions.statuses);
                case 'author': return Array.from(this.availableBookOptions.presenters);
                case 'category': return Array.from(this.availableBookOptions.types);
                case 'tag': return Array.from(this.availableBookOptions.tags);
            }
        } else if (contentType === 'benefits') {
            switch (filterType) {
                case 'category': return Array.from(this.availableBenefitOptions.categories);
                case 'sourceType': return Array.from(this.availableBenefitOptions.sourceTypes);
                case 'source': return Array.from(this.availableBenefitOptions.sources);
                case 'tag': return Array.from(this.availableBenefitOptions.tags);
            }
        }
        return [];
    }
}