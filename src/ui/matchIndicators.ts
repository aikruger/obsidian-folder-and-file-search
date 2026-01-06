import { FileItem } from '../types';

export function addMatchIndicator(fileItem: FileItem, matchType: 'folder_match' | 'contains_match'): void {
    // Removed visual indicators - no ticks or arrows
    removeMatchIndicator(fileItem);
}

export function removeMatchIndicator(fileItem: FileItem): void {
    const existingIndicator = fileItem.el.querySelector('.fuzzy-match-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
}
