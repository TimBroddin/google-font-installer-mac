# google-font-installer-mac

TUI to search and install Google Fonts on macOS. Downloads `.ttf` files directly to `~/Library/Fonts/` where Font Book picks them up automatically.

## Usage

```bash
bunx google-font-installer-mac
```

## How it works

1. Loads the full Google Fonts catalog (1900+ fonts)
2. Search by name, scroll through results
3. Select a font and all variants are downloaded as `.ttf` to `~/Library/Fonts/`

## Controls

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
