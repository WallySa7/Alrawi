import { App, TFile, TFolder } from "obsidian";
import { BaseDataService } from "../base/baseDataService";
import { AlRawiSettings } from "../../core/settings";
import { Benefit } from "../../types";
import { formatDate } from "../../utils";
import { v4 as uuidv4 } from "uuid";

/**
 * Service for benefit data operations
 * Manages benefits extracted from videos and books
 */
export class BenefitService extends BaseDataService {
	/**
	 * Creates a new benefit service
	 * @param app - Obsidian app instance
	 * @param settings - Plugin settings
	 */
	constructor(app: App, settings: AlRawiSettings) {
		super(app, settings);
	}

	/**
	 * Adds a new benefit to a note
	 * @param filePath - Path to the note file
	 * @param benefitData - Benefit data to add
	 * @returns Whether the operation was successful
	 */
	async addBenefit(filePath: string, benefitData: Benefit): Promise<boolean> {
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) return false;

			// Read file content
			let content = await this.app.vault.read(file);

			// Parse existing benefits from frontmatter
			const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
			let benefits: any[] = [];

			if (frontmatterMatch) {
				// Try to extract benefits array
				const frontmatterContent = frontmatterMatch[1];
				const benefitsMatch = frontmatterContent.match(
					/benefits:\s*(\[[\s\S]*?\]|\n([\s\S]*?)(?=\n\w|\n---|$))/
				);

				if (benefitsMatch) {
					try {
						const benefitsStr = benefitsMatch[1].trim();

						// Parse based on format (YAML list or JSON array)
						if (benefitsStr.startsWith("\n")) {
							// Parse YAML list
							benefits = benefitsStr
								.split("\n")
								.filter((line) => line.trim().startsWith("-"))
								.map((line) => {
									try {
										const jsonStr = line
											.replace(/^\s*-\s*/, "")
											.trim();
										return JSON.parse(jsonStr);
									} catch {
										return null;
									}
								})
								.filter((item) => item !== null);
						} else {
							// Parse as JSON array
							try {
								benefits = JSON.parse(benefitsStr);
							} catch {
								benefits = [];
							}
						}
					} catch (e) {
						console.error(
							"Error parsing benefits from frontmatter:",
							e
						);
						benefits = [];
					}
				}
			}

			// Ensure benefits is an array
			if (!Array.isArray(benefits)) {
				benefits = [];
			}

			// Check if the benefit already exists (by ID)
			const existingIndex = benefits.findIndex(
				(b) => b && b.id === benefitData.id
			);

			// Create metadata for the benefit
			const benefitMetadata = {
				id: benefitData.id,
				category: benefitData.category,
				dateAdded: benefitData.dateAdded,
				tags: benefitData.tags || [],
			};

			if (existingIndex !== -1) {
				// Update existing benefit
				benefits[existingIndex] = benefitMetadata;
			} else {
				// Add new benefit
				benefits.push(benefitMetadata);
			}

			// Format benefit text for adding to content
			const benefitTextBlock = this.formatBenefitBlock(benefitData);

			// Check if benefits section exists
			if (!content.includes("## الفوائد")) {
				// If not, add the section at the end of the file
				content += "\n\n## الفوائد\n";
			}

			// Check if this specific benefit already exists in the content
			const benefitStartTag = `<!-- benefit-start:${benefitData.id} -->`;
			const benefitEndTag = `<!-- benefit-end:${benefitData.id} -->`;
			const benefitRegex = new RegExp(
				`${benefitStartTag}[\\s\\S]*?${benefitEndTag}`,
				"g"
			);

			let updatedContent: string;

			if (content.includes(benefitStartTag)) {
				// If benefit exists, update it
				updatedContent = content.replace(
					benefitRegex,
					benefitTextBlock
				);
			} else {
				// If benefit doesn't exist, add it to the benefits section
				const benefitsSection = content.indexOf("## الفوائد");

				if (benefitsSection !== -1) {
					// Find the next section to determine where to insert
					const nextSectionMatch = content
						.slice(benefitsSection + 10)
						.match(/\n##\s/);
					const nextSectionPos = nextSectionMatch
						? benefitsSection + 10 + (nextSectionMatch.index ?? 0)
						: content.length;

					// Insert benefit after section heading, before next section
					updatedContent =
						content.substring(0, benefitsSection + 10) +
						"\n" +
						benefitTextBlock +
						"\n" +
						content.substring(
							benefitsSection + 10,
							nextSectionPos
						) +
						content.substring(nextSectionPos);
				} else {
					// Fallback (shouldn't happen since we add the section if missing)
					updatedContent =
						content + "\n\n## الفوائد\n" + benefitTextBlock;
				}
			}

			// Update the frontmatter to include benefits array
			const finalContent = this.updateFrontmatter(
				updatedContent,
				"benefits",
				benefits
			);

			// Write the updated content
			await this.app.vault.modify(file, finalContent);

			return true;
		} catch (error) {
			console.error("Error adding benefit to note:", error);
			return false;
		}
	}

	/**
	 * Formats a benefit for insertion into a note
	 * @param benefit - Benefit data to format
	 * @returns Formatted benefit text with HTML comments for identification
	 */
	private formatBenefitBlock(benefit: Benefit): string {
		// Create markers with the benefit ID for future updates
		const benefitStart = `<!-- benefit-start:${benefit.id} -->`;
		const benefitEnd = `<!-- benefit-end:${benefit.id} -->`;

		// Create benefit text with metadata
		let benefitText = `${benefitStart}\n`;

		// Add title if available (use category as fallback)
		if (benefit.title) {
			benefitText += `### ${benefit.title}\n\n`;
		} else {
			benefitText += `### ${benefit.category}\n\n`;
		}

		// Add the benefit text
		benefitText += `${benefit.text}\n\n`;

		// Add book-specific metadata if available
		if (benefit.sourceType === "book") {
			if (benefit.pages) {
				benefitText += `الصفحات: ${benefit.pages}\n\n`;
			}

			if (benefit.volume) {
				benefitText += `المجلد: ${benefit.volume}\n\n`;
			}
		}

		// Add tags if available
		if (benefit.tags && benefit.tags.length > 0) {
			benefitText += `الوسوم: ${benefit.tags.join(", ")}\n\n`;
		}

		// Add date added
		benefitText += `تاريخ الإضافة: ${benefit.dateAdded}\n`;
		benefitText += `${benefitEnd}\n`;

		return benefitText;
	}

	/**
	 * Updates a benefit in a note
	 * @param filePath - Path to the note file
	 * @param updatedBenefit - Updated benefit data
	 * @returns Whether the operation was successful
	 */
	async updateBenefit(
		filePath: string,
		updatedBenefit: Benefit
	): Promise<boolean> {
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) return false;

			// Read the file content
			let content = await this.app.vault.read(file);

			// Format the updated benefit
			const newBenefitBlock = this.formatBenefitBlock(updatedBenefit);

			// Find and replace the benefit in the content
			const benefitStartTag = `<!-- benefit-start:${updatedBenefit.id} -->`;
			const benefitEndTag = `<!-- benefit-end:${updatedBenefit.id} -->`;

			const startIdx = content.indexOf(benefitStartTag);
			const endIdx =
				content.indexOf(benefitEndTag) + benefitEndTag.length;

			if (startIdx === -1 || endIdx === -1) {
				console.error("Benefit markers not found in content");
				return false;
			}

			// Replace the content
			let updatedContent =
				content.substring(0, startIdx) +
				newBenefitBlock +
				content.substring(endIdx);

			// Update the benefits array in frontmatter
			const metadata =
				this.app.metadataCache.getFileCache(file)?.frontmatter || {};
			const benefits = Array.isArray(metadata.benefits)
				? [...metadata.benefits]
				: [];

			// Find and update the benefit metadata
			const benefitMetadata = {
				id: updatedBenefit.id,
				category: updatedBenefit.category,
				dateAdded: updatedBenefit.dateAdded,
				tags: updatedBenefit.tags || [],
			};

			const index = benefits.findIndex(
				(b) => b && b.id === updatedBenefit.id
			);
			if (index !== -1) {
				benefits[index] = benefitMetadata;
			} else {
				benefits.push(benefitMetadata);
			}

			// Update the frontmatter with the new benefits array
			updatedContent = this.updateFrontmatter(
				updatedContent,
				"benefits",
				benefits
			);

			// Write the updated content
			await this.app.vault.modify(file, updatedContent);
			return true;
		} catch (error) {
			console.error("Error updating benefit:", error);
			return false;
		}
	}

	/**
	 * Gets all benefits from all notes
	 * @returns Array of all benefits
	 */
	async getAllBenefits(): Promise<Benefit[]> {
		const videosFolder = this.app.vault.getAbstractFileByPath(
			this.settings.defaultFolder
		);
		const booksFolder = this.app.vault.getAbstractFileByPath(
			this.settings.booksSettings.defaultFolder
		);

		const benefits: Benefit[] = [];

		// Get benefits from video files
		if (videosFolder && videosFolder instanceof TFolder) {
			const videoFiles = this.findMarkdownFiles(videosFolder);
			for (const file of videoFiles) {
				const videoBenefits = await this.extractBenefitsFromFile(
					file,
					"video"
				);
				benefits.push(...videoBenefits);
			}
		}

		// Get benefits from book files
		if (booksFolder && booksFolder instanceof TFolder) {
			const bookFiles = this.findMarkdownFiles(booksFolder);
			for (const file of bookFiles) {
				const bookBenefits = await this.extractBenefitsFromFile(
					file,
					"book"
				);
				benefits.push(...bookBenefits);
			}
		}

		return benefits;
	}

	/**
	 * Extracts benefits from a file
	 * @param file - File to extract from
	 * @param type - Content type (book or video)
	 * @returns Array of benefits from the file
	 */
	private async extractBenefitsFromFile(
		file: TFile,
		type: "book" | "video"
	): Promise<Benefit[]> {
		const benefits: Benefit[] = [];

		try {
			const content = await this.app.vault.read(file);
			const cache = this.app.metadataCache.getFileCache(file);

			// Check for benefits in the frontmatter
			const frontmatterBenefits = cache?.frontmatter?.benefits;
			if (!frontmatterBenefits || !Array.isArray(frontmatterBenefits))
				return [];

			// Get source title from frontmatter or filename
			let sourceTitle = "";
			if (type === "book") {
				sourceTitle = cache?.frontmatter?.["العنوان"] || file.basename;
			} else {
				sourceTitle = cache?.frontmatter?.title || file.basename;
			}

			// Extract benefit content using markers
			for (const metaBenefit of frontmatterBenefits) {
				if (!metaBenefit.id) continue;

				// Find the benefit in the content using markers
				const benefitRegex = new RegExp(
					`<!-- benefit-start:${metaBenefit.id} -->([\\s\\S]*?)<!-- benefit-end:${metaBenefit.id} -->`,
					"g"
				);
				const match = benefitRegex.exec(content);

				if (match) {
					const benefitContent = match[1];

					// Extract title
					const titleMatch = benefitContent.match(/### (.*)\n/);
					const title = titleMatch ? titleMatch[1] : "";

					// Extract text and metadata from content
					let text = "";
					let pages = "";
					let volume = "";

					const lines = benefitContent.split("\n");
					let inTextBlock = false;

					for (const line of lines) {
						// Start capture after title
						if (!inTextBlock && line.startsWith("### ")) {
							inTextBlock = true;
							continue;
						}

						// Extract pages and volume for books
						if (line.startsWith("الصفحات: ")) {
							pages = line.replace("الصفحات: ", "").trim();
							continue;
						}

						if (line.startsWith("المجلد: ")) {
							volume = line.replace("المجلد: ", "").trim();
							continue;
						}

						// Stop capture at metadata lines
						if (
							inTextBlock &&
							(line.startsWith("الوسوم:") ||
								line.startsWith("تاريخ الإضافة:") ||
								line.startsWith("الصفحات:") ||
								line.startsWith("المجلد:"))
						) {
							break;
						}

						// Add line to text block
						if (inTextBlock) {
							text += (text ? "\n" : "") + line;
						}
					}

					// Determine if title is custom or just category
					const category = metaBenefit.category || "عامة";
					const finalTitle = title === category ? "" : title;

					// Create benefit object
					benefits.push({
						id: metaBenefit.id,
						title: finalTitle,
						text: text.trim(),
						category: category,
						sourceTitle: sourceTitle,
						sourcePath: file.path,
						sourceType: type,
						dateAdded:
							metaBenefit.dateAdded ||
							formatDate(
								new Date(file.stat.ctime),
								this.settings.dateFormat
							),
						tags: metaBenefit.tags || [],
						pages: pages,
						volume: volume,
					});
				}
			}
		} catch (error) {
			console.error(
				`Error extracting benefits from ${file.path}:`,
				error
			);
		}

		return benefits;
	}

	/**
	 * Gets sources with benefits count
	 * @returns Array of source info with benefit counts
	 */
	async getBenefitSources(): Promise<
		{ path: string; count: number; title: string; type: "book" | "video" }[]
	> {
		const benefits = await this.getAllBenefits();

		// Group benefits by source path
		const sourceGroups: {
			[path: string]: {
				count: number;
				title: string;
				type: "book" | "video";
			};
		} = {};

		benefits.forEach((benefit) => {
			if (!sourceGroups[benefit.sourcePath]) {
				sourceGroups[benefit.sourcePath] = {
					count: 0,
					title: benefit.sourceTitle,
					type: benefit.sourceType,
				};
			}
			sourceGroups[benefit.sourcePath].count++;
		});

		// Convert to array format
		return Object.keys(sourceGroups).map((path) => ({
			path,
			count: sourceGroups[path].count,
			title: sourceGroups[path].title,
			type: sourceGroups[path].type,
		}));
	}

	/**
	 * Counts benefits in a source
	 * @param sourcePath - Path to the source file
	 * @returns Number of benefits
	 */
	async countBenefits(sourcePath: string): Promise<number> {
		const benefits = await this.getAllBenefits();
		return benefits.filter((b) => b.sourcePath === sourcePath).length;
	}

	/**
	 * Gets list of existing benefit categories
	 * @returns Array of category names
	 */
	async getCategoryList(): Promise<string[]> {
		const benefits = await this.getAllBenefits();
		const categories = new Set<string>();

		benefits.forEach((benefit) => {
			if (benefit.category) {
				categories.add(benefit.category);
			}
		});

		return Array.from(categories).sort();
	}

	/**
	 * Gets list of existing benefit tags
	 * @returns Array of tag names
	 */
	async getTagList(): Promise<string[]> {
		const benefits = await this.getAllBenefits();
		const tags = new Set<string>();

		benefits.forEach((benefit) => {
			if (benefit.tags && Array.isArray(benefit.tags)) {
				benefit.tags.forEach((tag) => tags.add(tag));
			}
		});

		return Array.from(tags).sort();
	}
}
