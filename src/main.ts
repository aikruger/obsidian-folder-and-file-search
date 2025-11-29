import { Plugin, TFolder } from 'obsidian';
import { FuzzyExplorerSettings, DEFAULT_SETTINGS, FuzzyExplorerSettingTab } from './settings';
import { createSearchInput, toggleSearchBar } from './ui/searchInput';
import { createSearchButton, setSearchButtonActive } from './ui/searchButton';
import { ExplorerFilter, FilterResult } from './logic/explorerFilter';
import { FileExplorerView, FileItem } from './types';
import { highlightMatches } from './ui/highlighting';
import { addMatchIndicator, removeMatchIndicator } from './ui/matchIndicators';
import { ErrorHandler } from './utils/errorHandler';
import { compareFilterResults } from './utils/fastCompare';
import { BatchUpdater } from './utils/batchUpdates';

interface ExplorerState {
    expandedFolders: Map<string, boolean>;
    scrollPosition: number;
}

export default class FuzzyExplorerPlugin extends Plugin {
    settings: FuzzyExplorerSettings;
    searchInput: HTMLInputElement | null = null;
    searchContainer: HTMLElement | null = null;
    searchButton: HTMLElement | null = null;
    matchCountEl: HTMLElement | null = null;
    filterLogic: ExplorerFilter;
    originalExplorerState: ExplorerState | null = null;
    previousFilterResults: Map<string, FilterResult> = new Map();
    debounceTimer: number;
    isSearchVisible = false;
    private batchUpdater: BatchUpdater | null = null;

    async onload() {
        await this.loadSettings();
        this.filterLogic = new ExplorerFilter(this.app, this.settings);

        this.batchUpdater = new BatchUpdater(
            (hideBatch, showBatch) => this.executeBatchedUpdates(hideBatch, showBatch)
        );

        this.app.workspace.onLayoutReady(() => {
            this.initSearchUI();
        });

        this.addSettingTab(new FuzzyExplorerSettingTab(this.app, this));
    }

    onunload() {
        if (this.batchUpdater) {
            this.batchUpdater.cancel();
        }
        this.clearFilter();
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    initSearchUI(): void {
        const explorer = this.getFileExplorer();
        if (!explorer) {
            setTimeout(() => this.initSearchUI(), 500);
            return;
        }

        const navButtonsContainer = explorer.containerEl.querySelector('.nav-buttons-container');
        if (!navButtonsContainer || !navButtonsContainer.parentElement) {
            console.error('Fuzzy Explorer: Could not find file explorer button container or its parent.');
            return;
        }

        this.searchButton = createSearchButton(
            navButtonsContainer as HTMLElement,
            () => this.toggleSearch()
        );

        const searchUIElements = createSearchInput(navButtonsContainer.parentElement as HTMLElement);
        this.searchContainer = searchUIElements.container;
        this.searchInput = searchUIElements.input;
        this.matchCountEl = searchUIElements.matchCountEl;

        if (!this.searchInput) return;

        this.registerDomEvent(this.searchInput, 'input', (evt) => {
            this.onSearchInput((evt.target as HTMLInputElement).value);
        });

        const clearBtn = this.searchContainer.querySelector('.fuzzy-explorer-clear-btn');
        if (clearBtn) {
            this.registerDomEvent(clearBtn as HTMLElement, 'click', () => this.clearFilter());
        }

        this.registerDomEvent(this.searchInput, 'keydown', (evt) => {
            if (evt.key === 'Escape') {
                this.toggleSearch();
                evt.preventDefault();
            }
        });
    }

    toggleSearch(): void {
        if (!this.searchContainer || !this.searchButton) return;
        this.isSearchVisible = toggleSearchBar(this.searchContainer);
        setSearchButtonActive(this.searchButton, this.isSearchVisible);
        if (!this.isSearchVisible && this.searchInput) {
            this.clearFilter();
        }
    }

    onSearchInput(value: string): void {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = window.setTimeout(() => this.applyFilter(value), 250);
    }

    getFileExplorer(): FileExplorerView | null {
        const leaves = this.app.workspace.getLeavesOfType('file-explorer');
        if (leaves.length === 0) return null;
        return leaves[0].view as FileExplorerView;
    }

    applyFilter(searchTerm: string): void {
        try {
            const explorer = this.getFileExplorer();
            if (!explorer) return;

            if (!this.originalExplorerState && searchTerm) {
                this.originalExplorerState = this.saveExplorerState();
            }

            if (!searchTerm) {
                this.clearFilter();
                return;
            }

            const newFilterResults = this.filterLogic.buildFilterResults(
                this.app.vault,
                searchTerm
            );

            const entries = Object.entries(explorer.fileItems);

            if (this.settings.enableVirtualScrolling && entries.length > 100) {
                this.applyFilterChunked(entries, newFilterResults, searchTerm);
            } else {
                this.applyFilterImmediate(entries, newFilterResults, searchTerm);
            }
        } catch (error) {
            ErrorHandler.handleFilterError(error as Error, this);
        }
    }

    private applyFilterImmediate(
        entries: Array<[string, any]>,
        newFilterResults: Map<string, FilterResult>,
        searchTerm: string
    ): void {
        let matchCount = 0;

        for (const [path, fileItem] of entries) {
            const newResult = newFilterResults.get(path);
            const oldResult = this.previousFilterResults.get(path);

            if (compareFilterResults(newResult, oldResult)) {
                if (newResult?.shouldShow && (newResult.matchType === 'file_match' || newResult.matchType === 'folder_match')) {
                    matchCount++;
                }
                continue;
            }

            if (!newResult || !newResult.shouldShow) {
                this.batchUpdater?.queueHide(fileItem);
            } else {
                if (newResult.matchType === 'file_match' || newResult.matchType === 'folder_match') {
                    matchCount++;
                }
                this.batchUpdater?.queueShow(fileItem, searchTerm, newResult);
            }
        }

        this.updateMatchCount(matchCount);
        this.previousFilterResults = newFilterResults;
    }

    private applyFilterChunked(
        entries: Array<[string, any]>,
        newFilterResults: Map<string, FilterResult>,
        searchTerm: string
    ): void {
        let matchCount = 0;
        let currentIndex = 0;
        const chunkSize = this.settings.renderChunkSize;

        const processChunk = () => {
            const endIndex = Math.min(currentIndex + chunkSize, entries.length);

            for (let i = currentIndex; i < endIndex; i++) {
                const [path, fileItem] = entries[i];
                const newResult = newFilterResults.get(path);
                const oldResult = this.previousFilterResults.get(path);

                if (compareFilterResults(newResult, oldResult)) {
                    if (newResult?.shouldShow && (newResult.matchType === 'file_match' || newResult.matchType === 'folder_match')) {
                        matchCount++;
                    }
                    continue;
                }

                if (!newResult || !newResult.shouldShow) {
                    this.batchUpdater?.queueHide(fileItem);
                } else {
                    if (newResult.matchType === 'file_match' || newResult.matchType === 'folder_match') {
                        matchCount++;
                    }
                    this.batchUpdater?.queueShow(fileItem, searchTerm, newResult);
                }
            }

            currentIndex = endIndex;
            this.updateMatchCount(matchCount);

            if (currentIndex < entries.length) {
                requestIdleCallback(processChunk, { timeout: 50 });
            } else {
                this.previousFilterResults = newFilterResults;
            }
        };

        processChunk();
    }

    clearFilter(): void {
        if (!this.searchInput || this.searchInput.value === '') return;

        const explorer = this.getFileExplorer();
        if (!explorer) return;

        // Use batch updater to show all items
        for (const fileItem of Object.values(explorer.fileItems)) {
            this.batchUpdater?.queueShow(fileItem);
        }

        if (this.originalExplorerState) {
            this.restoreExplorerState(this.originalExplorerState);
            this.originalExplorerState = null;
        }

        this.searchInput.value = '';
        this.updateMatchCount(0);
        this.previousFilterResults.clear();
        const clearBtn = this.searchContainer?.querySelector('.fuzzy-explorer-clear-btn');
        if (clearBtn) {
            (clearBtn as HTMLElement).style.display = 'none';
        }
    }

    updateMatchCount(count: number): void {
        if (!this.matchCountEl) return;
        if (this.settings.showMatchCount) {
            this.matchCountEl.setText(count > 0 ? `${count} matches` : '');
            this.matchCountEl.style.display = count > 0 ? 'block' : 'none';
        } else {
            this.matchCountEl.style.display = 'none';
        }
    }

    saveExplorerState(): ExplorerState {
        const explorer = this.getFileExplorer();
        const expandedFolders = new Map<string, boolean>();
        let scrollPosition = 0;

        if (explorer) {
            for (const [path, item] of Object.entries(explorer.fileItems)) {
                if (item.file instanceof TFolder) {
                    expandedFolders.set(path, item.collapsed ?? true);
                }
            }
            scrollPosition = explorer.containerEl.scrollTop;
        }
        return { expandedFolders, scrollPosition };
    }

    restoreExplorerState(state: ExplorerState): void {
        const explorer = this.getFileExplorer();
        if (!explorer) return;

        for (const [path, item] of Object.entries(explorer.fileItems)) {
            if (item.file instanceof TFolder && state.expandedFolders.has(path)) {
                item.collapsed = state.expandedFolders.get(path) ?? true;
            }
        }
        explorer.containerEl.scrollTop = state.scrollPosition;
    }


    private executeBatchedUpdates(
        hideBatch: Set<FileItem>,
        showBatch: Map<FileItem, { searchTerm?: string; result?: FilterResult }>
    ): void {
        for (const fileItem of hideBatch) {
            fileItem.el.addClass('fuzzy-explorer-hidden');
            fileItem.el.removeClass('fuzzy-explorer-visible');
            removeMatchIndicator(fileItem);
        }

        for (const [fileItem, data] of showBatch) {
            fileItem.el.removeClass('fuzzy-explorer-hidden');
            fileItem.el.addClass('fuzzy-explorer-visible');

            const nameEl = fileItem.el.querySelector('.nav-file-title-content') as HTMLElement;
            if (!nameEl) continue;

            const fileName = fileItem.file.name;

            // Handle filter clearing
            if (!data.searchTerm || !data.result) {
                nameEl.innerText = fileName;
                removeMatchIndicator(fileItem);
                continue;
            }

            // Handle active filtering
            if (this.settings.highlightMatches && data.result.matchType !== 'none') {
                highlightMatches(nameEl, fileName, data.searchTerm, this.settings.caseSensitive);
            } else {
                nameEl.innerText = fileName;
            }

            if (data.result.matchType !== 'none' && data.result.matchType !== 'file_match') {
                addMatchIndicator(fileItem, data.result.matchType);
            } else {
                removeMatchIndicator(fileItem);
            }
        }
    }
}
