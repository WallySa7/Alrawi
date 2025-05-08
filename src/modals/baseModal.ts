// src/modals/baseModal.ts
import { Modal, App, Setting, TextComponent, DropdownComponent, ButtonComponent, Notice } from "obsidian";
import { AlRawiSettings } from '../core/settings';

/**
 * Base modal class for all Al-Rawi modals
 * Provides common functionality for forms and UI
 */
export abstract class BaseModal extends Modal {
    protected settings: AlRawiSettings;
    protected isLoading = false;
    protected loadingMessage = '';

    /**
     * Creates a new BaseModal
     * @param app Obsidian app instance
     * @param settings Plugin settings
     */
    constructor(app: App, settings: AlRawiSettings) {
        super(app);
        this.settings = settings;
    }

    /**
     * Opens the modal and renders its content
     */
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('alrawi-modal');

        this.renderModalContent();

        // Add keyboard shortcuts
        this.registerKeyboardShortcuts();
    }

    /**
     * Abstract method to render modal content
     * Must be implemented by subclasses
     */
    protected abstract renderModalContent(): void;

    /**
     * Creates a form field with label and input
     * @param container Parent container element
     * @param label Field label text
     * @param inputCreator Function to create the input element
     * @returns The created field container
     */
    protected createFormField(container: HTMLElement, label: string, inputCreator: () => HTMLElement): HTMLElement {
        const field = container.createEl('div', { cls: 'alrawi-field' });
        field.createEl('label', { text: label, cls: 'alrawi-label' });
        field.appendChild(inputCreator());
        return field;
    }

    /**
     * Updates the UI to show loading state
     */
    protected updateLoadingUI(): void {
        const buttons = this.contentEl.querySelector('.alrawi-buttons') as HTMLElement;
        if (!buttons) return;

        if (this.isLoading) {
            this.renderLoadingUI(buttons);
        } else {
            this.renderActionButtons(buttons);
        }
    }

    /**
     * Renders the loading indicator
     * @param container Container for the loading UI
     */
    protected renderLoadingUI(container: HTMLElement): void {
        container.empty();
        container.createEl('div', { 
            text: this.loadingMessage,
            cls: 'alrawi-loading'
        });
    }

    /**
     * Renders action buttons (submit, cancel)
     * @param container Container for the buttons
     */
    protected renderActionButtons(container: HTMLElement): void {
        container.empty();
        
        const submitBtn = container.createEl('button', { 
            text: this.getSubmitButtonText(),
            cls: 'alrawi-button alrawi-button-primary'
        });
        submitBtn.addEventListener('click', () => this.onSubmit());

        const cancelBtn = container.createEl('button', { 
            text: 'إلغاء',
            cls: 'alrawi-button'
        });
        cancelBtn.addEventListener('click', () => this.close());
    }

    /**
     * Gets the text for the submit button
     * Can be overridden by subclasses
     */
    protected getSubmitButtonText(): string {
        return 'حفظ';
    }

    /**
     * Registers keyboard shortcuts
     */
    protected registerKeyboardShortcuts(): void {
        // Enter for submit
        this.scope.register([], 'Enter', (evt) => {
            if (!this.isLoading) {
                const target = evt.target as HTMLElement;
                const isForm = target.tagName === 'INPUT' || 
                               target.tagName === 'TEXTAREA' || 
                               target.tagName === 'SELECT';
                
                // Only submit if Enter pressed on form element or submit button
                if (isForm || target.classList.contains('alrawi-button-primary')) {
                    this.onSubmit();
                    evt.preventDefault();
                }
            }
        });
        
        // Escape for cancel
        this.scope.register([], 'Escape', (evt) => {
            this.close();
            evt.preventDefault();
        });
    }

    /**
     * Abstract method to handle form submission
     * Must be implemented by subclasses
     */
    protected abstract onSubmit(): Promise<void>;

    /**
     * Shows a notice when submission succeeds
     * @param message Success message
     */
    protected showSuccess(message: string): void {
        new Notice(`✅ ${message}`);
    }

    /**
     * Shows a notice when submission fails
     * @param message Error message
     */
    protected showError(message: string): void {
        new Notice(`❌ ${message}`);
    }

    /**
     * Shows a warning notice
     * @param message Warning message
     */
    protected showWarning(message: string): void {
        new Notice(`⚠️ ${message}`);
    }

    /**
     * Cleans up when the modal is closed
     */
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}