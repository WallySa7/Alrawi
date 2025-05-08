// src/utils/templateEditorUtils.ts
/**
 * Utility functions for editing templates while preserving frontmatter
 */

/**
 * Splits a template into frontmatter and content sections
 * @param template The full template string
 * @returns Object containing frontmatter and content parts
 */
export function splitTemplate(template: string): { frontmatter: string; content: string } {
    // Match the frontmatter section (between triple dashes)
    const frontmatterMatch = template.match(/^---\n([\s\S]*?)\n---\n/);
    
    if (!frontmatterMatch) {
        // If no frontmatter is found, return empty frontmatter and the whole template as content
        return {
            frontmatter: '',
            content: template
        };
    }
    
    // Extract the frontmatter with the surrounding triple dashes
    const frontmatterWithMarkers = frontmatterMatch[0];
    
    // The content is everything after the frontmatter
    const content = template.substring(frontmatterWithMarkers.length);
    
    // Return the frontmatter (without markers) and content separately
    return {
        frontmatter: frontmatterMatch[1],
        content: content.trim()
    };
}

/**
 * Combines frontmatter and content into a full template
 * @param frontmatter The frontmatter string (without markers)
 * @param content The content string
 * @returns The combined template
 */
export function combineTemplate(frontmatter: string, content: string): string {
    if (!frontmatter.trim()) {
        return content;
    }
    
    return `---\n${frontmatter.trim()}\n---\n\n${content.trim()}`;
}

/**
 * Updates only the content part of a template, preserving the frontmatter
 * @param originalTemplate The original full template
 * @param newContent The new content to use (without frontmatter)
 * @returns The updated template with original frontmatter and new content
 */
export function updateTemplateContent(originalTemplate: string, newContent: string): string {
    const { frontmatter } = splitTemplate(originalTemplate);
    return combineTemplate(frontmatter, newContent);
}