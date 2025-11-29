// src/utils/fastCompare.ts

import { FilterResult } from '../logic/explorerFilter';

/**
 * Fast shallow comparison for FilterResult objects
 * Replaces expensive JSON.stringify comparisons
 */
export function compareFilterResults(
    a: FilterResult | undefined,
    b: FilterResult | undefined
): boolean {
    // Handle undefined cases
    if (a === undefined && b === undefined) return true;
    if (a === undefined || b === undefined) return false;

    // Compare primitive properties directly
    return a.matchType === b.matchType && a.shouldShow === b.shouldShow;
}
