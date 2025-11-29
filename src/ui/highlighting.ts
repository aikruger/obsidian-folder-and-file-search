
export function highlightMatches(
    element: HTMLElement,
    text: string,
    pattern: string,
    caseSensitive: boolean = false
): void {
    if (!pattern) {
        element.innerText = text;
        return;
    }

    let a = caseSensitive ? text : text.toLowerCase();
    let b = caseSensitive ? pattern : pattern.toLowerCase();

    let indices = [];
    let patternIdx = 0;
    let textIdx = 0;

    while (textIdx < a.length && patternIdx < b.length) {
        if (a[textIdx] === b[patternIdx]) {
            indices.push(textIdx);
            patternIdx++;
        }
        textIdx++;
    }

    if (indices.length !== pattern.length) {
        element.innerText = text;
        return;
    }

    element.empty();

    let lastIndex = 0;
    for (const index of indices) {
        if (index > lastIndex) {
            element.appendText(text.substring(lastIndex, index));
        }
        element.createSpan({ cls: 'fuzzy-match-highlight', text: text[index] });
        lastIndex = index + 1;
    }

    if (lastIndex < text.length) {
        element.appendText(text.substring(lastIndex));
    }
}
