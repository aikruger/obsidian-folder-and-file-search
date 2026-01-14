import { View, TAbstractFile } from 'obsidian';

// For referencing the native file explorer
export interface FileExplorerView extends View {
    fileItems: Record<string, FileItem>; // key is path
    containerEl: HTMLElement;
    headerDom: HTMLElement; // The header container
}

// For our independent file tree AND native explorer items
export interface FileItem {
    el: HTMLElement;
    file: TAbstractFile;
    collapsed?: boolean;
    childrenEl?: HTMLElement;
    selfEl?: HTMLElement;
}
