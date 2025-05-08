// src/views/unifiedView/content/benefits/EnhancedBenefitRenderer.ts
import { BaseContentRenderer, BaseRendererProps } from "../BaseContentRenderer";
import { Benefit } from "../../../../types";
import { BenefitStats } from "./BenefitStats";
import { BenefitCard } from "./BenefitCard";

/**
 * Props for the EnhancedBenefitRenderer
 */
export interface EnhancedBenefitRendererProps extends BaseRendererProps {
    benefits: Benefit[];
    categories: string[];
    tags: string[];
}

/**
 * Enhanced benefit renderer with optimized rendering
 */
export class BenefitRenderer extends BaseContentRenderer<Benefit, EnhancedBenefitRendererProps> {
    // References to rendered components for partial updates
    private statsComponent: BenefitStats | null = null;
    private cardComponent: BenefitCard | null = null;
    
    /**
     * Renders statistics about benefits
     * @param container - Container to render into
     */
    protected renderStats(container: HTMLElement): void {
        const statsContainer = container.createEl('div', { cls: 'alrawi-stats-section' });
        
        this.statsComponent = new BenefitStats({
            ...this.props,
            benefits: this.props.benefits
        });
        
        this.statsComponent.render(statsContainer);
    }
    
    /**
     * Renders benefit content
     * @param container - Container to render into
     */
    protected renderContent(container: HTMLElement): void {
        // Create container for the main content
        const contentContainer = container.createEl('div', { 
            cls: 'alrawi-content-container'
        });
        
        // No results message if needed
        if (this.filteredItems.length === 0) {
            contentContainer.createEl('div', { 
                cls: 'alrawi-no-results',
                text: 'لا توجد فوائد تطابق معايير البحث الخاصة بك'
            });
            return;
        }
        
        // Get benefits for current page
        const benefitFilterState = this.props.filterState.getBenefitsState();
        const startIndex = (benefitFilterState.page - 1) * benefitFilterState.itemsPerPage;
        const endIndex = Math.min(startIndex + benefitFilterState.itemsPerPage, this.filteredItems.length);
        const pageBenefits = this.filteredItems.slice(startIndex, endIndex);
        
        // Render benefit cards
        this.cardComponent = new BenefitCard({
            ...this.props,
            benefits: pageBenefits,
            onRefresh: this.props.onRefresh
        });
        this.cardComponent.render(contentContainer);
    }
    
    /**
     * Updates selection UI without full re-render
     * No selection for benefits, so this is a no-op
     */
    protected updateSelectionUI(): void {
        // No selection for benefits, so nothing to update
    }
    
    /**
     * Gets filtered benefits based on filter state
     * @returns Filtered array of benefits
     */
    protected getFilteredItemsInternal(): Benefit[] {
        let benefits = [...this.props.benefits];
        const benefitFilterState = this.props.filterState.getBenefitsState();
        
        // Apply filters
        // Category filter
        if (benefitFilterState.categories.length > 0) {
            benefits = benefits.filter(item => 
                benefitFilterState.categories.includes(item.category)
            );
        }
        
        // Source type filter
        if (benefitFilterState.sourceTypes.length > 0) {
            benefits = benefits.filter(item => 
                benefitFilterState.sourceTypes.includes(item.sourceType)
            );
        }
        
        // Source filter
        if (benefitFilterState.sources.length > 0) {
            benefits = benefits.filter(item => 
                benefitFilterState.sources.includes(item.sourcePath)
            );
        }
        
        // Tag filter - enhanced for hierarchical tags
        if (benefitFilterState.tags.length > 0) {
            benefits = benefits.filter(item => {
                // Skip items without tags
                if (!item.tags || item.tags.length === 0) return false;
                
                // Check each filter tag
                return benefitFilterState.tags.some(filterTag => {
                    // 1. Direct match - the benefit has exactly this tag
                    if ((item.tags ?? []).includes(filterTag)) return true;
                    
                    // 2. Parent tag match - the filter tag is a parent of one of the benefit's tags
                    // Example: if filter tag is "Programming" and benefit has "Programming/Python"
                    if (filterTag.indexOf('/') === -1) { // This is a parent tag (no slash)
                        return item.tags?.some(itemTag => 
                            itemTag.startsWith(filterTag + '/')
                        );
                    }
                    
                    // 3. Child tag match - the benefit has the parent of this child filter tag
                    // Example: if filter tag is "Programming/Python" and benefit has "Programming"
                    else {
                        const parentTag = filterTag.split('/')[0];
                        return item.tags?.includes(parentTag) ?? false;
                    }
                });
            });
        }
        
        // Apply date range filter
        if (benefitFilterState.dateRange.from || benefitFilterState.dateRange.to) {
            benefits = benefits.filter(item => {
                if (!item.dateAdded) return false;
                
                const itemDate = new Date(item.dateAdded);
                const fromDate = benefitFilterState.dateRange.from ? new Date(benefitFilterState.dateRange.from) : null;
                const toDate = benefitFilterState.dateRange.to ? new Date(benefitFilterState.dateRange.to) : null;
                
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
        if (benefitFilterState.searchQuery) {
            const query = benefitFilterState.searchQuery.toLowerCase();
            benefits = benefits.filter(item => 
                (item.title && item.title.toLowerCase().includes(query)) ||
                item.text.toLowerCase().includes(query) ||
                (item.category && item.category.toLowerCase().includes(query)) ||
                (item.sourceTitle && item.sourceTitle.toLowerCase().includes(query)) ||
                (item.pages && item.pages.toLowerCase().includes(query)) ||
                (item.volume && item.volume.toLowerCase().includes(query)) ||
                (item.tags && item.tags.some(tag => tag.toLowerCase().includes(query)))
            );
        }
        
        // Apply sorting
        return this.applySorting(benefits);
    }
    
    /**
     * Applies sorting to benefits
     * @param benefits - Benefits to sort
     * @returns Sorted array of benefits
     */
    private applySorting(benefits: Benefit[]): Benefit[] {
        const benefitFilterState = this.props.filterState.getBenefitsState();
        
        if (!benefitFilterState.sortBy) return benefits;
        
        return [...benefits].sort((a, b) => {
            let aValue: any, bValue: any;
            
            // Determine sort values based on sort field
            switch (benefitFilterState.sortBy) {
                case 'category':
                    aValue = a.category;
                    bValue = b.category;
                    break;
                case 'sourceTitle':
                    aValue = a.sourceTitle;
                    bValue = b.sourceTitle;
                    break;
                case 'sourceType':
                    aValue = a.sourceType;
                    bValue = b.sourceType;
                    break;
                case 'dateAdded':
                    aValue = a.dateAdded ? new Date(a.dateAdded).getTime() : 0;
                    bValue = b.dateAdded ? new Date(b.dateAdded).getTime() : 0;
                    break;
                default:
                    return 0;
            }
            
            // Compare values based on sort order
            if (aValue === null || aValue === undefined) aValue = '';
            if (bValue === null || bValue === undefined) bValue = '';
            
            if (aValue < bValue) {
                return benefitFilterState.sortOrder === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return benefitFilterState.sortOrder === 'asc' ? 1 : -1;
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
    const categories = new Set<string>();
    const sourceTypes = new Set<string>();
    const sources = new Set<string>();
    const tags = new Set<string>();

    this.filteredItems.forEach(benefit => {
        // Add category
        if (benefit.category) categories.add(benefit.category);
        
        // Add source type
        if (benefit.sourceType) sourceTypes.add(benefit.sourceType);
        
        // Add source
        if (benefit.sourcePath) sources.add(benefit.sourcePath);
        
        // Add tags
        if (benefit.tags && Array.isArray(benefit.tags)) {
            benefit.tags.forEach(tag => tags.add(tag));
        }
    });

    // Update available options in filter state
    this.props.filterState.setAvailableBenefitOptions({
        categories: Array.from(categories),
        sourceTypes: Array.from(sourceTypes),
        sources: Array.from(sources),
        tags: Array.from(tags)
    });
}
    
    /**
     * Clean up resources when component is destroyed
     */
    public destroy(): void {
        super.destroy();
        
        // Clean up component references
        this.statsComponent = null;
        
        if (this.cardComponent && 'destroy' in this.cardComponent) {
            (this.cardComponent as any).destroy();
        }
        this.cardComponent = null;
    }
}