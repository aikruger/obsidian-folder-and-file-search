import { App, TFile, TFolder, Vault } from 'obsidian';
import { fuzzyMatch } from './fuzzyMatch';
import { QueryParser, ParsedQuery } from './queryParser';
import { FuzzyExplorerSettings } from '../settings';

export interface FilterResult {
    matchType: 'folder_match' | 'file_match' | 'contains_match' | 'none';
    shouldShow: boolean;
}

export class ExplorerFilter {
    private app: App;
    private settings: FuzzyExplorerSettings;
    private queryParser: QueryParser;

    constructor(app: App, settings: FuzzyExplorerSettings) {
        this.app = app;
        this.settings = settings;
        this.queryParser = new QueryParser();
    }

    /**
     * Build filter results using enhanced query syntax
     */
    buildFilterResults(vault: Vault, searchTerm: string): Map<string, FilterResult> {
        const results = new Map<string, FilterResult>();

        // Parse the query
        const parsedQuery = this.queryParser.parse(searchTerm);

        if (parsedQuery.isEmptyQuery) {
            return results; // Empty results = show all
        }

        const allFiles = vault.getAllLoadedFiles();
        const matchingFiles = new Set<string>();
        const matchingFolders = new Set<string>();
        const parentFoldersToShow = new Set<string>();

        // Process each file/folder
        for (const file of allFiles) {
            if (file instanceof TFolder) {
                if (this.matchFolderWithQuery(file, parsedQuery)) {
                    matchingFolders.add(file.path);
                }
            } else if (file instanceof TFile) {
                if (this.matchFileWithQuery(file, parsedQuery)) {
                    matchingFiles.add(file.path);
                    if (file.parent) {
                        parentFoldersToShow.add(file.parent.path);
                    }
                }
            }
        }

        // Add all parent folders
        parentFoldersToShow.forEach(path => this.addAllParents(path, parentFoldersToShow));
        matchingFolders.forEach(path => this.addAllParents(path, parentFoldersToShow));

        // Build results map
        for (const file of allFiles) {
            const isFile = file instanceof TFile;
            const parentPath = file.parent ? file.parent.path : '/';

            if (matchingFolders.has(file.path)) {
                results.set(file.path, { matchType: 'folder_match', shouldShow: true });

                // Show all children
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

    /**
     * Match folder against parsed query
     */
    private matchFolderWithQuery(folder: TFolder, query: ParsedQuery): boolean {
        const folderName = folder.name;
        const folderPath = folder.path;

        // Check exclusions first
        if (this.isExcluded(folderPath, folderName, query)) {
            return false;
        }

        // Check folder-specific operators
        if (query.folderIncludes.length > 0) {
            const folderMatches = query.folderIncludes.some(pattern =>
                fuzzyMatch(folderName, pattern, this.settings.caseSensitive) ||
                folderPath.includes(pattern)
            );
            if (!folderMatches) return false;
        }

        // Check path operators
        if (query.pathIncludes.length > 0) {
            const pathMatches = query.pathIncludes.some(pattern => folderPath.includes(pattern));
            if (!pathMatches) return false;
        }

        // Check exact phrases
        if (query.exactPhrases.length > 0) {
            const matchesPhrase = query.exactPhrases.some(phrase =>
                folderName.toLowerCase().includes(phrase.toLowerCase())
            );
            if (!matchesPhrase) return false;
        }

        // Check regex patterns
        if (query.regexPatterns.length > 0) {
            const matchesRegex = query.regexPatterns.some(pattern => {
                try {
                    const regex = new RegExp(pattern, this.settings.caseSensitive ? '' : 'i');
                    return regex.test(folderName) || regex.test(folderPath);
                } catch (e) {
                    return false;
                }
            });
            if (!matchesRegex) return false;
        }

        // Default: fuzzy match on search terms
        if (query.searchTerms.length > 0) {
            return query.searchTerms.some(term =>
                fuzzyMatch(folderName, term, this.settings.caseSensitive) ||
                fuzzyMatch(folderPath, term, this.settings.caseSensitive)
            );
        }

        // If only operators provided (no search terms), match if not excluded
        return true;
    }

    /**
     * Match file against parsed query
     */
    private matchFileWithQuery(file: TFile, query: ParsedQuery): boolean {
        const fileName = file.basename;
        const filePath = file.path;

        // Check exclusions first
        if (this.isExcluded(filePath, fileName, query)) {
            return false;
        }

        // Check file-specific operators
        if (query.fileIncludes.length > 0) {
            const fileMatches = query.fileIncludes.some(pattern =>
                fuzzyMatch(fileName, pattern, this.settings.caseSensitive)
            );
            if (!fileMatches) return false;
        }

        // Check path operators
        if (query.pathIncludes.length > 0) {
            const pathMatches = query.pathIncludes.some(pattern => filePath.includes(pattern));
            if (!pathMatches) return false;
        }

        // Check tag operators (requires reading frontmatter)
        if (query.tagIncludes.length > 0 || query.tagExcludes.length > 0) {
            const fileCache = this.app.metadataCache.getFileCache(file);
            const fileTags = fileCache?.tags?.map(t => t.tag.substring(1)) ?? [];

            if (query.tagIncludes.length > 0) {
                const tagMatches = query.tagIncludes.some(tag => fileTags.includes(tag));
                if (!tagMatches) return false;
            }

            if (query.tagExcludes.length > 0) {
                const tagMatches = query.tagExcludes.some(tag => fileTags.includes(tag));
                if (tagMatches) return false;
            }
        }

        // Check exact phrases
        if (query.exactPhrases.length > 0) {
            const matchesPhrase = query.exactPhrases.some(phrase =>
                fileName.toLowerCase().includes(phrase.toLowerCase())
            );
            if (!matchesPhrase) return false;
        }

        // Check regex patterns
        if (query.regexPatterns.length > 0) {
            const matchesRegex = query.regexPatterns.some(pattern => {
                try {
                    const regex = new RegExp(pattern, this.settings.caseSensitive ? '' : 'i');
                    return regex.test(fileName) || regex.test(filePath);
                } catch (e) {
                    return false;
                }
            });
            if (!matchesRegex) return false;
        }

        // Default: fuzzy match on search terms
        if (query.searchTerms.length > 0) {
            return query.searchTerms.some(term =>
                fuzzyMatch(fileName, term, this.settings.caseSensitive)
            );
        }

        // If only operators provided (no search terms), match if not excluded
        return true;
    }

    /**
     * Check if file/folder should be excluded
     */
    private isExcluded(path: string, name: string, query: ParsedQuery): boolean {
        // Check path exclusions
        if (query.pathExcludes.some(pattern => path.includes(pattern))) {
            return true;
        }

        // Check folder exclusions
        if (query.folderExcludes.some(pattern =>
            fuzzyMatch(name, pattern, this.settings.caseSensitive) || path.includes(pattern)
        )) {
            return true;
        }

        // Check file exclusions
        if (query.fileExcludes.some(pattern =>
            fuzzyMatch(name, pattern, this.settings.caseSensitive)
        )) {
            return true;
        }

        return false;
    }

    private addAllParents(path: string, collection: Set<string>): void {
        let current = path;
        while (current !== '/') {
            const parent = current.substring(0, current.lastIndexOf('/')) || '/';
            if (collection.has(parent)) break;
            collection.add(parent);
            current = parent;
        }
    }
}
