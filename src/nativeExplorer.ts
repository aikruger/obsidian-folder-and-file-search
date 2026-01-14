import { FileExplorerView, FileItem } from './types';
import FuzzyExplorerPlugin from './main';
import { createSearchButton, setSearchButtonActive } from './ui/searchButton';
import { createSearchInput, toggleSearchBar } from './ui/searchInput';
import { highlightMatches } from './ui/highlighting';
import { FilterResult } from './logic/explorerFilter';
import { EventRef } from 'obsidian';

export class NativeSearchInstance {
    plugin: FuzzyExplorerPlugin;
    view: FileExplorerView;
    searchContainer: HTMLElement;
    searchInput: HTMLInputElement;
    matchCountEl: HTMLElement;
    searchButton: HTMLElement;
    isSearchVisible: boolean = false;
    debounceTimer: number;
    mutationObserver: MutationObserver;

    constructor(plugin: FuzzyExplorerPlugin, view: FileExplorerView) {
        this.plugin = plugin;
        this.view = view;
        this.injectUI();
        this.setupMutationObserver();
    }

    injectUI() {
        // Inject Search Button into Header
        const header = this.view.headerDom;
        if (header) {
            let buttonsContainer = header.querySelector('.nav-buttons-container') as HTMLElement;
            if (!buttonsContainer) {
                buttonsContainer = header.createDiv('nav-buttons-container');
                header.appendChild(buttonsContainer);
            }

            const existingBtn = buttonsContainer.querySelector('.native-fuzzy-search-btn');
            if (existingBtn) existingBtn.remove();

            this.searchButton = createSearchButton(buttonsContainer, () => this.toggleSearch());
            this.searchButton.addClass('native-fuzzy-search-btn');
        }

        // Inject Search Input
        const filesContainer = this.view.containerEl.querySelector('.nav-files-container');
        const searchUI = createSearchInput(this.view.containerEl);
        this.searchContainer = searchUI.container;
        this.searchInput = searchUI.input;
        this.matchCountEl = searchUI.matchCountEl;

        this.searchContainer.addClass('native-fuzzy-search-container');

        if (filesContainer) {
            this.view.containerEl.insertBefore(this.searchContainer, filesContainer);
        } else {
             this.view.containerEl.appendChild(this.searchContainer);
        }

        this.searchInput.addEventListener('input', (e) => {
            this.onSearchInput((e.target as HTMLInputElement).value);
        });

        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.toggleSearch();
                e.preventDefault();
            }
        });

        const clearBtn = this.searchContainer.querySelector('.fuzzy-explorer-clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearFilter();
            });
        }
    }

    setupMutationObserver() {
        const filesContainer = this.view.containerEl.querySelector('.nav-files-container');
        if (!filesContainer) return;

        this.mutationObserver = new MutationObserver((mutations) => {
            if (this.isSearchVisible && this.searchInput.value) {
                // If new nodes are added (e.g. folder expanded), re-apply filter
                let shouldUpdate = false;
                for (const mutation of mutations) {
                    if (mutation.addedNodes.length > 0) {
                        shouldUpdate = true;
                        break;
                    }
                }
                if (shouldUpdate) {
                    this.applyFilter(this.searchInput.value);
                }
            }
        });

        this.mutationObserver.observe(filesContainer, { childList: true, subtree: true });
    }

    toggleSearch() {
        this.isSearchVisible = toggleSearchBar(this.searchContainer);
        if (this.searchButton) {
            setSearchButtonActive(this.searchButton, this.isSearchVisible);
        }

        if (this.isSearchVisible) {
            this.searchInput.focus();
            if (this.searchInput.value) {
                this.applyFilter(this.searchInput.value);
            }
        } else {
            this.clearFilter();
        }
    }

    onSearchInput(value: string) {
        window.clearTimeout(this.debounceTimer);
        this.debounceTimer = window.setTimeout(() => {
            this.applyFilter(value);
        }, 250);
    }

    applyFilter(searchTerm: string) {
        if (!searchTerm) {
            this.clearItems();
            return;
        }

        const results = this.plugin.filterLogic.buildFilterResults(this.plugin.app.vault, searchTerm);
        let matchCount = 0;
        const items = this.view.fileItems;

        for (const path in items) {
            const item = items[path];
            if (!item || !item.el) continue;

            const result = results.get(path);

            if (result && result.shouldShow) {
                this.showItem(item, searchTerm, result);
                if (result.matchType === 'file_match' || result.matchType === 'folder_match') {
                    matchCount++;
                }
            } else {
                this.hideItem(item);
            }
        }

        this.updateMatchCount(matchCount);
    }

    clearFilter() {
        if (this.searchInput.value === '') return;
        this.searchInput.value = '';
        this.clearItems();
        this.updateMatchCount(0);

        const clearBtn = this.searchContainer.querySelector('.fuzzy-explorer-clear-btn');
        if (clearBtn) (clearBtn as HTMLElement).style.display = 'none';
    }

    clearItems() {
        const items = this.view.fileItems;
        for (const path in items) {
            const item = items[path];
            if (item && item.el) {
                item.el.removeClass('fuzzy-explorer-hidden');
                item.el.addClass('fuzzy-explorer-visible');

                const titleEl = item.el.querySelector('.nav-file-title-content, .nav-folder-title-content') as HTMLElement;
                if (titleEl) titleEl.setText(item.file.name);
            }
        }
    }

    showItem(item: FileItem, searchTerm?: string, result?: FilterResult) {
        item.el.removeClass('fuzzy-explorer-hidden');
        item.el.addClass('fuzzy-explorer-visible');

        const titleEl = item.el.querySelector('.nav-file-title-content, .nav-folder-title-content') as HTMLElement;
        if (titleEl) {
             if (this.plugin.settings.highlightMatches && searchTerm && result && result.matchType !== 'none') {
                highlightMatches(titleEl, item.file.name, searchTerm, this.plugin.settings.caseSensitive);
            } else {
                titleEl.setText(item.file.name);
            }
        }
    }

    hideItem(item: FileItem) {
        item.el.addClass('fuzzy-explorer-hidden');
        item.el.removeClass('fuzzy-explorer-visible');
    }

    updateMatchCount(count: number) {
        if (this.matchCountEl && this.plugin.settings.showMatchCount) {
            this.matchCountEl.setText(count > 0 ? `${count} matches` : '');
            this.matchCountEl.style.display = count > 0 ? 'block' : 'none';
        } else {
            this.matchCountEl.style.display = 'none';
        }
    }

    destroy() {
        if (this.searchButton) this.searchButton.remove();
        if (this.searchContainer) this.searchContainer.remove();
        if (this.mutationObserver) this.mutationObserver.disconnect();
        this.clearItems();
    }
}

export class NativeSearchManager {
    plugin: FuzzyExplorerPlugin;
    instances: Map<FileExplorerView, NativeSearchInstance> = new Map();
    layoutEventRef: EventRef | null = null;

    constructor(plugin: FuzzyExplorerPlugin) {
        this.plugin = plugin;
    }

    enable() {
        this.patchAllLeaves();

        if (this.layoutEventRef) return;

        this.layoutEventRef = this.plugin.app.workspace.on('layout-change', () => {
            this.patchAllLeaves();
        });
    }

    disable() {
        if (this.layoutEventRef) {
            this.plugin.app.workspace.offref(this.layoutEventRef);
            this.layoutEventRef = null;
        }

        for (const instance of this.instances.values()) {
            instance.destroy();
        }
        this.instances.clear();
    }

    patchAllLeaves() {
        const currentViews = new Set<FileExplorerView>();
        const leaves = this.plugin.app.workspace.getLeavesOfType('file-explorer');
        for (const leaf of leaves) {
            const view = leaf.view as FileExplorerView;
            currentViews.add(view);
            if (!this.instances.has(view)) {
                this.instances.set(view, new NativeSearchInstance(this.plugin, view));
            }
        }

        // Remove instances for closed views
        for (const [view, instance] of this.instances.entries()) {
            if (!currentViews.has(view)) {
                instance.destroy();
                this.instances.delete(view);
            }
        }
    }

    toggleSearch(view: FileExplorerView) {
        const instance = this.instances.get(view);
        if (instance) {
            instance.toggleSearch();
        }
    }
}
