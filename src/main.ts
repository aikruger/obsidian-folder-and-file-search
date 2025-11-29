import { Plugin, TFolder } from 'obsidian';
import { FuzzyExplorerSettings, DEFAULT_SETTINGS, FuzzyExplorerSettingTab } from './settings';
import { createSearchInput } from './ui/searchInput';
import { ExplorerFilter, FilterResult } from './logic/explorerFilter';
import { FileExplorerView, FileItem } from './types';
import { highlightMatches } from './ui/highlighting';
import { addMatchIndicator, removeMatchIndicator } from './ui/matchIndicators';
import { ErrorHandler } from './utils/errorHandler';

interface ExplorerState {
    expandedFolders: Map<string, boolean>;
    scrollPosition: number;
}

export default class FuzzyExplorerPlugin extends Plugin {
    settings: FuzzyExplorerSettings;
    searchInput: HTMLInputElement | null;
    originalExplorerState: ExplorerState | null = null;
    private debounceTimer: number;
    private filterLogic: ExplorerFilter;
    private matchCountEl: HTMLElement | null;
    private previousFilterResults: Map<string, FilterResult> = new Map();

    async onload() {
        await this.loadSettings();
        this.filterLogic = new ExplorerFilter(this.settings);

        this.app.workspace.onLayoutReady(() => {
            this.initSearchUI();
        });

        this.addSettingTab(new FuzzyExplorerSettingTab(this.app, this));
    }

    onunload() {
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

        const container = explorer.containerEl.querySelector('.nav-buttons-container');
        if (!container) {
            console.error('Fuzzy Explorer: Could not find file explorer button container.');
            return;
        }

        const searchInputContainer = createSearchInput(container as HTMLElement);
        this.searchInput = searchInputContainer.querySelector('input');
        this.matchCountEl = searchInputContainer.querySelector('.fuzzy-match-count');

        if (!this.searchInput) {
            console.error('Fuzzy Explorer: Search input element not found.');
            return;
        }

        this.registerDomEvent(this.searchInput, 'input', (evt) => {
            this.onSearchInput((evt.target as HTMLInputElement).value);
        });

        const clearBtn = searchInputContainer.querySelector('.fuzzy-explorer-clear-btn');
        if (clearBtn) {
            this.registerDomEvent(clearBtn as HTMLElement, 'click', () => {
                this.clearFilter();
            });
        }
    }

    onSearchInput(value: string): void {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = window.setTimeout(() => {
            this.applyFilter(value);
        }, 250);
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

            let matchCount = 0;
            const fileItems = explorer.fileItems;

            for (const [path, fileItem] of Object.entries(fileItems)) {
                const newResult = newFilterResults.get(path);
                const oldResult = this.previousFilterResults.get(path);

                if (JSON.stringify(newResult) === JSON.stringify(oldResult)) continue;

                if (!newResult || !newResult.shouldShow) {
                    this.hideFileItem(fileItem);
                } else {
                    if (newResult.matchType === 'file_match' || newResult.matchType === 'folder_match') {
                        matchCount++;
                    }
                    this.showFileItem(fileItem, searchTerm, newResult);
                }
            }

            this.updateMatchCount(matchCount);
            this.previousFilterResults = newFilterResults;
        } catch (error) {
            ErrorHandler.handleFilterError(error as Error, this);
        }
    }

    clearFilter(): void {
        if (!this.searchInput) return;

        const explorer = this.getFileExplorer();
        if (!explorer) return;

        const fileItems = explorer.fileItems;
        for (const fileItem of Object.values(fileItems)) {
            this.showFileItem(fileItem);
            removeMatchIndicator(fileItem);
        }

        if (this.originalExplorerState) {
            this.restoreExplorerState(this.originalExplorerState);
            this.originalExplorerState = null;
        }

        this.searchInput.value = '';
        this.updateMatchCount(0);
        this.previousFilterResults.clear();
    }

    updateMatchCount(count: number): void {
        if (this.matchCountEl && this.settings.showMatchCount) {
            this.matchCountEl.setText(count > 0 ? `${count} matches` : '');
            this.matchCountEl.style.display = count > 0 ? 'block' : 'none';
        } else if (this.matchCountEl) {
            this.matchCountEl.style.display = 'none';
        }
    }

    saveExplorerState(): ExplorerState {
        const explorer = this.getFileExplorer();
        const expandedFolders = new Map<string, boolean>();
        let scrollPosition = 0;

        if (explorer) {
            const fileItems = explorer.fileItems;
            for (const [path, item] of Object.entries(fileItems)) {
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

        const fileItems = explorer.fileItems;

        for (const [path, item] of Object.entries(fileItems)) {
            if (item.file instanceof TFolder && state.expandedFolders.has(path)) {
                const collapsed = state.expandedFolders.get(path);
                if (collapsed !== undefined) {
                    item.collapsed = collapsed;
                }
            }
        }

        explorer.containerEl.scrollTop = state.scrollPosition;
    }

    hideFileItem(fileItem: FileItem): void {
        fileItem.el.style.display = 'none';
    }

    showFileItem(fileItem: FileItem, searchTerm?: string, result?: FilterResult): void {
        fileItem.el.style.display = '';
        const nameEl = fileItem.el.querySelector('.nav-file-title-content') as HTMLElement;
        if (!nameEl) return;

        const fileName = fileItem.file.name;

        if (this.settings.highlightMatches && searchTerm && result && result.matchType !== 'none') {
             highlightMatches(nameEl, fileName, searchTerm, this.settings.caseSensitive);
        } else {
            nameEl.innerText = fileName;
        }

        if (result && result.matchType !== 'none' && result.matchType !== 'file_match') {
            addMatchIndicator(fileItem, result.matchType);
        } else {
            removeMatchIndicator(fileItem);
        }
    }
}
