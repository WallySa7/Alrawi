/**
 * Utilities for array operations
 */

/**
 * Returns a new array with only unique values
 *
 * @param array - The input array to filter
 * @returns A new array containing only unique values
 * @example
 * // Returns [1, 2, 3]
 * uniqueValues([1, 2, 2, 3, 1]);
 */
export function uniqueValues<T>(array: T[]): T[] {
	if (!Array.isArray(array)) {
		return [];
	}

	// Use a Set to efficiently remove duplicates
	return [...new Set(array)];
}

/**
 * Groups array items by a specified key function
 *
 * @param array - The array to group
 * @param keyFn - Function to extract the key for grouping
 * @returns An object with keys mapped to arrays of matching items
 * @example
 * // Returns { "A": [{"name": "Apple"}, {"name": "Apricot"}], "B": [{"name": "Banana"}] }
 * groupBy([{name: "Apple"}, {name: "Banana"}, {name: "Apricot"}], item => item.name[0]);
 */
export function groupBy<T>(
	array: T[],
	keyFn: (item: T) => string
): Record<string, T[]> {
	if (!Array.isArray(array) || typeof keyFn !== "function") {
		return {};
	}

	// Use reduce for a single pass through the array
	return array.reduce((result, item) => {
		const key = keyFn(item);
		// Initialize array if key doesn't exist yet
		if (!result[key]) {
			result[key] = [];
		}
		result[key].push(item);
		return result;
	}, {} as Record<string, T[]>);
}
