// src/modals/settingsModals/columnConfigModal.ts
import { Modal, App, Setting } from "obsidian";
import { AlRawiSettings, TableColumnConfig, DEFAULT_SETTINGS } from "../../core/settings";

/**
 * Modal for configuring table columns in views
 */
export class ColumnConfigModal extends Modal {
    private settings: AlRawiSettings;
    private contentType: 'videos' | 'books';
    private columns: TableColumnConfig[];
    private onSave: () => void;

    /**
     * Creates a new column configuration modal
     * @param app Obsidian app instance
     * @param settings Plugin settings
     * @param contentType Content type (videos or books)
     * @param onSave Callback function when settings are saved
     */
    constructor(
        app: App, 
        settings: AlRawiSettings, 
        contentType: 'videos' | 'books',
        onSave: () => void
    ) {
        super(app);
        this.settings = settings;
        this.contentType = contentType;
        // Deep copy to avoid modifying original until save
        this.columns = JSON.parse(JSON.stringify(settings.tableColumns[contentType]));
        this.onSave = onSave;
    }

    /**
     * Renders the modal content
     */
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('alrawi-modal');
        contentEl.addClass('alrawi-column-config-modal');

        this.renderModalHeader();
        this.renderColumnsList();
        this.renderButtons();
        
        // Register keyboard shortcuts
        this.registerKeyboardShortcuts();
    }

    /**
     * Renders the modal header and description
     */
    private renderModalHeader(): void {
        const { contentEl } = this;
        
        // Title
        contentEl.createEl('h2', { 
            text: this.contentType === 'videos' ? 
                'تخصيص أعمدة جدول الفيديوهات' : 
                'تخصيص أعمدة جدول الكتب' 
        });

        // Description
        contentEl.createEl('p', { 
            text: 'يمكنك اختيار الأعمدة التي تريد عرضها وترتيبها في الجدول.',
            cls: 'alrawi-config-description'
        });
    }

    /**
     * Renders the columns list with drag-and-drop functionality
     */
    private renderColumnsList(): void {
        const { contentEl } = this;
        
        // Sort columns by current order
        this.columns.sort((a, b) => a.order - b.order);

        // Create UI for each column
        const columnsContainer = contentEl.createEl('div', { cls: 'alrawi-columns-container' });
        
        this.columns.forEach((column, index) => {
            // Skip the checkbox column as it's always needed and special
            if (column.id === 'checkbox') return;
            // Skip the actions column as it's always needed and special
            if (column.id === 'actions') return;

            this.renderColumnRow(columnsContainer, column, index);
        });
    }

    /**
     * Renders a single column row
     * @param container Parent container
     * @param column Column config
     * @param index Column index
     */
    private renderColumnRow(container: HTMLElement, column: TableColumnConfig, index: number): void {
        const columnRow = container.createEl('div', { 
            cls: 'alrawi-column-row' + (column.enabled ? ' enabled' : '')
        });
        
        // Drag handle
        const dragHandle = columnRow.createEl('div', { cls: 'alrawi-column-drag-handle' });
        dragHandle.innerHTML = '⋮⋮';
        dragHandle.setAttribute('draggable', 'true');
        
        // Checkbox for enabling/disabling
        const enabledSetting = new Setting(columnRow)
            .setName(column.label)
            .addToggle(toggle => {
                toggle
                    .setValue(column.enabled)
                    .onChange(value => {
                        column.enabled = value;
                        columnRow.classList.toggle('enabled', value);
                    });
            });
        
        // Add move buttons based on position
        this.addMoveButtons(columnRow, index);
        
        // Set up drag and drop
        this.setupDragAndDrop(dragHandle, columnRow, index);
    }

    /**
     * Adds move up/down buttons for a column row
     * @param columnRow The column row element
     * @param index The index of the column
     */
    private addMoveButtons(columnRow: HTMLElement, index: number): void {
        // Move up button (if not first editable column)
        if (index > 0 && this.columns[index-1].id !== 'checkbox') {
            const moveUpBtn = columnRow.createEl('button', { 
                cls: 'alrawi-column-move-btn alrawi-column-up-btn',
                text: '↑'
            });
            moveUpBtn.addEventListener('click', () => {
                this.moveColumn(index, index - 1);
                this.redraw();
            });
        }
        
        // Move down button (if not last column)
        if (index < this.columns.length - 1 && this.columns[index+1].id !== 'actions') {
            const moveDownBtn = columnRow.createEl('button', { 
                cls: 'alrawi-column-move-btn alrawi-column-down-btn',
                text: '↓'
            });
            moveDownBtn.addEventListener('click', () => {
                this.moveColumn(index, index + 1);
                this.redraw();
            });
        }
    }

    /**
     * Sets up drag and drop functionality for a column row
     * @param dragHandle The drag handle element
     * @param columnRow The column row element
     * @param index The index of the column
     */
    private setupDragAndDrop(dragHandle: HTMLElement, columnRow: HTMLElement, index: number): void {
        // Drag start event
        dragHandle.addEventListener('dragstart', (e) => {
            e.dataTransfer?.setData('text/plain', index.toString());
            columnRow.addClass('dragging');
        });
        
        // Drag end event
        dragHandle.addEventListener('dragend', () => {
            columnRow.removeClass('dragging');
        });
        
        // Drag over event (needed for drop)
        columnRow.addEventListener('dragover', (e) => {
            e.preventDefault();
            columnRow.addClass('drag-over');
        });
        
        // Drag leave event
        columnRow.addEventListener('dragleave', () => {
            columnRow.removeClass('drag-over');
        });
        
        // Drop event
        columnRow.addEventListener('drop', (e) => {
            e.preventDefault();
            const sourceIndex = parseInt(e.dataTransfer?.getData('text/plain') || '-1');
            if (sourceIndex >= 0 && sourceIndex !== index) {
                this.moveColumn(sourceIndex, index);
                this.redraw();
            }
            columnRow.removeClass('drag-over');
        });
    }

    /**
     * Renders action buttons (reset, save, cancel)
     */
    private renderButtons(): void {
        const { contentEl } = this;
        
        const buttonContainer = contentEl.createEl('div', { cls: 'alrawi-config-buttons' });
        
        // Reset button
        const resetButton = buttonContainer.createEl('button', {
            cls: 'alrawi-button',
            text: 'إعادة الضبط'
        });
        resetButton.addEventListener('click', () => {
            this.resetToDefault();
            this.redraw();
        });
        
        // Save button
        const saveButton = buttonContainer.createEl('button', {
            cls: 'alrawi-button alrawi-button-primary',
            text: 'حفظ'
        });
        saveButton.addEventListener('click', () => {
            this.saveChanges();
        });
        
        // Cancel button
        const cancelButton = buttonContainer.createEl('button', {
            cls: 'alrawi-button',
            text: 'إلغاء'
        });
        cancelButton.addEventListener('click', () => {
            this.close();
        });
    }

    /**
     * Registers keyboard shortcuts
     */
    private registerKeyboardShortcuts(): void {
        // Enter for save
        this.scope.register([], 'Enter', (evt) => {
            const target = evt.target as HTMLElement;
            if (target.classList.contains('alrawi-button-primary')) {
                this.saveChanges();
                evt.preventDefault();
            }
        });
        
        // Escape for cancel
        this.scope.register([], 'Escape', (evt) => {
            this.close();
            evt.preventDefault();
        });
    }

    /**
     * Moves a column from one position to another
     * @param fromIndex Source index
     * @param toIndex Target index
     */
    moveColumn(fromIndex: number, toIndex: number): void {
        // Ensure indexes are within bounds
        if (fromIndex < 0 || fromIndex >= this.columns.length ||
            toIndex < 0 || toIndex >= this.columns.length) {
            return;
        }
        
        // Don't move checkbox or actions columns
        if (this.columns[fromIndex].id === 'checkbox' || 
            this.columns[fromIndex].id === 'actions' ||
            this.columns[toIndex].id === 'checkbox' || 
            this.columns[toIndex].id === 'actions') {
            return;
        }
        
        // Move the column
        const column = this.columns.splice(fromIndex, 1)[0];
        this.columns.splice(toIndex, 0, column);
        
        // Update order values
        this.updateOrderValues();
    }

    /**
     * Updates the order values of all columns
     */
    updateOrderValues(): void {
        this.columns.forEach((column, index) => {
            column.order = index;
        });
    }

    /**
     * Resets columns to default settings
     */
    resetToDefault(): void {
        const defaultColumns = DEFAULT_SETTINGS.tableColumns[this.contentType];
        this.columns = JSON.parse(JSON.stringify(defaultColumns)); // Deep copy
    }

    /**
     * Saves changes and closes the modal
     */
    saveChanges(): void {
        // Update order values one more time to be sure
        this.updateOrderValues();
        
        // Update settings
        this.settings.tableColumns[this.contentType] = this.columns;
        
        // Call save callback
        this.onSave();
        
        // Close the modal
        this.close();
    }

    /**
     * Redraws the modal content
     */
    redraw(): void {
        this.onOpen();
    }

    /**
     * Cleans up when the modal is closed
     */
    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}