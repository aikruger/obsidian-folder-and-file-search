import { View, TAbstractFile } from 'obsidian';

// For referencing the native file explorer
export interface FileExplorerView extends View {
  fileItems: Record<string, any>; // This is a simplified type for the native explorer's items
  containerEl: HTMLElement;
}

// For our independent file tree
export interface FileItem {
  el: HTMLElement;
  file: TAbstractFile;
  collapsed?: boolean;
  childrenEl?: HTMLElement;
}
