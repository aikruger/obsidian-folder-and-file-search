// src/ui/highlighting.ts

// Cache for highlighted content to avoid redundant operations
const highlightCache = new Map<string, string>();

/**
 * OPTIMIZED: Use DocumentFragment for better performance
 */
export function highlightMatches(
    element: HTMLElement,
    text: string,
    pattern: string,
    caseSensitive: boolean = false
): void {
    if (!pattern) {
        element.innerText = text;
        return;
    }

    // Generate cache key
    const cacheKey = `${text}:${pattern}:${caseSensitive}`;

    // Check cache first
    if (highlightCache.has(cacheKey)) {
        element.innerHTML = highlightCache.get(cacheKey)!;
        return;
    }

    const a = caseSensitive ? text : text.toLowerCase();
    const b = caseSensitive ? pattern : pattern.toLowerCase();
    const indices: number[] = [];

    let patternIdx = 0;
    let textIdx = 0;

    while (textIdx < a.length && patternIdx < b.length) {
        if (a[textIdx] === b[patternIdx]) {
            indices.push(textIdx);
            patternIdx++;
        }
        textIdx++;
    }

    if (indices.length !== pattern.length) {
        element.innerText = text;
        return;
    }

    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;

    for (const index of indices) {
        // Add text before highlight
        if (index > lastIndex) {
            fragment.appendChild(
                document.createTextNode(text.substring(lastIndex, index))
            );
        }

        // Add highlighted character
        const span = document.createElement('span');
        span.className = 'fuzzy-match-highlight';
        span.textContent = text[index];
        fragment.appendChild(span);

        lastIndex = index + 1;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        fragment.appendChild(
            document.createTextNode(text.substring(lastIndex))
        );
    }

    // Single DOM operation
    element.textContent = ''; // Faster than .empty()
    element.appendChild(fragment);

    // Cache the result (limit cache size)
    if (highlightCache.size > 1000) {
        // Clear oldest entries
        const keysToDelete = Array.from(highlightCache.keys()).slice(0, 500);
        keysToDelete.forEach(key => highlightCache.delete(key));
    }
    highlightCache.set(cacheKey, element.innerHTML);
}

/**
 * Clear highlight cache (call when settings change)
 */
export function clearHighlightCache(): void {
    highlightCache.clear();
}
