# google-font-installer-mac

TUI and web UI to search and install Google Fonts on macOS. Downloads `.ttf` files directly to `~/Library/Fonts/` where Font Book picks them up automatically.

## Usage

### Terminal UI

```bash
bunx google-font-installer-mac
```

### Web UI

```bash
bunx google-font-installer-mac web
```

Opens a local web server with a browser-based interface for searching, previewing, and installing fonts. Fonts are rendered live in the browser via Google Fonts.

## How it works

1. Loads the full Google Fonts catalog (1900+ fonts)
2. Search by name, browse through results
3. Preview fonts rendered in your browser (web UI) or terminal (TUI)
4. Select a font and all variants are downloaded as `.ttf` to `~/Library/Fonts/`

## TUI Controls

| Key | Action |
|---|---|
| Type + Enter | Search for a font |
| Arrow keys | Navigate results |
| Enter | Install selected font |
| b | Go back to search |
| Esc | Quit |

## Requirements

- [Bun](https://bun.sh) runtime
- macOS (installs to `~/Library/Fonts/`)

## License

MIT
