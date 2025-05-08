// src/modals/benefitModals/benefitModal.ts
import { App, TextComponent, DropdownComponent, Notice, TFile } from "obsidian";
import { BaseModal } from "../baseModal";
import { AlRawiSettings } from '../../core/settings';
import { DataService } from "../../services/dataService";
import { formatDate } from "../../utils/dateUtils";
import { v4 as uuidv4 } from 'uuid';

/**
 * Modal for adding a new benefit to a note
 */
export class BenefitModal extends BaseModal {
    private textInput: TextComponent;
    private titleInput: TextComponent;
    private categoryInput: DropdownComponent;
    private tagsInput: TextComponent;
    private customCategoryInput: TextComponent;
    private pagesInput: TextComponent;
    private volumeInput: TextComponent;
    private dataService: DataService;
    private noteFile: TFile;
    private noteType: 'book' | 'video';
    private noteTitle: string;

    /**
     * Creates a new BenefitModal
     * @param app Obsidian app instance
     * @param settings Plugin settings
     * @param file The note file to add benefit to
     * @param noteType Type of the note (book or video)
     * @param noteTitle Title of the note
     */
    constructor(
        app: App, 
        settings: AlRawiSettings, 
        file: TFile, 
        noteType: 'book' | 'video', 
        noteTitle: string
    ) {
        super(app, settings);
        this.dataService = new DataService(app, settings);
        this.noteFile = file;
        this.noteType = noteType;
        this.noteTitle = noteTitle;
    }

    /**
     * Gets the submit button text
     */
    protected getSubmitButtonText(): string {
        return 'إضافة الفائدة';
    }

    /**
     * Renders the modal content
     */
    protected renderModalContent(): void {
        const { contentEl } = this;
        
        contentEl.createEl('h2', { text: 'إضافة فائدة جديدة' });

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
            this.pagesInput.inputEl.addClass('alrawi-input');
            return this.pagesInput.inputEl;
        });
        
        // Volume input
        this.createFormField(form, 'رقم المجلد', () => {
            this.volumeInput = new TextComponent(form);
            this.volumeInput.setPlaceholder('رقم المجلد (اختياري)');
            this.volumeInput.inputEl.addClass('alrawi-input');
            return this.volumeInput.inputEl;
        });
    }

    /**
     * Renders the category selection field
     * @param form The form container
     */
    private renderCategoryField(form: HTMLElement): void {
        // Category dropdown
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
            
            // Set initial value
            this.categoryInput.setValue(categories[0] || 'عامة');

            // Create custom category container (initially hidden)
            const customCategoryContainer = form.createEl('div', { 
                cls: 'alrawi-custom-category-container' 
            });
            customCategoryContainer.style.display = 'none';
            
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
        this.loadingMessage = 'جاري إضافة الفائدة...';
        this.updateLoadingUI();

        try {
            // Create a unique ID for the benefit
            const benefitId = uuidv4();
            
            // Prepare benefit data
            const benefitData = {
                id: benefitId,
                title: this.titleInput ? this.titleInput.getValue().trim() : '',
                text: text,
                category: category,
                sourceTitle: this.noteTitle,
                sourcePath: this.noteFile.path,
                sourceType: this.noteType,
                dateAdded: formatDate(new Date(), this.settings.dateFormat),
                tags: tags,
                // Add book-specific fields conditionally
                pages: this.noteType === 'book' && this.pagesInput ? this.pagesInput.getValue().trim() : '',
                volume: this.noteType === 'book' && this.volumeInput ? this.volumeInput.getValue().trim() : ''
            };

            // Save the benefit to the note
            const success = await this.dataService.addBenefitToNote(this.noteFile.path, benefitData);
            
            if (success) {
                this.showSuccess('تمت إضافة الفائدة بنجاح');
                this.close();
            } else {
                this.showError('حدث خطأ أثناء إضافة الفائدة');
            }
        } catch (error) {
            console.error('Error adding benefit:', error);
            this.showError('حدث خطأ أثناء إضافة الفائدة');
        } finally {
            this.isLoading = false;
            this.updateLoadingUI();
        }
    }
}