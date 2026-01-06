import { setIcon } from 'obsidian';

export function createSearchInput(containerEl: HTMLElement): {
    container: HTMLElement;
    input: HTMLInputElement;
    matchCountEl: HTMLElement;
} {
    const searchContainer = containerEl.createDiv('fuzzy-explorer-search-container');

    // IMPORTANT: Hide by default
    searchContainer.style.display = 'none';
    searchContainer.addClass('fuzzy-search-hidden');

    const searchInput = searchContainer.createEl('input', {
        type: 'text',
        placeholder: 'Search files... (try: -folder:Archive file:report)',
        cls: 'fuzzy-explorer-search-input'
    });

    // CHANGE: Create clear button with icon instead of div
    const clearBtn = searchContainer.createEl('button', {
        cls: 'fuzzy-explorer-clear-btn search-input-clear-button'
    });
    clearBtn.setAttribute("aria-label", "Clear search");
    clearBtn.style.display = "none";

    // Add X icon
    setIcon(clearBtn, "x");

    const matchCountEl = searchContainer.createDiv('fuzzy-match-count');

    searchInput.addEventListener('input', () => {
        clearBtn.style.display = searchInput.value.length > 0 ? 'flex' : 'none';
    });

    return {
        container: searchContainer,
        input: searchInput,
        matchCountEl: matchCountEl
    };
}

// NEW: Export toggle function
export function toggleSearchBar(searchContainer: HTMLElement): boolean {
    const isHidden = searchContainer.hasClass('fuzzy-search-hidden');

    if (isHidden) {
        searchContainer.removeClass('fuzzy-search-hidden');
        searchContainer.style.display = '';
        // Focus the input when showing
        const input = searchContainer.querySelector('input');
        if (input) {
            setTimeout(() => input.focus(), 50);
        }
        return true; // Now visible
    } else {
        searchContainer.addClass('fuzzy-search-hidden');
        searchContainer.style.display = 'none';
        return false; // Now hidden
    }
}
