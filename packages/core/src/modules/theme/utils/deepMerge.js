/**
 * Deep Merge Utility
 *
 * Deeply merges objects, handling arrays and special cases.
 */
/**
 * Check if value is a plain object
 */
function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/**
 * Deep merge two objects
 *
 * @param target - Base object
 * @param source - Object to merge into target
 * @returns Merged object
 */
export function deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            const sourceValue = source[key];
            const targetValue = target[key];
            if (sourceValue === undefined) {
                // Explicitly set undefined to allow clearing values
                result[key] = undefined;
            }
            else if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
                // Recursively merge objects
                result[key] = deepMerge(targetValue, sourceValue);
            }
            else if (Array.isArray(sourceValue)) {
                // Replace arrays entirely
                result[key] = [...sourceValue];
            }
            else {
                // Replace primitive values
                result[key] = sourceValue;
            }
        }
    }
    return result;
}
/**
 * Deep merge multiple objects
 *
 * @param target - Base object
 * @param sources - Objects to merge
 * @returns Merged object
 */
export function deepMergeAll(target, ...sources) {
    return sources.reduce((acc, source) => deepMerge(acc, source), target);
}
