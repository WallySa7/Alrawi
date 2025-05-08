import { App, TFile, TFolder } from "obsidian";
import { AlRawiSettings } from "../../core/settings";

/**
 * Base data service providing common file and metadata operations
 * All specialized services inherit from this class
 */
export abstract class BaseDataService {
	protected app: App;
	protected settings: AlRawiSettings;

	/**
	 * Creates a new base data service
	 * @param app - Obsidian app instance
	 * @param settings - Plugin settings
	 */
	constructor(app: App, settings: AlRawiSettings) {
		this.app = app;
		this.settings = settings;
	}

	/**
	 * Recursively finds all markdown files in a folder and its subfolders
	 * @param folder - The folder to search
	 * @returns Array of markdown files
	 */
	protected findMarkdownFiles(folder: TFolder): TFile[] {
		let files: TFile[] = [];

		for (const child of folder.children) {
			if (child instanceof TFile && child.extension === "md") {
				files.push(child);
			} else if (child instanceof TFolder) {
				files = files.concat(this.findMarkdownFiles(child));
			}
		}

		return files;
	}

	/**
	 * Creates a folder path if it doesn't exist
	 * @param folderPath - Path to ensure exists
	 * @returns True if the folder exists or was created successfully
	 */
	protected async createFolderIfNeeded(folderPath: string): Promise<boolean> {
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
	 * Parses frontmatter from file content
	 * @param content - File content
	 * @returns Parsed frontmatter as object or null if not found
	 */
	protected parseFrontmatter(content: string): Record<string, any> | null {
		const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
		if (!frontmatterMatch) return null;

		const frontmatterStr = frontmatterMatch[1];
		const frontmatter: Record<string, any> = {};

		// Parse frontmatter lines
		const lines = frontmatterStr.split("\n");
		for (const line of lines) {
			const match = line.match(/^([^:]+):\s*(.*?)$/);
			if (match) {
				const key = match[1].trim();
				const value = match[2].trim();

				// Parse value to appropriate type
				frontmatter[key] = this.parseYamlValue(value);
			}
		}

		return frontmatter;
	}

	/**
	 * Parses a YAML value to the appropriate JavaScript type
	 * @param value - String value from YAML
	 * @returns Parsed value (boolean, number, array, or string)
	 */
	private parseYamlValue(value: string): any {
		// Boolean values
		if (value === "true") return true;
		if (value === "false") return false;

		// Numeric values
		if (!isNaN(Number(value)) && value !== "") {
			return Number(value);
		}

		// Array values
		if (value.startsWith("[") && value.endsWith("]")) {
			try {
				return JSON.parse(value);
			} catch {
				return value;
			}
		}

		// Default to string
		return value;
	}

	/**
	 * Updates a value in file frontmatter
	 * @param content - File content
	 * @param key - Frontmatter key to update
	 * @param value - New value
	 * @returns Updated content
	 */
	protected updateFrontmatter(
		content: string,
		key: string,
		value: any
	): string {
		const yamlValue = this.convertToYaml(value);

		// Find frontmatter section
		const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
		if (!frontmatterMatch) {
			// If no frontmatter, add it
			return `---\n${key}: ${yamlValue}\n---\n\n${content}`;
		}

		const frontmatter = frontmatterMatch[1];
		const lines = frontmatter.split("\n");

		// Check if key already exists
		const keyLineIndex = lines.findIndex((line) =>
			line.startsWith(`${key}:`)
		);

		if (keyLineIndex !== -1) {
			// Update existing key
			lines[keyLineIndex] = `${key}: ${yamlValue}`;
		} else {
			// Add new key
			lines.push(`${key}: ${yamlValue}`);
		}

		// Rebuild frontmatter
		const updatedFrontmatter = lines.join("\n");
		return content.replace(
			/^---\n[\s\S]*?\n---/,
			`---\n${updatedFrontmatter}\n---`
		);
	}

	/**
	 * Converts a JavaScript value to YAML string representation
	 * @param value - Value to convert
	 * @returns String representation for YAML
	 */
	protected convertToYaml(value: any): string {
		if (value === null || value === undefined) {
			return "";
		}

		if (typeof value === "string") {
			// Quote strings that contain special characters
			return value.includes(":") ||
				value.includes("#") ||
				value.includes("{") ||
				value.includes("[")
				? `"${value.replace(/"/g, '\\"')}"`
				: value;
		}

		if (typeof value === "number" || typeof value === "boolean") {
			return value.toString();
		}

		if (Array.isArray(value)) {
			if (value.length === 0) {
				return "[]";
			}

			// Format as inline array for short arrays
			if (
				value.length < 5 &&
				value.every((v) => typeof v === "string" && v.length < 20)
			) {
				return `[${value
					.map((v) => this.convertToYaml(v))
					.join(", ")}]`;
			}

			// Format as multiline array for longer arrays
			return `\n  - ${value
				.map((v) => this.convertToYaml(v))
				.join("\n  - ")}`;
		}

		if (typeof value === "object") {
			try {
				return JSON.stringify(value);
			} catch {
				return value.toString();
			}
		}

		return value.toString();
	}

	/**
	 * Normalizes tags from various formats to a consistent array
	 * @param tagData - Tags from frontmatter (string or array)
	 * @returns Processed tags array
	 */
	protected normalizeTags(tagData: any): string[] {
		if (!tagData) return [];

		if (Array.isArray(tagData)) {
			return tagData.map((t) => t.toString().trim()).filter((t) => t);
		}

		if (typeof tagData === "string") {
			return tagData
				.split(",")
				.map((t) => t.trim())
				.filter((t) => t);
		}

		return [];
	}
}
