import { Vault, TFile, TFolder } from 'obsidian';
import { fuzzyMatch } from './fuzzyMatch';
import { FuzzyExplorerSettings } from '../settings';

export interface FilterResult {
    matchType: 'folder_match' | 'file_match' | 'contains_match' | 'none';
    shouldShow: boolean;
}

export class ExplorerFilter {
    private settings: FuzzyExplorerSettings;

    constructor(settings: FuzzyExplorerSettings) {
        this.settings = settings;
    }

    private matchFolder(folder: TFolder, searchTerm: string): boolean {
        const folderName = folder.name;
        return fuzzyMatch(folderName, searchTerm, this.settings.caseSensitive) ||
               fuzzyMatch(folder.path, searchTerm, this.settings.caseSensitive);
    }

    private matchFile(file: TFile, searchTerm: string): boolean {
        const fileName = file.basename;
        return fuzzyMatch(fileName, searchTerm, this.settings.caseSensitive);
    }

    public buildFilterResults(vault: Vault, searchTerm: string): Map<string, FilterResult> {
        const results = new Map<string, FilterResult>();
        const allFiles = vault.getAllLoadedFiles();

        const matchingFiles = new Set<string>();
        const matchingFolders = new Set<string>();
        const parentFoldersToShow = new Set<string>();

        for (const file of allFiles) {
            if (file instanceof TFolder) {
                if (this.matchFolder(file, searchTerm)) {
                    matchingFolders.add(file.path);
                }
            } else if (file instanceof TFile) {
                if (this.matchFile(file, searchTerm)) {
                    matchingFiles.add(file.path);
                    if (file.parent) {
                        parentFoldersToShow.add(file.parent.path);
                    }
                }
            }
        }

        parentFoldersToShow.forEach(path => this.addAllParents(path, parentFoldersToShow));
        matchingFolders.forEach(path => this.addAllParents(path, parentFoldersToShow));

        for (const file of allFiles) {
            const isFile = file instanceof TFile;
            const parentPath = file.parent ? file.parent.path : '/';

            if (matchingFolders.has(file.path)) {
                results.set(file.path, { matchType: 'folder_match', shouldShow: true });
                const children = (file as TFolder).children;
                for (const child of children) {
                    if (!results.has(child.path)) {
                         results.set(child.path, { matchType: 'none', shouldShow: true });
                    }
                }
            } else if (matchingFiles.has(file.path)) {
                results.set(file.path, { matchType: 'file_match', shouldShow: true });
            } else if (parentFoldersToShow.has(file.path) && !isFile) {
                results.set(file.path, { matchType: 'contains_match', shouldShow: true });
            } else if (matchingFolders.has(parentPath)) {
                results.set(file.path, { matchType: 'none', shouldShow: true });
            } else {
                 results.set(file.path, { matchType: 'none', shouldShow: false });
            }
        }

        return results;
    }

    private addAllParents(path: string, collection: Set<string>) {
        let current = path;
        while (current !== '/') {
            const parent = current.substring(0, current.lastIndexOf('/')) || '/';
            if (collection.has(parent)) break;
            collection.add(parent);
            current = parent;
        }
    }
}
