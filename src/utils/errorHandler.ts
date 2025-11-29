import { Notice } from 'obsidian';
import FuzzyExplorerPlugin from '../main';

export class ErrorHandler {
    static handleFilterError(error: Error, plugin: FuzzyExplorerPlugin): void {
        console.error('Fuzzy Explorer Filter Error:', error);

        new Notice('Error applying filter. Check console for details.');

        try {
            plugin.clearFilter();
        } catch (clearError) {
            console.error('Failed to clear filter after error:', clearError);
        }
    }
}
