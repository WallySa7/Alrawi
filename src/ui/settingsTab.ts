// src/ui/settingsTab.ts
import { App, PluginSettingTab, Setting } from "obsidian";
import { 
    AlRawiSettings, 
    FOLDER_PLACEHOLDERS, 
    getFolderExample, 
    PLACEHOLDER_DOCS 
} from "../core/settings";
import { TemplateEditorModal } from "src/modals/settingsModals/templateEditorModal";

/**
 * Settings tab for Al-Rawi plugin
 */
export class AlRawiSettingsTab extends PluginSettingTab {
    private plugin: any; // AlRawiPlugin
    private folderStructureSetting: Setting;
    private examplePreview: HTMLElement;

    /**
     * Creates a new settings tab
     * @param app Obsidian app instance
     * @param plugin Plugin instance
     */
    constructor(app: App, plugin: any) {
        super(app, plugin);
        this.plugin = plugin;
    }

    /**
     * Renders the settings tab
     */
    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass('alrawi-settings');

        containerEl.createEl('h2', { text: 'إعدادات الراوي' });

        // Group settings into logical sections
        this.createGeneralSettings(containerEl);
        this.createVideoSettings(containerEl);
        this.createBookSettings(containerEl);
        this.createTemplateSettings(containerEl);
    }

    /**
     * Creates the general settings section
     * @param containerEl Container element
     */
    private createGeneralSettings(containerEl: HTMLElement): void {
        const generalSection = containerEl.createEl('div', { cls: 'alrawi-settings-section' });
        generalSection.createEl('h3', { text: 'الإعدادات العامة' });

        // API Key
        this.createSetting(generalSection, {
            name: 'مفتاح YouTube API',
            desc: 'مطلوب لجلب تفاصيل الفيديو تلقائياً',
            type: 'text',
            initialValue: this.plugin.settings.youtubeApiKey,
            placeholder: 'أدخل مفتاح API',
            onChange: async (value) => {
                this.plugin.settings.youtubeApiKey = value;
                await this.plugin.saveSettings();
            }
        });

        // Date format
        this.createSetting(generalSection, {
            name: 'تنسيق التاريخ',
            desc: 'مثال: YYYY-MM-DD لـ 2023-05-15',
            type: 'text',
            initialValue: this.plugin.settings.dateFormat,
            placeholder: 'YYYY-MM-DD',
            onChange: async (value) => {
                this.plugin.settings.dateFormat = value;
                await this.plugin.saveSettings();
            }
        });

    }

    /**
     * Creates the video settings section
     * @param containerEl Container element
     */
    private createVideoSettings(containerEl: HTMLElement): void {
        const videoSection = containerEl.createEl('div', { cls: 'alrawi-settings-section' });
        videoSection.createEl('h3', { text: 'إعدادات الفيديوهات' });

        // Folders group
        this.createVideoFoldersSettings(videoSection);
        
        // Content group
        this.createVideoContentSettings(videoSection);
        
        // YouTube integration group
        this.createYouTubeSettings(videoSection);
        
        // Progress tracking group
        this.createVideoProgressSettings(videoSection);
    }

    /**
     * Creates video folder settings
     * @param container Container element
     */
    private createVideoFoldersSettings(container: HTMLElement): void {
        const folderGroup = container.createEl('div', { cls: 'alrawi-settings-group' });
        folderGroup.createEl('div', { text: 'المجلدات', cls: 'alrawi-settings-group-label' });

        // Default videos folder
        this.createSetting(folderGroup, {
            name: 'المجلد الافتراضي للفيديوهات',
            desc: 'أين يتم حفظ ملفات الفيديو الجديدة',
            type: 'text',
            initialValue: this.plugin.settings.defaultFolder,
            placeholder: 'Al-Rawi Videos',
            onChange: async (value) => {
                this.plugin.settings.defaultFolder = value;
                await this.plugin.saveSettings();
            }
        });

        // Folder organization toggle
        const folderToggleSetting = this.createSetting(folderGroup, {
            name: 'التنظيم التلقائي للمجلدات',
            desc: 'إنشاء مجلدات تلقائياً بناءً على نوع الفيديو والملقي',
            type: 'toggle',
            initialValue: this.plugin.settings.folderRules.enabled,
            onChange: async (value) => {
                this.plugin.settings.folderRules.enabled = value;
                await this.plugin.saveSettings();
                this.updateFolderStructureVisibility();
            }
        });

        // Folder structure setting
        this.folderStructureSetting = this.createSetting(folderGroup, {
            name: 'هيكل المجلدات',
            desc: 'حدد كيفية تنظيم الملفات (استخدم {{placeholders}})',
            type: 'text',
            initialValue: this.plugin.settings.folderRules.structure,
            placeholder: 'مثال: {{type}}/{{presenter}}',
            onChange: async (value) => {
                this.plugin.settings.folderRules.structure = value || this.plugin.settings.folderRules.defaultStructure;
                await this.plugin.saveSettings();
                this.updateExamplePreview();
            }
        });

            this.addPlaceholderDocs(this.folderStructureSetting.settingEl, FOLDER_PLACEHOLDERS);

        // Add example preview
        if (this.plugin.settings.folderRules?.showExamples !== false) {
            this.examplePreview = this.folderStructureSetting.settingEl.createEl('div', {
                cls: 'folder-example-preview',
                text: getFolderExample(this.plugin.settings.folderRules.structure)
            });
        }

        // Set initial visibility
        this.updateFolderStructureVisibility();
    }

    /**
     * Creates video content settings
     * @param container Container element
     */
    private createVideoContentSettings(container: HTMLElement): void {
        const contentGroup = container.createEl('div', { cls: 'alrawi-settings-group' });
        contentGroup.createEl('div', { text: 'المحتوى', cls: 'alrawi-settings-group-label' });

        // Default presenter
        this.createSetting(contentGroup, {
            name: 'الملقي الافتراضي',
            desc: 'سيتم استخدام هذا الاسم إذا لم يتم تحديد شيخ',
            type: 'text',
            initialValue: this.plugin.settings.defaultPresenter,
            placeholder: 'غير معروف',
            onChange: async (value) => {
                this.plugin.settings.defaultPresenter = value;
                await this.plugin.saveSettings();
            }
        });

        // Max title length
        this.createSetting(contentGroup, {
            name: 'الحد الأقصى لطول العنوان',
            desc: 'عدد الأحرف المسموح بها في عنوان الملف',
            type: 'slider',
            initialValue: this.plugin.settings.maxTitleLength,
            min: 30,
            max: 150,
            step: 5,
            onChange: async (value) => {
                this.plugin.settings.maxTitleLength = value;
                await this.plugin.saveSettings();
            }
        });
    }

    /**
     * Creates YouTube integration settings
     * @param container Container element
     */
    private createYouTubeSettings(container: HTMLElement): void {
        const youtubeGroup = container.createEl('div', { cls: 'alrawi-settings-group' });
        youtubeGroup.createEl('div', { text: 'تكامل يوتيوب', cls: 'alrawi-settings-group-label' });

        // Show thumbnails in stats
        this.createSetting(youtubeGroup, {
            name: 'عرض الصور المصغرة في الإحصائيات',
            desc: 'إظهار صور مصغرة للفيديوهات في عرض الإحصائيات',
            type: 'toggle',
            initialValue: this.plugin.settings.showThumbnailsInStats,
            onChange: async (value) => {
                this.plugin.settings.showThumbnailsInStats = value;
                await this.plugin.saveSettings();
            }
        });
    }

    /**
     * Creates video progress tracking settings
     * @param container Container element
     */
    private createVideoProgressSettings(container: HTMLElement): void {
        const progressGroup = container.createEl('div', { cls: 'alrawi-settings-group' });
        progressGroup.createEl('div', { text: 'تتبع حالة المشاهدة', cls: 'alrawi-settings-group-label' });

        // Default status (if tracking enabled)
            this.createSetting(progressGroup, {
                name: 'الحالة الافتراضية',
                desc: 'الحالة الافتراضية للمقاطع الجديدة',
                type: 'dropdown',
                initialValue: this.plugin.settings.progressTracking.defaultStatus,
                options: this.plugin.settings.progressTracking.statusOptions.map((option: string) => ({
                    value: option,
                    label: option
                })),
                onChange: async (value) => {
                    this.plugin.settings.progressTracking.defaultStatus = value;
                    await this.plugin.saveSettings();
                }
            });
    }

    /**
     * Creates the book settings section
     * @param containerEl Container element
     */
    private createBookSettings(containerEl: HTMLElement): void {
        const bookSection = containerEl.createEl('div', { cls: 'alrawi-settings-section' });
        bookSection.createEl('h3', { text: 'إعدادات الكتب' });

        // Book folders group
        this.createBookFoldersSettings(bookSection);
        
        // Book content group
        this.createBookContentSettings(bookSection);
        
        // Reading goals group
        this.createReadingGoalsSettings(bookSection);
        
        // Book status options
        this.createBookStatusSettings(bookSection);
    }

    /**
     * Creates book folder settings
     * @param container Container element
     */
    private createBookFoldersSettings(container: HTMLElement): void {
        const folderGroup = container.createEl('div', { cls: 'alrawi-settings-group' });
        folderGroup.createEl('div', { text: 'المجلدات', cls: 'alrawi-settings-group-label' });

        // Default books folder
        this.createSetting(folderGroup, {
            name: 'المجلد الافتراضي للكتب',
            desc: 'أين يتم حفظ ملفات الكتب الجديدة',
            type: 'text',
            initialValue: this.plugin.settings.booksSettings.defaultFolder,
            placeholder: 'Al-Rawi Books',
            onChange: async (value) => {
                this.plugin.settings.booksSettings.defaultFolder = value;
                await this.plugin.saveSettings();
            }
        });

        // Book folder structure
        this.createSetting(folderGroup, {
            name: 'هيكل مجلدات الكتب',
            desc: 'حدد كيفية تنظيم ملفات الكتب (استخدم {{placeholders}})',
            type: 'text',
            initialValue: this.plugin.settings.booksSettings.folderStructure,
            placeholder: '{{author}}/{{categories}}',
            onChange: async (value) => {
                this.plugin.settings.booksSettings.folderStructure = value;
                await this.plugin.saveSettings();
            }
        });
    }

    /**
     * Creates book content settings
     * @param container Container element
     */
    private createBookContentSettings(container: HTMLElement): void {
        const contentGroup = container.createEl('div', { cls: 'alrawi-settings-group' });
        contentGroup.createEl('div', { text: 'المحتوى', cls: 'alrawi-settings-group-label' });

        // Default author
        this.createSetting(contentGroup, {
            name: 'المؤلف الافتراضي',
            desc: 'سيتم استخدام هذا الاسم إذا لم يتم تحديد مؤلف',
            type: 'text',
            initialValue: this.plugin.settings.booksSettings.defaultAuthor,
            placeholder: 'غير معروف',
            onChange: async (value) => {
                this.plugin.settings.booksSettings.defaultAuthor = value;
                await this.plugin.saveSettings();
            }
        });

        // Show book covers
        this.createSetting(contentGroup, {
            name: 'عرض أغلفة الكتب',
            desc: 'إظهار صور أغلفة الكتب في الملاحظات وواجهة المكتبة',
            type: 'toggle',
            initialValue: this.plugin.settings.booksSettings.showCovers,
            onChange: async (value) => {
                this.plugin.settings.booksSettings.showCovers = value;
                await this.plugin.saveSettings();
            }
        });
    }

    /**
     * Creates reading goals settings
     * @param container Container element
     */
    private createReadingGoalsSettings(container: HTMLElement): void {
        const goalsGroup = container.createEl('div', { cls: 'alrawi-settings-group' });
        goalsGroup.createEl('div', { text: 'أهداف القراءة', cls: 'alrawi-settings-group-label' });

        // Enable reading goals
        this.createSetting(goalsGroup, {
            name: 'تمكين تتبع أهداف القراءة',
            desc: 'تتبع أهداف قراءة الكتب والصفحات',
            type: 'toggle',
            initialValue: this.plugin.settings.booksSettings.readingGoal.enabled,
            onChange: async (value) => {
                this.plugin.settings.booksSettings.readingGoal.enabled = value;
                await this.plugin.saveSettings();
                this.display(); // Refresh to show/hide related settings
            }
        });

        // Reading goal settings (if enabled)
        if (this.plugin.settings.booksSettings.readingGoal.enabled) {
            // Books per year
            this.createSetting(goalsGroup, {
                name: 'هدف الكتب السنوي',
                desc: 'عدد الكتب التي تهدف لقراءتها سنوياً',
                type: 'slider',
                initialValue: this.plugin.settings.booksSettings.readingGoal.booksPerYear,
                min: 1,
                max: 100,
                step: 1,
                onChange: async (value) => {
                    this.plugin.settings.booksSettings.readingGoal.booksPerYear = value;
                    await this.plugin.saveSettings();
                }
            });

            // Pages per day
            this.createSetting(goalsGroup, {
                name: 'هدف الصفحات اليومي',
                desc: 'عدد الصفحات التي تهدف لقراءتها يومياً',
                type: 'slider',
                initialValue: this.plugin.settings.booksSettings.readingGoal.pagesPerDay,
                min: 1,
                max: 100,
                step: 1,
                onChange: async (value) => {
                    this.plugin.settings.booksSettings.readingGoal.pagesPerDay = value;
                    await this.plugin.saveSettings();
                }
            });
        }
    }

    /**
     * Creates book status settings
     * @param container Container element
     */
    private createBookStatusSettings(container: HTMLElement): void {
        const statusGroup = container.createEl('div', { cls: 'alrawi-settings-group' });
        statusGroup.createEl('div', { text: 'خيارات حالة الكتب', cls: 'alrawi-settings-group-label' });

        // Default reading status
        this.createSetting(statusGroup, {
            name: 'حالة القراءة الافتراضية',
            desc: 'الحالة الافتراضية للكتب الجديدة',
            type: 'dropdown',
            initialValue: this.plugin.settings.booksSettings.defaultStatus,
            options: this.plugin.settings.booksSettings.bookStatusOptions.map((option: string) => ({
                value: option,
                label: option
            })),
            onChange: async (value) => {
                this.plugin.settings.booksSettings.defaultStatus = value;
                await this.plugin.saveSettings();
            }
        });
    }

    /**
     * Creates the template settings section
     * @param containerEl Container element
     */
    private createTemplateSettings(containerEl: HTMLElement): void {
        const templateSection = containerEl.createEl('div', { cls: 'alrawi-settings-section' });
        templateSection.createEl('h3', { text: 'قوالب الملاحظات' });

        // Video templates group
        const videoTemplateGroup = templateSection.createEl('div', { cls: 'alrawi-settings-group' });
        videoTemplateGroup.createEl('div', { text: 'قوالب الفيديوهات', cls: 'alrawi-settings-group-label' });

        this.addTemplateEditor(videoTemplateGroup, 'video', 'قالب الفيديو');
        this.addTemplateEditor(videoTemplateGroup, 'playlist', 'قالب السلسلة');

        // Book template group
        const bookTemplateGroup = templateSection.createEl('div', { cls: 'alrawi-settings-group' });
        bookTemplateGroup.createEl('div', { text: 'قالب الكتب', cls: 'alrawi-settings-group-label' });

        this.addTemplateEditor(bookTemplateGroup, 'book', 'قالب الكتاب');
    }

    /**
     * Updates the example preview
     */
    private updateExamplePreview(): void {
        if (!this.examplePreview) return;

        const currentStructure = this.plugin.settings.folderRules.structure;
        
        // Generate a dynamic example based on the structure
        const example = this.generateDynamicExample(currentStructure);
        this.examplePreview.textContent = example;
    }

    /**
     * Generates a dynamic example for folder structure
     * @param structure Folder structure pattern
     * @returns Formatted example
     */
    private generateDynamicExample(structure: string): string {
        const replacements: Record<string, string> = {
            '{{type}}': 'مقطع',
            '{{presenter}}': 'ابن عثيمين',
            '{{date}}': this.formatDate(new Date(), 'YYYY-MM-DD'),
            '{{year}}': new Date().getFullYear().toString(),
            '{{month}}': (new Date().getMonth() + 1).toString().padStart(2, '0'),
            '{{day}}': new Date().getDate().toString().padStart(2, '0')
        };

        let example = structure;
        for (const [key, value] of Object.entries(replacements)) {
            example = example.replace(new RegExp(key, 'g'), value);
        }

        return `مثال: ${example}`;
    }

    /**
     * Formats a date using a specified pattern
     * @param date Date to format
     * @param format Format pattern
     * @returns Formatted date string
     */
    private formatDate(date: Date, format: string): string {
        const pad = (num: number) => num.toString().padStart(2, '0');
        return format
            .replace('YYYY', date.getFullYear().toString())
            .replace('MM', pad(date.getMonth() + 1))
            .replace('DD', pad(date.getDate()));
    }

    /**
     * Updates folder structure setting visibility
     */
    private updateFolderStructureVisibility(): void {
        if (this.folderStructureSetting) {
            const shouldShow = this.plugin.settings.folderRules?.enabled;
            this.folderStructureSetting.settingEl.style.display = shouldShow ? 'flex' : 'none';

            if (this.examplePreview) {
                const showExamples = this.plugin.settings.folderRules?.showExamples !== false;
                this.examplePreview.style.display = shouldShow && showExamples ? 'block' : 'none';
            }
        }
    }

    /**
     * Adds a template editor to the settings
     * @param container Container element
     * @param type Template type (video, playlist, book)
     * @param name Display name for the template
     */
    private addTemplateEditor(container: HTMLElement, type: keyof typeof PLACEHOLDER_DOCS, name: string): void {
        const setting = new Setting(container)
            .setName(name)
            .setDesc('استخدم {{placeholders}} للبيانات الديناميكية');
    
        // Add edit button instead of text area
        setting.addButton(button => {
            return button
                .setButtonText('تعديل القالب')
                .onClick(() => {
                    // Open the template editor modal
                    new TemplateEditorModal(
                        this.app,
                        this.plugin.settings,
                        type as 'video' | 'playlist' | 'book',
                        async () => {
                            // Save settings when template is updated
                            await this.plugin.saveSettings();
                        }
                    ).open();
                });
        });
    
    }

    /**
     * Adds placeholder documentation
     * @param container Container element
     * @param placeholders Array of placeholder documentation
     */
    private addPlaceholderDocs(container: HTMLElement, placeholders: any[]): void {
        const docsContainer = container.createEl('div', {
            cls: 'alrawi-placeholder-docs'
        });

        docsContainer.createEl('h4', {
            text: 'العناصر النائبة المتاحة:',
            cls: 'alrawi-placeholder-header'
        });

        const docsList = docsContainer.createEl('div', {
            cls: 'alrawi-placeholder-grid'
        });

        placeholders.forEach(({ placeholder, description }) => {
            const docItem = docsList.createEl('div', {
                cls: 'alrawi-placeholder-item'
            });
            docItem.createEl('code', {
                text: placeholder,
                cls: 'alrawi-placeholder-code'
            });
            docItem.createEl('span', {
                text: description,
                cls: 'alrawi-placeholder-desc'
            });
        });
    }

    /**
     * Creates a generic setting based on type
     * @param container Container element
     * @param options Setting options
     * @returns Created setting
     */
    private createSetting(container: HTMLElement, options: {
        name: string;
        desc: string;
        type: 'text' | 'toggle' | 'dropdown' | 'slider';
        initialValue: any;
        placeholder?: string;
        min?: number;
        max?: number;
        step?: number;
        options?: {value: string, label: string}[];
        onChange: (value: any) => Promise<void>;
    }): Setting {
        const setting = new Setting(container)
            .setName(options.name)
            .setDesc(options.desc);

        switch (options.type) {
            case 'text':
                setting.addText(text => {
                    const input = text
                        .setValue(options.initialValue || '')
                        .onChange(options.onChange);
                    
                    if (options.placeholder) {
                        input.setPlaceholder(options.placeholder);
                    }
                    
                    return input;
                });
                break;
                
            case 'toggle':
                setting.addToggle(toggle => {
                    return toggle
                        .setValue(!!options.initialValue)
                        .onChange(options.onChange);
                });
                break;
                
            case 'dropdown':
                setting.addDropdown(dropdown => {
                    if (options.options) {
                        options.options.forEach(opt => {
                            dropdown.addOption(opt.value, opt.label);
                        });
                    }
                    
                    return dropdown
                        .setValue(options.initialValue)
                        .onChange(options.onChange);
                });
                break;
                
            case 'slider':
                setting.addSlider(slider => {
                    if (options.min !== undefined && options.max !== undefined) {
                        slider.setLimits(options.min, options.max, options.step || 1);
                    }
                    
                    return slider
                        .setValue(options.initialValue)
                        .setDynamicTooltip()
                        .onChange(options.onChange);
                });
                break;
        }

        return setting;
    }
}