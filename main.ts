// main.ts - Refactored
import { Plugin, Notice, TFile } from 'obsidian';
import { AlRawiModal } from './src/modals/contentModals/videoModal';
import { AlRawiSettings, DEFAULT_SETTINGS } from './src/core/settings';
import { AlRawiSettingsTab } from './src/ui/settingsTab';
import { DataService } from './src/services/dataService';
import { YouTubeService } from './src/services/youtubeService';
import { BookModal } from './src/modals/contentModals/bookModal';
import { BenefitModal } from './src/modals/benefitModals/benefitModal';
import { UnifiedView, VIEW_TYPE_ALRAWI_UNIFIED } from "./src/views/unifiedView";


/**
 * Main plugin class for Al-Rawi
 * Handles plugin initialization, command registration, and view management
 */
export default class AlRawiPlugin extends Plugin {
    settings: AlRawiSettings;
    dataService: DataService;
    youtubeService: YouTubeService;

    async onload() {
        console.log('Loading Al-Rawi plugin');
        
        await this.loadSettings();
        this.initializeServices();
        this.registerViews();
        this.registerCommands();
        this.registerRibbonIcons();
        this.registerEvents();
        this.ensureDirectoriesExist();
    }
    
    onunload() {
        console.log('Unloading Al-Rawi plugin');
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_ALRAWI_UNIFIED);
    }

    /**
     * Initializes core services used by the plugin
     */
    private initializeServices(): void {
        this.dataService = new DataService(this.app, this.settings);
        this.youtubeService = new YouTubeService(this.settings.youtubeApiKey);
    }

    /**
     * Registers plugin views
     */
    private registerViews(): void {
        // Register unified view for both books and videos
        this.registerView(
            VIEW_TYPE_ALRAWI_UNIFIED,
            (leaf) => new UnifiedView(leaf, this)
        );

        // Add settings tab
        this.addSettingTab(new AlRawiSettingsTab(this.app, this));
    }

    /**
     * Registers all plugin commands
     */
    private registerCommands(): void {
        this.registerViewCommands();
        this.registerContentCommands();
    }

    /**
     * Registers commands for opening different views
     */
    private registerViewCommands(): void {
        // View commands
        this.addCommand({
            id: 'open-alrawi-view',
            name: 'فتح إحصائيات الراوي',
            callback: () => this.activateView(VIEW_TYPE_ALRAWI_UNIFIED, 'videos')
        });

        this.addCommand({
            id: 'open-alrawi-books-view',
            name: 'فتح مكتبة الراوي',
            callback: () => this.activateView(VIEW_TYPE_ALRAWI_UNIFIED, 'books')
        });
    }

    /**
     * Registers commands for content management (adding videos, books, benefits)
     */
    private registerContentCommands(): void {
        // Add content commands
        this.addCommand({
            id: 'add-alrawi-video',
            name: 'إضافة فيديو جديد',
            callback: () => this.addVideo()
        });
        
        this.addCommand({
            id: 'add-alrawi-book',
            name: 'إضافة كتاب جديد',
            callback: () => this.addBook()
        });

        // Benefit command
        this.addCommand({
            id: 'add-alrawi-benefit',
            name: 'إضافة فائدة جديدة',
            checkCallback: (checking: boolean) => this.handleAddBenefitCommand(checking)
        });
    }

    /**
     * Handles the "Add Benefit" command logic
     */
    private handleAddBenefitCommand(checking: boolean): boolean {
        // Check if a markdown file is active
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile || activeFile.extension !== 'md') return false;
        
        // If just checking, return true to indicate command is available
        if (checking) return true;
        
        // Execute the command - first check note type
        this.dataService.getNoteType(activeFile.path).then(noteInfo => {
            if (noteInfo.type === 'book' || noteInfo.type === 'video') {
                new BenefitModal(
                    this.app,
                    this.settings,
                    activeFile,
                    noteInfo.type,
                    noteInfo.title
                ).open();
            } else {
                new Notice('⚠️ هذا الملف لا يمثل كتابًا أو فيديو من الراوي');
            }
        });
        
        return true;
    }

    /**
     * Registers ribbon icons for quick access to plugin functions
     */
    private registerRibbonIcons(): void {
        // Add video icon
        this.addRibbonIcon('play', 'إضافة فيديو جديد', () => {
            this.addVideo();
        });

        // Add book icon
        this.addRibbonIcon('book', 'إضافة كتاب جديد', () => {
            this.addBook();
        });

        // Add unified view icon
        this.addRibbonIcon('layout-dashboard', 'محتوى الراوي', () => {
            this.activateView(VIEW_TYPE_ALRAWI_UNIFIED);
        });
    }

    /**
     * Registers event handlers
     */
    private registerEvents(): void {
        // File modification event
        this.registerEvent(
            this.app.vault.on('modify', file => {
                // Refresh view if a markdown file is modified
                if (file instanceof TFile && file.extension === 'md') {
                    this.refreshViews();
                }
            })
        );
        
        // File deletion event
        this.registerEvent(
            this.app.vault.on('delete', () => {
                // Refresh view if a file is deleted
                this.refreshViews();
            })
        );
    }

    /**
     * Ensures required directories exist
     */
    private async ensureDirectoriesExist(): Promise<void> {
        await this.ensureBooksFolderExists();
        await this.ensureVideosFolderExists();
    }

    /**
     * Ensures the books folder exists
     */
    private async ensureBooksFolderExists(): Promise<void> {
        const booksFolder = this.settings.booksSettings.defaultFolder;
        if (!this.app.vault.getAbstractFileByPath(booksFolder)) {
            try {
                await this.app.vault.createFolder(booksFolder);
                console.log(`Created books folder: ${booksFolder}`);
            } catch (error) {
                console.error(`Failed to create books folder: ${error}`);
            }
        }
    }

    /**
     * Ensures the videos folder exists
     */
    private async ensureVideosFolderExists(): Promise<void> {
        const videosFolder = this.settings.defaultFolder;
        if (!this.app.vault.getAbstractFileByPath(videosFolder)) {
            try {
                await this.app.vault.createFolder(videosFolder);
                console.log(`Created videos folder: ${videosFolder}`);
            } catch (error) {
                console.error(`Failed to create videos folder: ${error}`);
            }
        }
    }

    /**
     * Loads plugin settings
     */
    async loadSettings(): Promise<void> {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.ensureSettingsAreComplete();
        await this.saveSettings();
    }

    /**
     * Ensures all settings have proper default values
     */
    private ensureSettingsAreComplete(): void {
        // Ensure folder rules are initialized
        if (!this.settings.folderRules) {
            this.settings.folderRules = DEFAULT_SETTINGS.folderRules;
        }
        
        if (this.settings.folderRules && this.settings.folderRules.showExamples === undefined) {
            this.settings.folderRules.showExamples = true;
        }
        
        // Ensure view mode is initialized
        if (!this.settings.viewMode) {
            this.settings.viewMode = DEFAULT_SETTINGS.viewMode;
        }
    }

    /**
     * Saves plugin settings
     */
    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
        
        // Update services with new settings
        if (this.youtubeService) {
            this.youtubeService.setApiKey(this.settings.youtubeApiKey);
        }
    }

    /**
     * Activates a specific view
     * @param viewType The type of view to activate
     * @param contentType Optional content type to display (videos or books)
     */
    async activateView(viewType: string, contentType?: 'videos' | 'books'): Promise<void> {
        // Detach existing views of this type first
        this.app.workspace.detachLeavesOfType(viewType);

        // Create a new leaf for the view
        const leaf = this.app.workspace.getLeaf('tab');
        if (!leaf) return;

        await leaf.setViewState({
            type: viewType,
            active: true,
        });
        
        // If we need to switch content type
        if (contentType && viewType === VIEW_TYPE_ALRAWI_UNIFIED) {
            const view = leaf.view as UnifiedView;
            if (view && typeof view.toggleContentType === 'function') {
                // Small delay to ensure view is ready
                setTimeout(() => {
                    view.toggleContentType(contentType);
                }, 100);
            }
        }
        
        // Reveal the leaf
        const leaves = this.app.workspace.getLeavesOfType(viewType);
        if (leaves.length > 0) {
            this.app.workspace.revealLeaf(leaves[0]);
        }
    }

    /**
     * Opens the video addition modal
     */
    addVideo(): void {
        new AlRawiModal(this.app, this.settings).open();
    }

    /**
     * Opens the book addition modal
     */
    addBook(): void {
        new BookModal(this.app, this.settings).open();
    }
    
    /**
     * Refreshes all open views
     */
    refreshViews(): void {
        // Find all open AlRawi views and trigger a refresh
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_ALRAWI_UNIFIED);
        leaves.forEach(leaf => {
            if (leaf.view instanceof UnifiedView) {
                // Refresh the view
                leaf.view.renderView();
            }
        });
    }
}