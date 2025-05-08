// src/views/unifiedView/content/books/BookStats.ts
import { BookItem } from "../../../../types";
import { ComponentProps } from "../../types";

interface BookStatsProps extends ComponentProps {
    books: BookItem[];
}

interface ReadingStatistics {
    totalBooks: number;
    readBooks: number;
    inProgressBooks: number;
    unreadBooks: number;
    totalPages: number;
    readPages: number;
    averageCompletion: number;
    readingRate: number;
}

/**
 * Renders statistics for books
 */
export class BookStats {
    private props: BookStatsProps;
    
    constructor(props: BookStatsProps) {
        this.props = props;
    }
    
    /**
     * Renders the book statistics
     */
    public render(container: HTMLElement): void {
        const stats = this.calculateStats();
        
        const statsContainer = container.createEl('div', { cls: 'alrawi-stats-cards' });
        
        this.createStatCard(statsContainer, 'الكتب', stats.totalBooks.toString());
        this.createStatCard(statsContainer, 'تمت قراءتها', stats.readBooks.toString());
        this.createStatCard(statsContainer, 'قيد القراءة', stats.inProgressBooks.toString());
        this.createStatCard(statsContainer, 'إجمالي الصفحات', stats.totalPages.toString());
        this.createStatCard(statsContainer, 'الصفحات المقروءة', stats.readPages.toString());
        this.createStatCard(statsContainer, 'نسبة الإنجاز', `${Math.round(stats.averageCompletion)}%`);
        
        // Reading Goal Progress
        if (this.props.settings.booksSettings.readingGoal.enabled) {
            this.renderReadingGoals(statsContainer, stats);
        }
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
     * Renders reading goals progress
     */
    private renderReadingGoals(container: HTMLElement, stats: ReadingStatistics): void {
        const goalProgress = container.createEl('div', { cls: 'alrawi-reading-goal' });
        const goalTitle = goalProgress.createEl('h3', { text: 'هدف القراءة' });
        
        // Yearly goal container
        const yearlyGoalContainer = goalProgress.createEl('div', { cls: 'alrawi-goal-container' });
        yearlyGoalContainer.createEl('div', { 
            cls: 'alrawi-goal-label',
            text: `الهدف السنوي: ${this.props.settings.booksSettings.readingGoal.booksPerYear} كتاب`
        });
        
        const yearlyProgress = yearlyGoalContainer.createEl('div', { cls: 'alrawi-goal-progress' });
        const currentYear = new Date().getFullYear();
        const booksThisYear = this.props.books.filter(book => {
            return book.completionDate && book.completionDate.startsWith(currentYear.toString());
        }).length;
        
        const yearlyPercentage = Math.min(100, Math.round((booksThisYear / this.props.settings.booksSettings.readingGoal.booksPerYear) * 100));
        const yearlyProgressBar = yearlyProgress.createEl('div', { 
            cls: 'alrawi-progress-bar',
            attr: { 'data-percentage': `${yearlyPercentage}%` }
        });
        yearlyProgressBar.createEl('div', { 
            cls: 'alrawi-progress-fill',
        });
        yearlyProgressBar.style.width = `${yearlyPercentage}%`;

        yearlyProgress.createEl('div', { 
            cls: 'alrawi-progress-text',
            text: `${booksThisYear} من ${this.props.settings.booksSettings.readingGoal.booksPerYear} (${yearlyPercentage}%)`
        });
        
        // Daily reading goal
        const dailyGoalContainer = goalProgress.createEl('div', { cls: 'alrawi-goal-container' });
        dailyGoalContainer.createEl('div', { 
            cls: 'alrawi-goal-label',
            text: `الهدف اليومي: ${this.props.settings.booksSettings.readingGoal.pagesPerDay} صفحة`
        });
        
        // Calculate average daily reading
        const readingRate = stats.readingRate > 0 ? Math.round(stats.readingRate) : 0;
        const dailyPercentage = Math.min(100, Math.round((readingRate / this.props.settings.booksSettings.readingGoal.pagesPerDay) * 100));
        
        const dailyProgress = dailyGoalContainer.createEl('div', { cls: 'alrawi-goal-progress' });
        const dailyProgressBar = dailyProgress.createEl('div', { 
            cls: 'alrawi-progress-bar',
            attr: { 'data-percentage': `${dailyPercentage}%` }
        });
        dailyProgressBar.createEl('div', { 
            cls: 'alrawi-progress-fill',
        });
        dailyProgressBar.style.width = `${dailyPercentage}%`;
        
        dailyProgress.createEl('div', { 
            cls: 'alrawi-progress-text',
            text: `${readingRate} صفحة يومياً (${dailyPercentage}%)`
        });
    }
    
    /**
     * Calculates book statistics
     */
    private calculateStats(): ReadingStatistics {
        const books = this.props.books;
        
        // Count books by status
        const readBooks = books.filter(book => book.status === 'تمت القراءة').length;
        const inProgressBooks = books.filter(book => book.status === 'قيد القراءة').length;
        const unreadBooks = books.length - readBooks - inProgressBooks;
        
        // Calculate pages statistics
        let totalPages = 0;
        let readPages = 0;
        
        books.forEach(book => {
            if (book.pages) totalPages += book.pages;
            if (book.pagesRead) readPages += book.pagesRead;
        });
        
        // Calculate average completion
        const averageCompletion = totalPages > 0 ? (readPages / totalPages) * 100 : 0;
        
        // Calculate reading rate (pages per day)
        // This is a simplified calculation - you may want to make it more sophisticated
        const completedBooksWithDates = books.filter(book => 
            book.status === 'تمت القراءة' && book.startDate && book.completionDate
        );
        
        let totalDaysReading = 0;
        let totalPagesRead = 0;
        
        completedBooksWithDates.forEach(book => {
            const startDate = new Date(book.startDate ?? 0);
            const completionDate = book.completionDate ? new Date(book.completionDate) : new Date(0);
            const daysReading = Math.max(1, Math.round((completionDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
            
            totalDaysReading += daysReading;
            totalPagesRead += book.pages;
        });
        
        const readingRate = totalDaysReading > 0 ? totalPagesRead / totalDaysReading : 0;
        
        return {
            totalBooks: books.length,
            readBooks,
            inProgressBooks,
            unreadBooks,
            totalPages,
            readPages,
            averageCompletion,
            readingRate
        };
    }
}