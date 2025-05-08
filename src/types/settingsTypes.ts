// src/types/settingsTypes.ts
/**
 * Settings types for the plugin
 */

/**
 * Table column configuration
 */
export interface TableColumnConfig {
    /** Unique identifier for the column */
    id: string;
    /** Whether the column is visible */
    enabled: boolean;
    /** Order in the table (0-based index) */
    order: number;
    /** Display label for the column */
    label: string;
    /** Key used for sorting (if different from id) */
    sortKey?: string;
}