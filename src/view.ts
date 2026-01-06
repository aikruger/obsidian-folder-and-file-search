import { ItemView, WorkspaceLeaf, TFolder, TFile, setIcon, TAbstractFile } from 'obsidian';
import FuzzyExplorerPlugin from './main';
import { FUZZY_EXPLORER_VIEW_TYPE } from './constants';
import { FileExplorerView, FileItem } from './types';
import { createSearchButton, setSearchButtonActive } from './ui/searchButton';
import { createSearchInput, toggleSearchBar } from './ui/searchInput';
import { FilterResult } from './logic/explorerFilter';
import { ErrorHandler } from './utils/errorHandler';
import { highlightMatches } from './ui/highlighting';

export class FuzzyExplorerView extends ItemView {
    plugin: FuzzyExplorerPlugin;
    fileExplorerRef: FileExplorerView | null;
    searchButton: HTMLElement;
    collapseAllBtn: HTMLElement;
    expandAllBtn: HTMLElement;
    searchInput: HTMLInputElement;
    searchContainer: HTMLElement;
    matchCountEl: HTMLElement;
    fileItems: Map<string, FileItem>;
    isSearchVisible = false;
    debounceTimer: number;
    previousFilterResults: Map<string, FilterResult> = new Map();
    visibleFilesInFolder: Map<string, Set<string>>;

    constructor(leaf: WorkspaceLeaf, plugin: FuzzyExplorerPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.visibleFilesInFolder = new Map();
    }

    getViewType(): string {
        return FUZZY_EXPLORER_VIEW_TYPE;
    }

    getDisplayText(): string {
        return "Fuzzy Explorer";
    }

    getIcon(): string {
        return "folder-search";
    }

    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass("fuzzy-explorer-view");

        const nativeExplorerLeaves = this.app.workspace.getLeavesOfType("file-explorer");
        if (nativeExplorerLeaves.length === 0) {
            container.createEl("div", {
                text: "Native file explorer not found. Please enable it first.",
                cls: "fuzzy-explorer-error"
            });
            return;
        }

        const nativeExplorerView = nativeExplorerLeaves[0].view as FileExplorerView;
        this.fileExplorerRef = nativeExplorerView;

        this.createExplorerClone(container as HTMLElement);

        this.registerEvent(this.app.vault.on("create", (file) => this.onFileCreated(file)));
        this.registerEvent(this.app.vault.on("delete", (file) => this.onFileDeleted(file)));
        this.registerEvent(this.app.vault.on("rename", (file, oldPath) => this.onFileRenamed(file, oldPath)));
    }

    async onClose(): Promise<void> {
        // Cleanup
    }

    private onFileCreated(file: TAbstractFile): void {
        const container = this.containerEl.querySelector(".nav-files-container");
        if (container) {
            this.buildFileTree(container as HTMLElement);
        }
        if (this.searchInput && this.searchInput.value) {
            this.applyFilter(this.searchInput.value);
        }
    }

    private onFileDeleted(file: TAbstractFile): void {
        const item = this.fileItems.get(file.path);
        if (item) {
            item.el.remove();
            this.fileItems.delete(file.path);
        }
    }

    private onFileRenamed(file: TAbstractFile, oldPath: string): void {
        const item = this.fileItems.get(oldPath);
        if (item) {
            this.fileItems.delete(oldPath);
            this.fileItems.set(file.path, item);
            item.el.setAttr("data-path", file.path);
            const contentEl = item.el.querySelector(".tree-item-inner");
            if (contentEl) {
                contentEl.setText(file.name);
            }
        }
    }

    private createExplorerClone(container: HTMLElement): void {
        const headerEl = container.createDiv("nav-header");
        const buttonsContainer = headerEl.createDiv("nav-buttons-container");

        this.searchButton = createSearchButton(
            buttonsContainer,
            () => this.toggleSearch()
        );

        // NEW: Add collapse all button
        const collapseAllBtn = buttonsContainer.createDiv("clickable-icon nav-action-button");
        collapseAllBtn.setAttribute("aria-label", "Collapse All");
        setIcon(collapseAllBtn, "fold-gutter");  // Obsidian has a fold icon
        collapseAllBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.collapseAll();
        });
        this.collapseAllBtn = collapseAllBtn;

        // NEW: Add expand all button
        const expandAllBtn = buttonsContainer.createDiv("clickable-icon nav-action-button");
        expandAllBtn.setAttribute("aria-label", "Expand All");
        setIcon(expandAllBtn, "unfold-gutter");  // Obsidian has an unfold icon
        expandAllBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.expandAll();
        });
        this.expandAllBtn = expandAllBtn;

        const searchUIElements = createSearchInput(container);
        this.searchContainer = searchUIElements.container;
        this.searchInput = searchUIElements.input;
        this.matchCountEl = searchUIElements.matchCountEl;

        const filesContainer = container.createDiv("nav-files-container");

        this.buildFileTree(filesContainer);
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.registerDomEvent(this.searchInput, 'input', (evt) => {
            this.onSearchInput((evt.target as HTMLInputElement).value);
        });

        const clearBtn = this.searchContainer.querySelector('.fuzzy-explorer-clear-btn');
        if (clearBtn) {
            this.registerDomEvent(clearBtn as HTMLElement, 'click', () => {
                this.clearFilter();
            });
        }

        this.registerDomEvent(this.searchInput, 'keydown', (evt) => {
            if (evt.key === 'Escape') {
                this.toggleSearch();
                evt.preventDefault();
            }
        });
    }

    private toggleSearch(): void {
        this.isSearchVisible = toggleSearchBar(this.searchContainer);
        setSearchButtonActive(this.searchButton, this.isSearchVisible);
        if (!this.isSearchVisible) {
            this.clearFilter();
        }
    }

    onSearchInput(value: string): void {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = window.setTimeout(() => {
            this.applyFilter(value);
        }, 250);
    }

    applyFilter(searchTerm: string): void {
        try {
            if (!searchTerm) {
                this.clearFilter();
                return;
            }

            const newFilterResults = this.plugin.filterLogic.buildFilterResults(
                this.app.vault,
                searchTerm
            );

            // NEW: Reset visible files tracking
            this.visibleFilesInFolder.clear();

            let matchCount = 0;
            for (const [path, fileItem] of this.fileItems.entries()) {
                const result = newFilterResults.get(path);
                if (result && result.shouldShow) {
                    this.showFileItem(fileItem, searchTerm, result);

                    // NEW: Track visible files in each folder
                    if (fileItem.file instanceof TFile) {
                        const folderPath = fileItem.file.parent?.path || "/";
                        if (!this.visibleFilesInFolder.has(folderPath)) {
                            this.visibleFilesInFolder.set(folderPath, new Set());
                        }
                        this.visibleFilesInFolder.get(folderPath)?.add(fileItem.file.path);
                    }

                    if (result.matchType === 'file_match' || result.matchType === 'folder_match') {
                        matchCount++;
                    }
                } else {
                    this.hideFileItem(fileItem);
                }
            }
            this.updateMatchCount(matchCount);
            this.previousFilterResults = newFilterResults;

        } catch (error) {
            ErrorHandler.handleFilterError(error as Error, this.plugin);
        }
    }

    clearFilter(): void {
        if (!this.searchInput || this.searchInput.value === '') return;

        this.searchInput.value = '';
        for (const fileItem of this.fileItems.values()) {
            this.showFileItem(fileItem);
        }

        // NEW: Clear visible files tracking
        this.visibleFilesInFolder.clear();

        this.updateMatchCount(0);
        this.previousFilterResults.clear();
        const clearBtn = this.searchContainer?.querySelector('.fuzzy-explorer-clear-btn');
        if (clearBtn) {
            (clearBtn as HTMLElement).style.display = 'none';
        }
    }

    updateMatchCount(count: number): void {
        if (this.matchCountEl && this.plugin.settings.showMatchCount) {
            this.matchCountEl.setText(count > 0 ? `${count} matches` : '');
            this.matchCountEl.style.display = count > 0 ? 'block' : 'none';
        } else if (this.matchCountEl) {
            this.matchCountEl.style.display = 'none';
        }
    }

    hideFileItem(fileItem: FileItem): void {
        fileItem.el.addClass('fuzzy-explorer-hidden');
        fileItem.el.removeClass('fuzzy-explorer-visible');
    }

    showFileItem(fileItem: FileItem, searchTerm?: string, result?: FilterResult): void {
        fileItem.el.removeClass('fuzzy-explorer-hidden');
        fileItem.el.addClass('fuzzy-explorer-visible');
        const nameEl = fileItem.el.querySelector('.nav-file-title-content, .nav-folder-title-content') as HTMLElement;
        if (!nameEl) return;

        const fileName = fileItem.file.name;
        if (this.plugin.settings.highlightMatches && searchTerm && result && result.matchType !== 'none') {
            highlightMatches(nameEl, fileName, searchTerm, this.plugin.settings.caseSensitive);
        } else {
            nameEl.innerText = fileName;
        }

        // No indicator logic needed anymore
    }


    private buildFileTree(container: HTMLElement): void {
        container.empty();
        const rootFolder = this.app.vault.getRoot();
        this.fileItems = new Map<string, FileItem>();
        this.renderFolder(rootFolder, container, 0);
    }

    private renderFolder(folder: TFolder, parentEl: HTMLElement, depth: number): void {
        const sortedChildren = [...folder.children].sort((a, b) => {
            if (a instanceof TFolder && b instanceof TFile) return -1;
            if (a instanceof TFile && b instanceof TFolder) return 1;
            return a.name.localeCompare(b.name);
        });

        for (const child of sortedChildren) {
            if (child instanceof TFolder) {
                this.renderFolderItem(child, parentEl, depth);
            } else if (child instanceof TFile) {
                this.renderFileItem(child, parentEl, depth);
            }
        }
    }

    private renderFolderItem(folder: TFolder, parentEl: HTMLElement, depth: number): void {
        const folderEl = parentEl.createDiv("tree-item nav-folder");
        folderEl.setAttr("data-path", folder.path);

        const folderTitleEl = folderEl.createDiv("tree-item-self nav-folder-title");
        folderTitleEl.style.paddingLeft = `${depth * 20}px`;

        const collapseIcon = folderTitleEl.createDiv("tree-item-icon collapse-icon nav-folder-collapse-indicator");
        setIcon(collapseIcon, "right-triangle");

        const folderIcon = folderTitleEl.createDiv("tree-item-icon nav-folder-icon");
        setIcon(folderIcon, "folder");

        const folderContent = folderTitleEl.createDiv("tree-item-inner nav-folder-title-content");
        folderContent.setText(folder.name);

        const childrenEl = folderEl.createDiv("tree-item-children nav-folder-children");
        childrenEl.style.display = "none";

        this.fileItems.set(folder.path, {
            el: folderEl,
            file: folder,
            collapsed: true,
            childrenEl: childrenEl
        });

        folderEl.setAttr("draggable", "true");
        this.setupDragAndDrop(folderEl, folder);
        this.setupFolderDrop(folderEl, folder);

        folderTitleEl.addEventListener("click", (e) => {
            e.stopPropagation();
            this.toggleFolder(folder.path);
        });

        this.renderFolder(folder, childrenEl, depth + 1);
    }

    private renderFileItem(file: TFile, parentEl: HTMLElement, depth: number): void {
        const fileEl = parentEl.createDiv("tree-item nav-file");
        fileEl.setAttr("data-path", file.path);

        const fileTitleEl = fileEl.createDiv("tree-item-self nav-file-title");
        fileTitleEl.style.paddingLeft = `${depth * 20}px`;

        const fileIcon = fileTitleEl.createDiv("tree-item-icon nav-file-icon");
        setIcon(fileIcon, "document");

        const fileContent = fileTitleEl.createDiv("tree-item-inner nav-file-title-content");
        fileContent.setText(file.basename);

        this.fileItems.set(file.path, {
            el: fileEl,
            file: file
        });

        fileEl.setAttr("draggable", "true");
        this.setupDragAndDrop(fileEl, file);

        fileTitleEl.addEventListener("click", async (e) => {
            e.stopPropagation();
            await this.app.workspace.getLeaf(false).openFile(file);
        });

        fileTitleEl.addEventListener("auxclick", async (e) => {
            if (e.button === 1) {
                e.stopPropagation();
                await this.app.workspace.getLeaf('tab').openFile(file);
            }
        });
    }

    private setupDragAndDrop(fileItemEl: HTMLElement, file: TAbstractFile) {
        fileItemEl.addEventListener("dragstart", (evt: DragEvent) => {
            this.onDragStart(evt, file);
        });
        fileItemEl.addEventListener("dragend", (evt: DragEvent) => {
            this.onDragEnd(evt);
        });
    }

    private onDragStart(evt: DragEvent, file: TAbstractFile) {
        if (!evt.dataTransfer)
            return;

        let wikilinks: string[] = [];

        if (file instanceof TFile) {
            // Single file: just its wikilink
            const displayName = file.basename;
            wikilinks.push(`[[${displayName}]]`);

        } else if (file instanceof TFolder) {
            // Folder: collect ALL visible files in this folder + subfolders
            wikilinks = this.getWikilinksForFolder(file.path);

            // If no filtered files exist, show all files in folder
            if (wikilinks.length === 0) {
                wikilinks = this.getAllFilesInFolder(file);
            }
        }

        // Join multiple wikilinks with space
        const wikilinkText = wikilinks.join(" ");

        evt.dataTransfer.setData("text/plain", wikilinkText);
        evt.dataTransfer.setData("text/html", wikilinkText);
        evt.dataTransfer.setData("application/obsidian-file", file.path);
        evt.dataTransfer.effectAllowed = "copy";

        const target = evt.currentTarget as HTMLElement;
        target.addClass("is-dragging");
    }

    private getWikilinksForFolder(folderPath: string): string[] {
        const wikilinks: string[] = [];

        // Collect files directly visible in this folder
        if (this.visibleFilesInFolder.has(folderPath)) {
            const visibleFiles = this.visibleFilesInFolder.get(folderPath);
            if (visibleFiles) {
                for (const filePath of visibleFiles) {
                    const file = this.app.vault.getAbstractFileByPath(filePath);
                    if (file instanceof TFile) {
                        wikilinks.push(`[[${file.basename}]]`);
                    }
                }
            }
        }

        // Recursively collect from subfolders
        for (const [fPath, visibleFiles] of this.visibleFilesInFolder) {
            if (fPath.startsWith(folderPath + "/") && fPath !== folderPath) {
                for (const filePath of visibleFiles) {
                    const file = this.app.vault.getAbstractFileByPath(filePath);
                    if (file instanceof TFile) {
                        wikilinks.push(`[[${file.basename}]]`);
                    }
                }
            }
        }

        return wikilinks;
    }

    private getAllFilesInFolder(folder: TFolder): string[] {
        const wikilinks: string[] = [];
        const allFiles = this.app.vault.getAllLoadedFiles();

        for (const file of allFiles) {
            if (file instanceof TFile && file.path.startsWith(folder.path + "/")) {
                wikilinks.push(`[[${file.basename}]]`);
            }
        }

        return wikilinks;
    }

    private onDragEnd(evt: DragEvent) {
        const target = evt.currentTarget as HTMLElement;
        target?.removeClass("is-dragging");
    }

    private setupFolderDrop(folderEl: HTMLElement, folder: TFolder) {
        folderEl.addEventListener("dragover", (evt: DragEvent) => {
            evt.preventDefault();
            if (evt.dataTransfer) {
                evt.dataTransfer.dropEffect = "move";
            }
            folderEl.addClass("is-drop-target");
        });

        folderEl.addEventListener("dragleave", () => {
            folderEl.removeClass("is-drop-target");
        });

        folderEl.addEventListener("drop", async (evt: DragEvent) => {
            evt.preventDefault();
            folderEl.removeClass("is-drop-target");
            if (!evt.dataTransfer) return;

            const path = evt.dataTransfer.getData("application/obsidian-file") ||
                         evt.dataTransfer.getData("text/plain");
            if (!path) return;

            const file = this.app.vault.getAbstractFileByPath(path);
            if (!file || file === folder) return;

            // Moving files/folders into the folder:
            const newPath = folder.path === "/"
                ? `${file.name}`
                : `${folder.path}/${file.name}`;

            if (file.path !== newPath) {
                await this.app.vault.rename(file, newPath);
            }
        });
    }

    private toggleFolder(folderPath: string): void {
        const item = this.fileItems.get(folderPath);
        if (!item || !item.childrenEl) return;

        item.collapsed = !item.collapsed;
        if (item.collapsed) {
            item.childrenEl.style.display = "none";
            item.el.removeClass("is-collapsed");
        } else {
            item.childrenEl.style.display = "";
            item.el.addClass("is-collapsed");
        }

        const collapseIcon = item.el.querySelector(".collapse-icon");
        if (collapseIcon) {
            collapseIcon.empty();
            setIcon(collapseIcon as HTMLElement, item.collapsed ? "right-triangle" : "down-triangle");
        }
    }

    /**
     * Collapse all visible folders
     */
    collapseAll(): void {
        for (const fileItem of this.fileItems.values()) {
            if (fileItem.childrenEl && fileItem.file instanceof TFolder) {
                // Collapse the folder
                fileItem.collapsed = true;
                fileItem.childrenEl.style.display = "none";
                fileItem.el.removeClass("is-collapsed");

                // Update collapse icon
                const collapseIcon = fileItem.el.querySelector(".collapse-icon");
                if (collapseIcon) {
                    collapseIcon.empty();
                    setIcon(collapseIcon as HTMLElement, "right-triangle");
                }
            }
        }
    }

    /**
     * Expand all visible folders
     */
    expandAll(): void {
        for (const fileItem of this.fileItems.values()) {
            if (fileItem.childrenEl && fileItem.file instanceof TFolder) {
                // Expand the folder
                fileItem.collapsed = false;
                fileItem.childrenEl.style.display = "";
                fileItem.el.addClass("is-collapsed");

                // Update collapse icon
                const collapseIcon = fileItem.el.querySelector(".collapse-icon");
                if (collapseIcon) {
                    collapseIcon.empty();
                    setIcon(collapseIcon as HTMLElement, "down-triangle");
                }
            }
        }
    }
}
