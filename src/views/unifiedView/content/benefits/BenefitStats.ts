// src/views/unifiedView/content/benefits/BenefitStats.ts
import { Benefit } from "../../../../types";
import { ComponentProps } from "../../types";

interface BenefitStatsProps extends ComponentProps {
    benefits: Benefit[];
}

interface BenefitStatistics {
    totalBenefits: number;
    categories: number;
    fromBooks: number;
    fromVideos: number;
}

/**
 * Renders statistics for benefits
 */
export class BenefitStats {
    private props: BenefitStatsProps;
    
    constructor(props: BenefitStatsProps) {
        this.props = props;
    }
    
    /**
     * Renders the benefit statistics
     */
    public render(container: HTMLElement): void {
        const stats = this.calculateStats();
        
        const statsContainer = container.createEl('div', { cls: 'alrawi-stats-cards' });
        
        this.createStatCard(statsContainer, 'عدد الفوائد', stats.totalBenefits.toString());
        this.createStatCard(statsContainer, 'التصنيفات', stats.categories.toString());
        this.createStatCard(statsContainer, 'من الكتب', stats.fromBooks.toString());
        this.createStatCard(statsContainer, 'من الفيديوهات', stats.fromVideos.toString());
    }
    
    /**
     * Creates a single stat card
     */
    private createStatCard(container: HTMLElement, label: string, value: string): HTMLElement {
        const card = container.createEl('div', { cls: 'alrawi-stat-card' });
        card.createEl('div', { text: label, cls: 'alrawi-stat-label' });
        card.createEl('div', { text: value, cls: 'alrawi-stat-value' });
        return card;
    }
    
    /**
     * Calculates benefit statistics
     */
    private calculateStats(): BenefitStatistics {
        const benefits = this.props.benefits;
        
        // Count benefits by source type
        const fromBooks = benefits.filter(b => b.sourceType === 'book').length;
        const fromVideos = benefits.filter(b => b.sourceType === 'video').length;
        
        // Count unique categories
        const uniqueCategories = new Set<string>();
        benefits.forEach(benefit => {
            if (benefit.category) {
                uniqueCategories.add(benefit.category);
            }
        });
        
        return {
            totalBenefits: benefits.length,
            categories: uniqueCategories.size,
            fromBooks,
            fromVideos
        };
    }
}