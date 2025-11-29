export function createSearchInput(containerEl: HTMLElement): HTMLElement {
    const searchContainer = containerEl.createDiv('fuzzy-explorer-search-container');
    const searchInput = searchContainer.createEl('input', {
        type: 'text',
        placeholder: 'Fuzzy search files...',
        cls: 'fuzzy-explorer-search-input'
    });

    const clearBtn = searchContainer.createEl('div', {
        cls: 'fuzzy-explorer-clear-btn search-input-clear-button',
    });

    searchContainer.createDiv('fuzzy-match-count');

    // Handle visibility of clear button
    searchInput.addEventListener('input', () => {
        clearBtn.style.display = searchInput.value.length > 0 ? 'block' : 'none';
    });
    clearBtn.style.display = 'none'; // Initially hidden

    return searchContainer;
}
