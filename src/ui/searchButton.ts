import { setIcon } from 'obsidian';

export function createSearchButton(container: HTMLElement, onClick: () => void): HTMLElement {
    const searchBtn = container.createDiv('clickable-icon nav-action-button');
    searchBtn.setAttribute('aria-label', 'Search files and folders');

    // Use Obsidian's built-in search icon
    setIcon(searchBtn, 'search');

    searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
    });

    return searchBtn;
}

export function setSearchButtonActive(button: HTMLElement, active: boolean): void {
    if (active) {
        button.addClass('is-active');
    } else {
        button.removeClass('is-active');
    }
}
