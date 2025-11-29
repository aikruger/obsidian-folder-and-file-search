import { FileItem } from '../types';

export function addMatchIndicator(fileItem: FileItem, matchType: 'folder_match' | 'contains_match'): void {
    removeMatchIndicator(fileItem); // Ensure no duplicate indicators

    const indicator = fileItem.el.createDiv('fuzzy-match-indicator');

    if (matchType === 'folder_match') {
        indicator.setText('✓');
        indicator.addClass('folder-match');
    } else {
        indicator.setText('→');
        indicator.addClass('contains-match');
    }
}

export function removeMatchIndicator(fileItem: FileItem): void {
    const existingIndicator = fileItem.el.querySelector('.fuzzy-match-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
}
