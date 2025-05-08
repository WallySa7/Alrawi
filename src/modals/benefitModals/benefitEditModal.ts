// src/modals/benefitModals/benefitEditModal.ts
import { App, TextComponent, DropdownComponent, Notice, TFile } from "obsidian";
import { BaseModal } from "../baseModal";
import { AlRawiSettings } from '../../core/settings';
import { DataService } from "../../services/dataService";
import { Benefit } from "../../types";

/**
 * Modal for editing an existing benefit
 */
export class BenefitEditModal extends BaseModal {
    private titleInput: TextComponent;
    private textInput: TextComponent;
    private categoryInput: DropdownComponent;
    private tagsInput: TextComponent;
    private customCategoryInput: TextComponent;
    private pagesInput: TextComponent;
    private volumeInput: TextComponent;
    private dataService: DataService;
    private noteFile: TFile;
    private noteType: 'book' | 'video';
    private noteTitle: string;
    private benefit: Benefit;
    private refreshCallback: (() => void) | null = null;

    /**
     * Creates a new BenefitEditModal
     * @param app Obsidian app instance
     * @param settings Plugin settings
     * @param file The note file containing the benefit
     * @param noteType Type of the note (book or video)
     * @param noteTitle Title of the note
     * @param benefit The benefit to edit
     * @param refreshCallback Optional callback to refresh views after changes
     */
    constructor(
        app: App, 
        settings: AlRawiSettings, 
        file: TFile, 
        noteType: 'book' | 'video', 
        noteTitle: string,
        benefit: Benefit,
        refreshCallback?: () => void
    ) {
        super(app, settings);
        this.dataService = new DataService(app, settings);
        this.noteFile = file;
        this.noteType = noteType;
        this.noteTitle = noteTitle;
        this.benefit = benefit;
        this.refreshCallback = refreshCallback || null;
    }

    /**
     * Gets the submit button text
     */
    protected getSubmitButtonText(): string {
        return 'حفظ التغييرات';
    }

    /**
     * Renders the modal content
     */
    protected renderModalContent(): void {
        const { contentEl } = this;
        
        contentEl.createEl('h2', { text: 'تعديل الفائدة' });

        const form = contentEl.createEl('div', { cls: 'alrawi-form' });

        // Note info field (non-editable)
        this.createFormField(form, 'المصدر', () => {
            const container = form.createEl('div', { cls: 'alrawi-source-info' });
            container.createEl('div', { 
                text: this.noteTitle, 
                cls: 'alrawi-source-title' 
            });
            container.createEl('div', { 
                text: this.noteType === 'book' ? 'كتاب' : 'فيديو', 
                cls: 'alrawi-source-type' 
            });
            return container;
        });

        // Benefit title input
        this.createFormField(form, 'عنوان الفائدة', () => {
            this.titleInput = new TextComponent(form);
            this.titleInput.setPlaceholder('أدخل عنوان الفائدة (اختياري)');
            this.titleInput.setValue(this.benefit.title || '');
            this.titleInput.inputEl.addClass('alrawi-input');
            return this.titleInput.inputEl;
        });

        // Benefit text input
        this.createFormField(form, 'نص الفائدة', () => {
            const container = form.createEl('div');
            const textarea = container.createEl('textarea', {
                cls: 'alrawi-input alrawi-textarea',
                attr: {
                    placeholder: 'أدخل نص الفائدة هنا'
                }
            });
            textarea.style.width = '100%';
            textarea.style.height = '150px';
            textarea.style.resize = 'vertical';
            textarea.value = this.benefit.text;
            
            // Create a custom TextComponent-like object
            this.textInput = {
                inputEl: textarea,
                getValue: () => textarea.value,
                setValue: (value: string) => {
                    textarea.value = value;
                    return this.textInput;
                }
            } as unknown as TextComponent;
            
            return container;
        });

        // For books only: Pages and Volume inputs
        if (this.noteType === 'book') {
            this.renderBookSpecificFields(form);
        }

        // Category selection with predefined categories and custom option
        this.renderCategoryField(form);

        // Tags input with suggestions
        this.renderTagsField(form);

        // Button container
        const buttonContainer = form.createEl('div', { cls: 'alrawi-buttons' });
        this.renderActionButtons(buttonContainer);
    }

    /**
     * Renders book-specific fields (pages, volume)
     * @param form The form container
     */
    private renderBookSpecificFields(form: HTMLElement): void {
        // Pages input
        this.createFormField(form, 'رقم الصفحات', () => {
            this.pagesInput = new TextComponent(form);
            this.pagesInput.setPlaceholder('أرقام الصفحات (مثال: 15-20، 25)');
            this.pagesInput.setValue(this.benefit.pages || '');
            this.pagesInput.inputEl.addClass('alrawi-input');
            return this.pagesInput.inputEl;
        });
        
        // Volume input
        this.createFormField(form, 'رقم المجلد', () => {
            this.volumeInput = new TextComponent(form);
            this.volumeInput.setPlaceholder('رقم المجلد (اختياري)');
            this.volumeInput.setValue(this.benefit.volume || '');
            this.volumeInput.inputEl.addClass('alrawi-input');
            return this.volumeInput.inputEl;
        });
    }

    /**
     * Renders the category selection field
     * @param form The form container
     */
    private renderCategoryField(form: HTMLElement): void {
        this.createFormField(form, 'تصنيف الفائدة', () => {
            const container = form.createEl('div');
            this.categoryInput = new DropdownComponent(container);

            // Define or load categories
            const categories = this.getCategories();
            
            // Add options to dropdown
            categories.forEach(category => {
                this.categoryInput.addOption(category, category);
            });
            
            // Add "Other/Custom" option
            this.categoryInput.addOption('أخرى...', 'أخرى');
            
            // Create custom category container
            const customCategoryContainer = form.createEl('div', { 
                cls: 'alrawi-custom-category-container' 
            });
            customCategoryContainer.style.display = 'none';
            
            // Set initial value from benefit
            if (categories.includes(this.benefit.category)) {
                this.categoryInput.setValue(this.benefit.category);
            } else {
                this.categoryInput.setValue('أخرى');
                // Ensure custom category container is shown and populated
                setTimeout(() => {
                    customCategoryContainer.style.display = 'block';
                    this.customCategoryInput.setValue(this.benefit.category);
                }, 0);
            }

            // Handle custom category option
            this.categoryInput.onChange(value => {
                if (value === 'أخرى') {
                    customCategoryContainer.style.display = 'block';
                } else {
                    customCategoryContainer.style.display = 'none';
                }
            });
            
            // Add custom category input
            this.createFormField(customCategoryContainer, 'إضافة تصنيف جديد', () => {
                this.customCategoryInput = new TextComponent(customCategoryContainer);
                this.customCategoryInput.setPlaceholder('أدخل اسم التصنيف الجديد');
                this.customCategoryInput.inputEl.addClass('alrawi-input');
                return this.customCategoryInput.inputEl;
            });
            
            return container;
        });
    }

    /**
     * Renders the tags input field with suggestions
     * @param form The form container
     */
    private renderTagsField(form: HTMLElement): void {
        this.createFormField(form, 'الوسوم (اختياري)', () => {
            const container = form.createEl('div');
            this.tagsInput = new TextComponent(container);
            this.tagsInput.setPlaceholder('وسوم مفصولة بفواصل (اختياري)');
            this.tagsInput.setValue(this.benefit.tags ? this.benefit.tags.join(', ') : '');
            this.tagsInput.inputEl.addClass('alrawi-input');
            
            // Add tag suggestions
            const contentType = this.noteType === 'book' ? 'books' : 'videos';
            this.dataService.getExistingTags(contentType).then(tags => {
                if (tags.length === 0) return;
                
                const tagSuggestions = container.createEl('div', { cls: 'alrawi-tag-suggestions' });
                tags.slice(0, 10).forEach(tag => {
                    const tagChip = tagSuggestions.createEl('span', { 
                        text: tag,
                        cls: 'alrawi-tag-chip'
                    });
                    tagChip.addEventListener('click', () => {
                        const currentTags = this.tagsInput.getValue().split(',').map(t => t.trim()).filter(t => t);
                        if (!currentTags.includes(tag)) {
                            const newTagsValue = currentTags.length > 0 
                                ? `${this.tagsInput.getValue()}, ${tag}` 
                                : tag;
                            this.tagsInput.setValue(newTagsValue);
                        }
                    });
                });
            });
            
            return container;
        });
    }

    /**
     * Gets predefined categories for benefits
     * @returns Array of category names
     */
    private getCategories(): string[] {
        // Use predefined categories or get from settings
        return [
            'عقيدة',
            'فقه',
            'تفسير',
            'حديث',
            'سيرة',
            'تزكية',
            'لغة',
            'أدب',
            'تاريخ',
            'علوم',
            'عامة'
        ];
    }

    /**
     * Handles form submission
     */
    protected async onSubmit(): Promise<void> {
        if (this.isLoading) return;
        
        // Validate input
        const text = this.textInput.getValue().trim();
        if (!text) {
            this.showWarning('الرجاء إدخال نص الفائدة');
            return;
        }

        // Get category - use custom if selected
        let category = this.categoryInput.getValue();
        if (category === 'أخرى') {
            category = this.customCategoryInput.getValue().trim();
            if (!category) {
                this.showWarning('الرجاء إدخال اسم التصنيف الجديد');
                return;
            }
        }
        
        // Process tags
        const tagInput = this.tagsInput.getValue().trim();
        const tags = tagInput ? tagInput.split(',').map(t => t.trim()).filter(t => t) : [];
        
        // Set loading state
        this.isLoading = true;
        this.loadingMessage = 'جاري تحديث الفائدة...';
        this.updateLoadingUI();

        try {
            // Prepare updated benefit data
            const updatedBenefit: Benefit = {
                ...this.benefit,
                title: this.titleInput.getValue().trim(),
                text: text,
                category: category,
                tags: tags
            };
            
            // Add book-specific fields if applicable
            if (this.noteType === 'book') {
                updatedBenefit.pages = this.pagesInput.getValue().trim();
                updatedBenefit.volume = this.volumeInput.getValue().trim();
            }

            // Update the benefit
            const success = await this.dataService.updateBenefit(this.noteFile.path, updatedBenefit);
            
            if (success) {
                this.showSuccess('تم تحديث الفائدة بنجاح');
                this.close();
            } else {
                this.showError('حدث خطأ أثناء تحديث الفائدة');
            }
        } catch (error) {
            console.error('Error updating benefit:', error);
            this.showError('حدث خطأ أثناء تحديث الفائدة');
        } finally {
            this.isLoading = false;
            this.updateLoadingUI();
        }
    }

    /**
     * Cleans up when the modal is closed
     */
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        
        // Call refresh callback if provided
        if (this.refreshCallback) {
            this.refreshCallback();
        }
    }
}