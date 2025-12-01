import { App, PluginSettingTab, Setting } from 'obsidian';
import FuzzyExplorerPlugin from './main';

export interface FuzzyExplorerSettings {
    caseSensitive: boolean;
    showMatchCount: boolean;
    highlightMatches: boolean;
}

export const DEFAULT_SETTINGS: FuzzyExplorerSettings = {
    caseSensitive: false,
    showMatchCount: true,
    highlightMatches: true,
};

export class FuzzyExplorerSettingTab extends PluginSettingTab {
    plugin: FuzzyExplorerPlugin;

    constructor(app: App, plugin: FuzzyExplorerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Fuzzy Explorer Settings' });

        new Setting(containerEl)
            .setName('Case sensitive search')
            .setDesc('Enable case-sensitive fuzzy matching')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.caseSensitive)
                .onChange(async (value) => {
                    this.plugin.settings.caseSensitive = value;
                    await this.plugin.saveSettings();
                    // if (this.plugin.searchInput) {
                    //     this.plugin.applyFilter(this.plugin.searchInput.value);
                    // }
                }));

        new Setting(containerEl)
            .setName('Show match count')
            .setDesc('Display number of matches below search input')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showMatchCount)
                .onChange(async (value) => {
                    this.plugin.settings.showMatchCount = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Highlight matches')
            .setDesc('Highlight matching characters in file/folder names')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.highlightMatches)
                .onChange(async (value) => {
                    this.plugin.settings.highlightMatches = value;
                    await this.plugin.saveSettings();
                    // if (this.plugin.searchInput) {
                    //     this.plugin.applyFilter(this.plugin.searchInput.value);
                    // }
                }));
    }
}
