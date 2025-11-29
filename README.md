# Fuzzy Explorer Filter for Obsidian

This plugin adds a powerful, Notion-style fuzzy search filter to the Obsidian file explorer. It allows you to quickly find files and folders by dynamically filtering the explorer view as you type.


## Features

- **Fuzzy Search**: Quickly find files and folders with a fuzzy matching algorithm.
- **Advanced Query Syntax**: Use operators like `file:`, `path:`, `tag:`, and `-` for precise filtering.
- **Highlighting**: Matches in the file and folder names are highlighted.
- **Match Indicators**: Icons indicate why a file or folder is shown (e.g., a file inside a matching folder).
- **Customizable Settings**: Adjust the search behavior to your liking.

## How to Use

1. **Open the search bar**: Click the search icon in the file explorer's navigation bar.
2. **Start typing**: The file explorer will filter as you type.
3. **Use advanced queries**: Use the syntax below to perform more advanced searches.

### Advanced Query Syntax

| Syntax | Description | Example |
|---|---|---|
| `term` | Fuzzy search for a term in file or folder names. | `report` |
| `"exact phrase"` | Search for an exact phrase. | `"meeting notes"` |
| `file:term` | Fuzzy search for a term in file names only. | `file:report` |
| `-file:term` | Exclude files with a term in their name. | `-file:draft` |
| `path:term` | Fuzzy search for a term in the file or folder path. | `path:Projects` |
| `-path:term` | Exclude files and folders in a specific path. | `-path:Archive` |
| `folder:term` | Alias for `path:`. | `folder:Projects` |
| `-folder:term` | Exclude a specific folder. | `-folder:Templates` |
| `tag:#tagname` | Include files with a specific tag. | `tag:#important` |
| `-tag:#tagname` | Exclude files with a specific tag. | `-tag:#personal` |
| `/regex/` | Search with a regular expression. | `/[0-9]{4}-[0-9]{2}-[0-9]{2}/` |

You can combine these operators to create complex queries. For example, `report path:Projects -folder:Archive` will find all files with "report" in their name, located in the "Projects" folder, but not in the "Archive" folder.

## Settings

- **Case Sensitive Search**: Toggle whether the search is case-sensitive.
- **Highlight Matches**: Toggle whether to highlight matching characters in the search results.
- **Show Match Count**: Toggle whether to show the number of matching files and folders.

## Installation

1. Open **Settings** in Obsidian.
2. Go to **Community plugins**.
3. Make sure **Restricted mode** is turned off.
4. Click **Browse** and search for "Fuzzy Explorer Filter".
5. Click **Install**.
6. Once it's installed, click **Enable**.

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request on the GitHub repository.

## License

This plugin is licensed under the [MIT License](LICENSE).
