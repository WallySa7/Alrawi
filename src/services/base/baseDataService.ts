// src/services/base/baseDataService.ts
import { App, TFile, TFolder } from 'obsidian';
import { AlRawiSettings } from '../../core/settings';

/**
 * Base data service providing common file operations
 */
export abstract class BaseDataService {
    protected app: App;
    protected settings: AlRawiSettings;
    
    /**
     * Creates a new base data service
     * @param app Obsidian app instance
     * @param settings Plugin settings
     */
    constructor(app: App, settings: AlRawiSettings) {
        this.app = app;
        this.settings = settings;
    }
    
    /**
     * Gets all markdown files in a folder and its subfolders
     * @param folder The folder to search in
     * @returns Array of markdown files
     */
    protected getFilesInFolder(folder: TFolder): TFile[] {
        let files: TFile[] = [];
        const children = folder.children;
        
        for (const child of children) {
            if (child instanceof TFile && child.extension === 'md') {
                files.push(child);
            } else if (child instanceof TFolder) {
                files = files.concat(this.getFilesInFolder(child));
            }
        }
        
        return files;
    }
    
    /**
     * Ensures a folder exists, creating it if needed
     * @param folderPath Path to ensure exists
     * @returns True if the folder exists or was created
     */
    protected async ensureFolderExists(folderPath: string): Promise<boolean> {
        try {
            if (this.app.vault.getAbstractFileByPath(folderPath)) {
                return true;
            }
            
            await this.app.vault.createFolder(folderPath);
            return true;
        } catch (error) {
            console.error(`Failed to create folder ${folderPath}:`, error);
            return false;
        }
    }
    
    /**
     * Extracts frontmatter from file content
     * @param content File content
     * @returns Frontmatter object or null if not found
     */
    protected extractFrontmatter(content: string): Record<string, any> | null {
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!frontmatterMatch) return null;
        
        const frontmatterStr = frontmatterMatch[1];
        const frontmatter: Record<string, any> = {};
        
        // Parse simple key-value pairs
        const lines = frontmatterStr.split('\n');
        for (const line of lines) {
            const match = line.match(/^([^:]+):\s*(.*?)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim();
                
                // Try to parse arrays and special values
                if (value === 'true') {
                    frontmatter[key] = true;
                } else if (value === 'false') {
                    frontmatter[key] = false;
                } else if (!isNaN(Number(value)) && value !== '') {
                    frontmatter[key] = Number(value);
                } else if (value.startsWith('[') && value.endsWith(']')) {
                    try {
                        frontmatter[key] = JSON.parse(value);
                    } catch {
                        frontmatter[key] = value;
                    }
                } else {
                    frontmatter[key] = value;
                }
            }
        }
        
        return frontmatter;
    }
    
    /**
     * Updates a specific value in file frontmatter
     * @param content File content
     * @param key Frontmatter key to update
     * @param value New value
     * @returns Updated content
     */
    protected updateFrontmatterValue(content: string, key: string, value: any): string {
        const yamlValue = this.valueToYaml(value);
        
        // Find frontmatter section
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!frontmatterMatch) {
            // If no frontmatter, add it
            return `---\n${key}: ${yamlValue}\n---\n\n${content}`;
        }
        
        const frontmatter = frontmatterMatch[1];
        const lines = frontmatter.split('\n');
        
        // Check if key already exists
        const keyLineIndex = lines.findIndex(line => line.startsWith(`${key}:`));
        
        if (keyLineIndex !== -1) {
            // Update existing key
            lines[keyLineIndex] = `${key}: ${yamlValue}`;
        } else {
            // Add new key
            lines.push(`${key}: ${yamlValue}`);
        }
        
        // Rebuild frontmatter
        const updatedFrontmatter = lines.join('\n');
        return content.replace(/^---\n[\s\S]*?\n---/, `---\n${updatedFrontmatter}\n---`);
    }
    
    /**
     * Converts a value to YAML representation
     * @param value Value to convert
     * @returns String representation for YAML
     */
    protected valueToYaml(value: any): string {
        if (value === null || value === undefined) {
            return '';
        }
        
        if (typeof value === 'string') {
            // Check if string needs quotes
            return value.includes(':') || value.includes('#') || 
                   value.includes('{') || value.includes('[') ? 
                   `"${value.replace(/"/g, '\\"')}"` : value;
        }
        
        if (typeof value === 'number' || typeof value === 'boolean') {
            return value.toString();
        }
        
        if (Array.isArray(value)) {
            if (value.length === 0) {
                return '[]';
            }
            
            // Format as inline array
            if (value.length < 5 && value.every(v => typeof v === 'string' && v.length < 20)) {
                return `[${value.map(v => this.valueToYaml(v)).join(', ')}]`;
            }
            
            // Format as multiline array
            return `\n  - ${value.map(v => this.valueToYaml(v)).join('\n  - ')}`;
        }
        
        if (typeof value === 'object') {
            try {
                return JSON.stringify(value);
            } catch {
                return value.toString();
            }
        }
        
        return value.toString();
    }
    
    /**
     * Process tags from frontmatter
     * @param tagData Tags from frontmatter (string or array)
     * @returns Processed tags array
     */
    protected processTags(tagData: any): string[] {
        if (!tagData) return [];
        
        if (Array.isArray(tagData)) {
            return tagData.map(t => t.toString().trim()).filter(t => t);
        } 
        
        if (typeof tagData === 'string') {
            return tagData.split(',').map(t => t.trim()).filter(t => t);
        }
        
        return [];
    }
}