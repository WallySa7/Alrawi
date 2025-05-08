// src/views/unifiedView/actions/ExportProgress.ts
import { Notice } from "obsidian";

/**
 * Interface for progress notification
 */
interface ProgressNotification {
    id: string;
    notice: Notice;
    startTime: number;
    label: string;
}

/**
 * Manages progress reporting for export/import operations
 * Provides a consistent UI for showing operation progress
 */
export class ExportProgress {
    private progressNotices: Map<string, ProgressNotification> = new Map();
    private counter: number = 0;
    
    /**
     * Starts tracking progress for an operation
     * @param label - Operation label
     * @param initialProgress - Initial progress percentage (0-100)
     * @returns Progress ID for updates
     */
    public startProgress(label: string, initialProgress: number = 0): string {
        const id = `progress-${++this.counter}-${Date.now()}`;
        
        // Create initial notice
        const notice = new Notice(
            `⏳ ${label}... ${initialProgress > 0 ? `(${initialProgress}%)` : ''}`, 
            0 // Infinite duration
        );
        
        // Store progress info
        this.progressNotices.set(id, {
            id,
            notice,
            startTime: Date.now(),
            label
        });
        
        return id;
    }
    
    /**
     * Updates progress for an operation
     * @param id - Progress ID
     * @param percent - Progress percentage (0-100)
     * @param message - Optional status message
     */
    public updateProgress(id: string, percent: number, message?: string): void {
        const progress = this.progressNotices.get(id);
        if (!progress) return;
        
        // Format message - either show the specific message or default percentage
        const displayMessage = message 
            ? `⏳ ${progress.label}: ${message} (${percent}%)`
            : `⏳ ${progress.label}... (${percent}%)`;
        
        // Update notice content
        progress.notice.setMessage(displayMessage);
    }
    
    /**
     * Completes a progress operation
     * @param id - Progress ID
     * @param successMessage - Optional success message
     */
    public completeProgress(id: string, successMessage?: string): void {
        const progress = this.progressNotices.get(id);
        if (!progress) return;
        
        // Calculate elapsed time
        const elapsedSeconds = ((Date.now() - progress.startTime) / 1000).toFixed(1);
        
        // Use success message or default completion message
        const message = successMessage 
            ? `✅ ${successMessage} (${elapsedSeconds}s)`
            : `✅ ${progress.label} اكتمل (${elapsedSeconds}s)`;
        
        // Replace notice with success message that auto-dismisses
        progress.notice.hide();
        new Notice(message, 4000);
        
        // Clean up
        this.progressNotices.delete(id);
    }
    
    /**
     * Marks a progress operation as failed
     * @param label - Operation label
     * @param errorMessage - Optional error message
     */
    public failProgress(label: string, errorMessage?: string): void {
        // Find the progress by label (fallback to clean report if not found)
        let progressId: string | null = null;
        
        for (const [id, progress] of this.progressNotices.entries()) {
            if (progress.label === label) {
                progressId = id;
                break;
            }
        }
        
        if (progressId) {
            const progress = this.progressNotices.get(progressId)!;
            progress.notice.hide();
            this.progressNotices.delete(progressId);
        }
        
        // Show error notice
        const message = errorMessage 
            ? `❌ ${errorMessage}`
            : `❌ ${label} فشل`;
            
        new Notice(message, 4000);
    }
    
    /**
     * Cancels all active progress operations
     */
    public cancelAll(): void {
        for (const [id, progress] of this.progressNotices.entries()) {
            progress.notice.hide();
            this.progressNotices.delete(id);
        }
    }
}