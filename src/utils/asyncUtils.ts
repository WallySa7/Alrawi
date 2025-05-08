/**
 * Utilities for asynchronous operations
 */

/**
 * Creates a debounced version of a function that delays execution until after
 * the specified wait period has elapsed since the last call
 *
 * @param func - The function to debounce
 * @param waitFor - Delay in milliseconds
 * @returns A debounced function that returns a Promise with the result
 * @example
 * // Creates a debounced search function that only executes after 300ms of inactivity
 * const debouncedSearch = debounce(search, 300);
 */
export function debounce<F extends (...args: any[]) => any>(
	func: F,
	waitFor: number
): (...args: Parameters<F>) => Promise<ReturnType<F>> {
	let timeoutId: number | null = null;

	return (...args: Parameters<F>): Promise<ReturnType<F>> => {
		// Clear previous timeout if it exists
		if (timeoutId !== null) {
			window.clearTimeout(timeoutId);
			timeoutId = null;
		}

		// Create a new promise to handle the debounced function call
		return new Promise((resolve) => {
			timeoutId = window.setTimeout(() => {
				resolve(func(...args));
			}, waitFor);
		});
	};
}

/**
 * Creates a throttled version of a function that limits execution to once per
 * specified time period, regardless of how many times it's called
 *
 * @param func - The function to throttle
 * @param limit - Time limit in milliseconds
 * @returns A throttled function
 * @example
 * // Creates a throttled scroll handler that executes at most once every 100ms
 * const throttledScroll = throttle(handleScroll, 100);
 */
export function throttle<F extends (...args: any[]) => any>(
	func: F,
	limit: number
): (...args: Parameters<F>) => void {
	let inThrottle = false;
	let lastResult: ReturnType<F>;

	return function (this: any, ...args: Parameters<F>): ReturnType<F> {
		if (!inThrottle) {
			inThrottle = true;
			lastResult = func.apply(this, args);

			setTimeout(() => {
				inThrottle = false;
			}, limit);
		}

		return lastResult;
	};
}
