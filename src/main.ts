import { Plugin, addIcon } from 'obsidian';
import { FuzzyExplorerSettings, DEFAULT_SETTINGS, FuzzyExplorerSettingTab } from './settings';
import { ExplorerFilter } from './logic/explorerFilter';
import { FuzzyExplorerView } from './view';
import { FUZZY_EXPLORER_VIEW_TYPE } from './constants';

export default class FuzzyExplorerPlugin extends Plugin {
    settings: FuzzyExplorerSettings;
    filterLogic: ExplorerFilter;

    async onload() {
        await this.loadSettings();

        // Register the custom folder-search icon
        const folderSearchSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100" height="100">
  <!-- Folder shape -->
  <path d="M56 8H28L22 2H8C4.6 2 2 4.6 2 8v48c0 3.4 2.6 6 6 6h48c3.4 0 6-2.6 6-6V14c0-3.4-2.6-6-6-6z"
        fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Search circle -->
  <circle cx="44" cy="42" r="10" fill="none" stroke="currentColor" stroke-width="3"/>

  <!-- Search line (magnifying glass handle) -->
  <line x1="52" y1="50" x2="60" y2="58" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
</svg>`;

        addIcon("folder-search", folderSearchSvg);

        // Register the custom view type
        this.registerView(
            FUZZY_EXPLORER_VIEW_TYPE,
            (leaf) => new FuzzyExplorerView(leaf, this)
        );

        // Register ribbon icon to open the view (Always opens new instance on left)
        this.addRibbonIcon("folder-search", "Open Fuzzy Explorer", () => {
            this.toggleFuzzyExplorerPanel();
        });

        // Add command to open the view (Toggle first instance)
        this.addCommand({
            id: "toggle-fuzzy-explorer",
            name: "Toggle Fuzzy Explorer",
            callback: () => {
                this.toggleFuzzyExplorerPanel();
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

    async toggleFuzzyExplorerPanel() {
        // Check if fuzzy explorer tab already exists in left sidebar
        const leftLeaves_all = this.app.workspace.getLeavesOfType(FUZZY_EXPLORER_VIEW_TYPE);

        if (leftLeaves_all.length > 0) {
            // Already open - just reveal it
            const fuzzyLeaf = leftLeaves_all[0];
            this.app.workspace.revealLeaf(fuzzyLeaf);
            return;
        }

        // Not open - create in left sidebar
        const leaf = this.app.workspace.getLeftLeaf(false);
        if (!leaf) return;

        await leaf.setViewState({
            type: FUZZY_EXPLORER_VIEW_TYPE,
            active: true
        });

        this.app.workspace.revealLeaf(leaf);
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
