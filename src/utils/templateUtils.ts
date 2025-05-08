// src/utils/templateUtils.ts
/**
 * Utility functions for template rendering
 */

/**
 * Renders a template by replacing placeholders with data values
 * @param template Template string with {{placeholders}}
 * @param data Data object with values to inject
 * @returns Rendered string with placeholders replaced
 */
export function renderTemplate(template: string, data: Record<string, any>): string {
    if (!template) return '';
    if (!data) return template;
    
    let result = template;
    
    // Replace variables
    for (const [key, value] of Object.entries(data)) {
        if (value === undefined || value === null) continue;
        
        const placeholder = `{{${key}}}`;
        let replacementValue: string;
        
        if (typeof value === 'object') {
            replacementValue = JSON.stringify(value);
        } else {
            replacementValue = value.toString();
        }
        
        result = result.replace(new RegExp(placeholder, 'g'), replacementValue);
    }

    // Handle conditionals - {{#if variable}}content{{/if}}
    result = result.replace(/\{\{#if (.+?)\}\}([\s\S]+?)\{\{\/if\}\}/g, (match, condition, content) => {
        const conditionVar = condition.trim();
        return data[conditionVar] ? content : '';
    });

    // Remove any remaining undefined placeholders
    result = result.replace(/\{\{.+?\}\}/g, '');

    return result;
}