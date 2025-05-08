/**
 * Utilities for template rendering and processing
 */

/**
 * A template consists of frontmatter (metadata) and content.
 * These functions handle:
 * - Rendering templates with dynamic values
 * - Splitting templates into frontmatter and content sections
 * - Combining frontmatter and content
 */

/**
 * Interface representing a template split into sections
 */
export interface TemplateSections {
	/** The frontmatter content (without the --- markers) */
	frontmatter: string;
	/** The main content section */
	content: string;
}

/**
 * Renders a template by replacing placeholders with data values
 * and processing conditional sections
 *
 * @param template - Template string with {{placeholders}} and conditionals
 * @param data - Data object with values to inject
 * @returns Rendered string with placeholders replaced
 * @example
 * // Returns "Hello John, you are 30 years old"
 * renderTemplate("Hello {{name}}, you are {{age}} years old", { name: "John", age: 30 });
 */
export function renderTemplate(
	template: string,
	data: Record<string, any>
): string {
	if (!template) return "";
	if (!data) return template;

	let result = template;

	// Replace variables
	for (const [key, value] of Object.entries(data)) {
		if (value === undefined || value === null) continue;

		const placeholder = `{{${key}}}`;
		let replacementValue: string;

		if (typeof value === "object") {
			replacementValue = JSON.stringify(value);
		} else {
			replacementValue = value.toString();
		}

		// Global replace all instances of the placeholder
		result = result.replace(new RegExp(placeholder, "g"), replacementValue);
	}

	// Handle conditionals - {{#if variable}}content{{/if}}
	result = result.replace(
		/\{\{#if\s+(.+?)\}\}([\s\S]+?)\{\{\/if\}\}/g,
		(match, condition, content) => {
			const conditionVar = condition.trim();
			// Check if condition variable exists and is truthy
			return data[conditionVar] ? content : "";
		}
	);

	// Remove any remaining undefined placeholders
	result = result.replace(/\{\{.+?\}\}/g, "");

	return result;
}

/**
 * Splits a template into frontmatter and content sections
 *
 * @param template - The full template string
 * @returns Object containing frontmatter and content parts
 * @example
 * // Returns { frontmatter: "title: My Document", content: "# My Document\n\nContent here" }
 * splitTemplate("---\ntitle: My Document\n---\n\n# My Document\n\nContent here");
 */
export function splitTemplate(template: string): TemplateSections {
	if (!template) {
		return { frontmatter: "", content: "" };
	}

	// Match the frontmatter section (between triple dashes)
	const frontmatterMatch = template.match(/^---\n([\s\S]*?)\n---\n/);

	if (!frontmatterMatch) {
		// If no frontmatter is found, return empty frontmatter and the whole template as content
		return {
			frontmatter: "",
			content: template.trim(),
		};
	}

	// Extract the frontmatter with the surrounding triple dashes
	const frontmatterWithMarkers = frontmatterMatch[0];

	// The content is everything after the frontmatter
	const content = template.substring(frontmatterWithMarkers.length);

	// Return the frontmatter (without markers) and content separately
	return {
		frontmatter: frontmatterMatch[1].trim(),
		content: content.trim(),
	};
}

/**
 * Combines frontmatter and content into a full template
 *
 * @param frontmatter - The frontmatter string (without markers)
 * @param content - The content string
 * @returns The combined template
 * @example
 * // Returns "---\ntitle: My Document\n---\n\n# My Document\n\nContent here"
 * combineTemplate("title: My Document", "# My Document\n\nContent here");
 */
export function combineTemplate(frontmatter: string, content: string): string {
	// Handle empty or undefined inputs
	const fm = frontmatter?.trim() || "";
	const cnt = content?.trim() || "";

	// If no frontmatter, just return the content
	if (!fm) {
		return cnt;
	}

	// Combine with proper spacing
	return `---\n${fm}\n---\n\n${cnt}`;
}

/**
 * Updates only the content part of a template, preserving the frontmatter
 *
 * @param originalTemplate - The original full template
 * @param newContent - The new content to use (without frontmatter)
 * @returns The updated template with original frontmatter and new content
 * @example
 * // Updates just the content while preserving frontmatter
 * updateTemplateContent(originalTemplate, "# New Content");
 */
export function updateTemplateContent(
	originalTemplate: string,
	newContent: string
): string {
	const { frontmatter } = splitTemplate(originalTemplate);
	return combineTemplate(frontmatter, newContent);
}
