export function fuzzyMatch(str: string, pattern: string, caseSensitive = false): boolean {
    if (!pattern) return true;
    if (!str) return false;

    if (!caseSensitive) {
        str = str.toLowerCase();
        pattern = pattern.toLowerCase();
    }

    let patternIdx = 0;
    let strIdx = 0;

    while (strIdx < str.length && patternIdx < pattern.length) {
        if (str[strIdx] === pattern[patternIdx]) {
            patternIdx++;
        }
        strIdx++;
    }

    return patternIdx === pattern.length;
}
