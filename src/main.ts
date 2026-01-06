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
        this.addRibbonIcon("folder", "Open Fuzzy Explorer", () => {
            this.activateFuzzyExplorer();
        });

        // Add command to open the view (default/existing behavior)
        this.addCommand({
            id: "open-fuzzy-explorer",
            name: "Open Fuzzy Explorer",
            callback: () => {
                this.activateFuzzyExplorer();
            }
        });

        this.addCommand({
            id: "open-fuzzy-explorer-left",
            name: "Open Fuzzy Explorer (new, left)",
            callback: () => this.activateFuzzyExplorerNewLeaf("left"),
        });

        this.addCommand({
            id: "open-fuzzy-explorer-right",
            name: "Open Fuzzy Explorer (new, right)",
            callback: () => this.activateFuzzyExplorerNewLeaf("right"),
        });

        this.addCommand({
            id: "open-fuzzy-explorer-split",
            name: "Open Fuzzy Explorer (new split)",
            callback: () => this.activateFuzzyExplorerNewLeaf("split"),
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

        await this.activateFuzzyExplorerNewLeaf("left");
    }

    async activateFuzzyExplorerNewLeaf(location: "left" | "right" | "split" = "left") {
        let leaf;

        if (location === "left") {
            leaf = this.app.workspace.getLeftLeaf(true);
        } else if (location === "right") {
            leaf = this.app.workspace.getRightLeaf(true);
        } else {
            // split current
            leaf = this.app.workspace.getLeaf("split");
        }

        if (!leaf) return;

        await leaf.setViewState({
            type: FUZZY_EXPLORER_VIEW_TYPE,
            active: true
        });
        this.app.workspace.revealLeaf(leaf);
    }
}
