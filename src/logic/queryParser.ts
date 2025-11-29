export interface ParsedQuery {
    searchTerms: string[];        // Default fuzzy search terms
    pathIncludes: string[];        // path: operator
    pathExcludes: string[];        // -path: operator
    folderIncludes: string[];      // folder: operator (alias for path:)
    folderExcludes: string[];      // -folder: operator
    fileIncludes: string[];        // file: operator (search file names only)
    fileExcludes: string[];        // -file: operator
    tagIncludes: string[];         // tag: operator
    tagExcludes: string[];         // -tag: operator
    contentIncludes: string[];     // content: operator (future enhancement)
    exactPhrases: string[];        // "quoted phrases"
    regexPatterns: string[];       // /regex/ patterns
    isEmptyQuery: boolean;
}

export class QueryParser {
    /**
     * Parse search query with Obsidian-style operators
     *
     * Supported syntax:
     * - Default: fuzzy match on file/folder names
     * - "exact phrase": exact match
     * - path:folder/name: include files in path
     * - -path:folder/name: exclude files in path
     * - folder:name: alias for path: (searches folder names)
     * - -folder:name: exclude folders
     * - file:name: search file names only
     * - -file:name: exclude specific files
     * - tag:#tagname: include files with tag
     * - -tag:#tagname: exclude files with tag
     * - /regex/: regex pattern match
     *
     * Examples:
     * - "Data Governance" → fuzzy search for "Data Governance"
     * - Data Governance -folder:X_Files → fuzzy search excluding X_Files folder
     * - path:Projects file:report → files in Projects path with "report" in name
     * - "meeting notes" tag:#important → exact phrase with tag filter
     */
    parse(query: string): ParsedQuery {
        const result: ParsedQuery = {
            searchTerms: [],
            pathIncludes: [],
            pathExcludes: [],
            folderIncludes: [],
            folderExcludes: [],
            fileIncludes: [],
            fileExcludes: [],
            tagIncludes: [],
            tagExcludes: [],
            contentIncludes: [],
            exactPhrases: [],
            regexPatterns: [],
            isEmptyQuery: !query || query.trim().length === 0
        };

        if (result.isEmptyQuery) return result;

        // Tokenize the query
        const tokens = this.tokenize(query);

        for (const token of tokens) {
            if (token.type === 'operator') {
                this.parseOperator(token, result);
            } else if (token.type === 'phrase') {
                result.exactPhrases.push(token.value);
            } else if (token.type === 'regex') {
                result.regexPatterns.push(token.value);
            } else if (token.type === 'term') {
                // Default: fuzzy search term
                result.searchTerms.push(token.value);
            }
        }

        return result;
    }

    private tokenize(query: string): Token[] {
        const tokens: Token[] = [];
        const regex = /(-?path:|-?folder:|-?file:|-?tag:|-?content:|"[^"]+"|\/[^/]+\/|\S+)/g;
        let match;

        while ((match = regex.exec(query)) !== null) {
            const value = match[0];
            if (value.includes(':')) {
                tokens.push({ type: 'operator', value });
            } else if (value.startsWith('"') && value.endsWith('"')) {
                tokens.push({ type: 'phrase', value: value.slice(1, -1) });
            } else if (value.startsWith('/') && value.endsWith('/')) {
                tokens.push({ type: 'regex', value: value.slice(1, -1) });
            } else {
                tokens.push({ type: 'term', value });
            }
        }

        return tokens;
    }

    private parseOperator(token: Token, result: ParsedQuery): void {
        const isNegated = token.value.startsWith('-');
        const operatorString = isNegated ? token.value.substring(1) : token.value;
        const colonIndex = operatorString.indexOf(':');

        if (colonIndex === -1) return; // Invalid operator

        const operator = operatorString.substring(0, colonIndex).toLowerCase();
        let value = operatorString.substring(colonIndex + 1).trim();

        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }

        if (!value) return; // No value provided

        switch (operator) {
            case 'path':
                if (isNegated) {
                    result.pathExcludes.push(value);
                } else {
                    result.pathIncludes.push(value);
                }
                break;

            case 'folder':
                if (isNegated) {
                    result.folderExcludes.push(value);
                } else {
                    result.folderIncludes.push(value);
                }
                break;

            case 'file':
                if (isNegated) {
                    result.fileExcludes.push(value);
                } else {
                    result.fileIncludes.push(value);
                }
                break;

            case 'tag': {
                // Normalize tag (remove # if present)
                const normalizedTag = value.startsWith('#') ? value.substring(1) : value;
                if (isNegated) {
                    result.tagExcludes.push(normalizedTag);
                } else {
                    result.tagIncludes.push(normalizedTag);
                }
                break;
            }

            case 'content':
                if (isNegated) {
                    // Content exclusion not commonly supported, skip
                } else {
                    result.contentIncludes.push(value);
                }
                break;
        }
    }
}

interface Token {
    type: 'term' | 'operator' | 'phrase' | 'regex';
    value: string;
}
