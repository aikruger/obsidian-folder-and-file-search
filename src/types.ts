import { View, TFile, TFolder } from 'obsidian';

// This is an unofficial interface for the file explorer view
// It is subject to change in future Obsidian updates
export interface FileExplorerView extends View {
    fileItems: { [key: string]: FileItem };
    containerEl: HTMLElement;
}

export interface FileItem {
    el: HTMLElement;
    file: TFile | TFolder;
    collapsed?: boolean;
    collapsible?: boolean;
}
