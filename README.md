# Obsidian Fuzzy Explorer

Fuzzy Explorer is an Obsidian plugin that provides advanced file search and filtering capabilities. It offers two modes of operation: a dedicated **Fuzzy Explorer View** (a completely independent file tree) and a **Native Explorer Integration** (adding search to Obsidian's built-in file explorer).

## Features

- **Native Explorer Search:** Add a powerful fuzzy search bar directly to your standard Obsidian file explorer.
- **Independent File Explorer:** Run a separate, fully independent explorer view alongside your native one.
- **Fuzzy Search:** Filter files and folders using advanced fuzzy matching logic.
- **Rich Query Syntax:** Support for operators like `path:`, `file:`, `tag:`, `-folder:`, exact phrases `"..."`, and regex `/.../`.
- **Drag & Drop:** Fully supports drag and drop. Dragging files creates Wikilinks; dragging folders creates a list of links for all *visible* files in that folder.
- **Multiple Instances:** Open multiple independent Fuzzy Explorer instances in different panes.
- **Vault Sync:** Automatically updates when files are created, deleted, or renamed in your vault.

## Native Explorer Search (New!)

You can now add fuzzy search functionality directly to Obsidian's native file explorer.

1.  **Enable:** Go to **Settings -> Fuzzy Explorer** and toggle on **"Enable Native Explorer Search"**.
2.  **Usage:**
    - A search icon (magnifying glass) will appear in the file explorer header. Click it to toggle the search bar.
    - Type to filter the current file explorer view immediately.
    - Each file explorer pane has its own independent search state.
3.  **Command:** Use the command **"Fuzzy Explorer: Search in Native Explorer"** to toggle the search bar. This command is compatible with the **Commander** plugin, allowing you to add the search button anywhere in the UI (e.g., tab bar, status bar).

## Independent Fuzzy Explorer View

If you prefer a separate view that doesn't alter the native explorer:

1.  **Open:**
    - Click the folder-search icon in the left ribbon.
    - Use the command **"Fuzzy Explorer: Toggle Fuzzy Explorer"**.
    - Use "Open Fuzzy Explorer (new, left/right/split)" commands for extra layouts.
2.  **Search:** Type in the search bar at the top of the view.
3.  **Drag & Drop:**
    - Drag files/folders to the editor to create links.
    - **Tip:** If you filter a folder and then drag it, only the *visible* (matched) files will be linked!

## Search Syntax

- **Simple Text:** Fuzzy matches filename and path.
- **Exact Phrase:** `"my exact phrase"`
- **Regex:** `/^daily-\d+/`
- **Path:** `path:journal` (matches files in 'journal' folder)
- **File:** `file:meeting` (matches filename only)
- **Tag:** `tag:important` (matches files with #important tag)
- **Exclude:** `-folder:archive` (hides 'archive' folder) or `-file:temp`

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

## License

MIT
