/**
 * Utilities for date and time operations
 */

// Standard date format used throughout the application
export const DEFAULT_DATE_FORMAT = "YYYY-MM-DD";

/**
 * Formats a date according to the specified format string
 *
 * @param date - The date to format
 * @param format - Format string (e.g., 'YYYY-MM-DD', 'YYYY/MM/DD HH:mm:ss')
 * @returns Formatted date string
 * @example
 * // Returns "2023-05-15"
 * formatDate(new Date(2023, 4, 15), 'YYYY-MM-DD');
 */
export function formatDate(date: Date, format: string): string {
	// Validate input
	if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
		console.warn("Invalid date provided to formatDate", date);
		return "";
	}

	// Helper to pad numbers with leading zeros
	const pad = (num: number): string => num.toString().padStart(2, "0");

	// Define replacements for format patterns
	const replacements: Record<string, string> = {
		YYYY: date.getFullYear().toString(),
		MM: pad(date.getMonth() + 1),
		DD: pad(date.getDate()),
		HH: pad(date.getHours()),
		mm: pad(date.getMinutes()),
		ss: pad(date.getSeconds()),
	};

	// Apply replacements
	let result = format;
	for (const [pattern, value] of Object.entries(replacements)) {
		result = result.replace(new RegExp(pattern, "g"), value);
	}

	return result;
}

/**
 * Parses a date string in YYYY-MM-DD format
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date object or null if invalid
 * @example
 * // Returns Date object for May 15, 2023
 * parseDate('2023-05-15');
 */
export function parseDate(dateStr: string): Date | null {
	if (!dateStr) return null;

	// Check if the string matches YYYY-MM-DD format
	const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!match) return null;

	const year = parseInt(match[1], 10);
	const month = parseInt(match[2], 10) - 1; // JS months are 0-based
	const day = parseInt(match[3], 10);

	const date = new Date(year, month, day);

	// Validate date components (handles invalid dates like 2023-02-31)
	if (
		date.getFullYear() !== year ||
		date.getMonth() !== month ||
		date.getDate() !== day
	) {
		return null;
	}

	return date;
}

/**
 * Gets today's date in YYYY-MM-DD format
 *
 * @returns Today's date formatted as YYYY-MM-DD
 * @example
 * // If today is May 15, 2023, returns "2023-05-15"
 * getTodayFormatted();
 */
export function getTodayFormatted(): string {
	return formatDate(new Date(), DEFAULT_DATE_FORMAT);
}

/**
 * Converts a date object to the beginning of the day (00:00:00)
 *
 * @param date - The date to convert
 * @returns New date set to the beginning of the day
 * @example
 * // Returns Date object for May 15, 2023 00:00:00
 * startOfDay(new Date(2023, 4, 15, 14, 30));
 */
export function startOfDay(date: Date): Date {
	const result = new Date(date);
	result.setHours(0, 0, 0, 0);
	return result;
}

/**
 * Calculates the difference in days between two dates
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Number of days between the dates
 * @example
 * // Returns 5
 * daysBetween(new Date(2023, 4, 10), new Date(2023, 4, 15));
 */
export function daysBetween(date1: Date, date2: Date): number {
	// Convert both dates to start of day to ignore time components
	const start = startOfDay(date1);
	const end = startOfDay(date2);

	// Calculate difference in milliseconds and convert to days
	const diffMs = Math.abs(end.getTime() - start.getTime());
	return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
