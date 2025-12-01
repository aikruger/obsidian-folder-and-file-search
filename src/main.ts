import { Plugin } from 'obsidian';
import { FuzzyExplorerSettings, DEFAULT_SETTINGS, FuzzyExplorerSettingTab } from './settings';
import { ExplorerFilter } from './logic/explorerFilter';
import { FuzzyExplorerView } from './view';
import { FUZZY_EXPLORER_VIEW_TYPE } from './constants';

export default class FuzzyExplorerPlugin extends Plugin {
    settings: FuzzyExplorerSettings;
    filterLogic: ExplorerFilter;

    async onload() {
        await this.loadSettings();

        // Register the custom view type
        this.registerView(
            FUZZY_EXPLORER_VIEW_TYPE,
            (leaf) => new FuzzyExplorerView(leaf, this)
        );

        // Register ribbon icon to open the view
        this.addRibbonIcon("search", "Open Fuzzy Explorer", () => {
            this.activateFuzzyExplorer();
        });

        // Add command to open the view
        this.addCommand({
            id: "open-fuzzy-explorer",
            name: "Open Fuzzy Explorer",
            callback: () => {
                this.activateFuzzyExplorer();
            }
        });

        // Initialize other components
        this.filterLogic = new ExplorerFilter(this.app, this.settings);
        this.addSettingTab(new FuzzyExplorerSettingTab(this.app, this));
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async activateFuzzyExplorer(): Promise<void> {
        const existing = this.app.workspace.getLeavesOfType(FUZZY_EXPLORER_VIEW_TYPE);

        if (existing.length > 0) {
            this.app.workspace.revealLeaf(existing[0]);
            return;
        }

        const leaf = this.app.workspace.getLeftLeaf(false);
        if (leaf) {
            await leaf.setViewState({
                type: FUZZY_EXPLORER_VIEW_TYPE,
                active: true,
            });

            this.app.workspace.revealLeaf(leaf);
        }
    }
}
