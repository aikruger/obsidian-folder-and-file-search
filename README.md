# Obsidian Fuzzy Explorer

Fuzzy Explorer is an Obsidian plugin that provides an independent file explorer view with a built-in fuzzy search filter. It allows you to search and filter your vault's files and folders quickly and efficiently, while maintaining the familiar hierarchical tree structure.

## Features

- **Independent File Explorer:** Runs as a separate view, allowing you to keep your native file explorer open or hidden.
- **Fuzzy Search:** Filter files and folders using fuzzy matching logic.
- **Drag & Drop:** Fully supports drag and drop operations, behaving like the native explorer. Move files and folders around with ease.
- **Multiple Instances:** Open multiple independent Fuzzy Explorer instances in different panes (left, right, or split).
- **Customizable:** Option to change the view icon to a custom folder icon.
- **Highlighting:** Matches are highlighted in the file tree for better visibility.
- **Vault Sync:** Automatically updates when files are created, deleted, or renamed in your vault.

## How to Use

1.  **Open Fuzzy Explorer:**
    - Click the folder icon in the left ribbon (toggles the first instance).
    - Use the command palette (`Ctrl/Cmd + P`) and search for "Open Fuzzy Explorer".
    - Use "Open Fuzzy Explorer (new, left/right/split)" commands to open additional instances.

2.  **Search:**
    - Type in the search bar at the top of the view to filter files.
    - Use operators like `path:`, `file:`, `tag:`, `-folder:`, `"..."` (exact phrase), and `/.../` (regex).

3.  **Drag & Drop:**
    - Drag files or folders from the Fuzzy Explorer to other panes, the editor, or the native file explorer.
    - Drop files into folders within the Fuzzy Explorer to move them.

## Installation

1.  Search for "Fuzzy Explorer" in the Obsidian Community Plugins settings.
2.  Click "Install" and then "Enable".

## Manual Installation

1.  Download the latest release from the GitHub releases page.
2.  Extract the files (`main.js`, `styles.css`, `manifest.json`) into your vault's plugin folder: `.obsidian/plugins/obsidian-fuzzy-explorer/`.
3.  Reload Obsidian.

## Development

- Clone this repo.
- Run `npm install` to install dependencies.
- Run `npm run dev` to start compilation in watch mode.

## Custom Icon

To use a custom icon for the view (e.g., from Flaticon):
1.  Place your SVG file in `plugins/obsidian-fuzzy-explorer/assets/fuzzy-folder.svg`.
2.  The plugin is pre-configured to look for this file and override the default icon.

## License

MIT
