# Kcode icon assets (placeholders)

Phase 1 uses **placeholder icons** copied from upstream `code.*` assets by `apply-kcode-rebranding.ps1`:

| Platform | Placeholder source | Target |
| -------- | ------------------ | ------ |
| Windows  | `resources/win32/code.ico` | `resources/win32/kcode.ico` |
| macOS    | `resources/darwin/code.icns` | `resources/darwin/kcode.icns` |
| Linux    | `resources/linux/code.png` | `resources/linux/kcode.png` |
| Server   | `resources/server/code-192.png` | `resources/server/kcode-192.png` |
| Server   | `resources/server/code-512.png` | `resources/server/kcode-512.png` |

Replace these with custom Kcode artwork before public release. Recommended specs:

- **Windows `.ico`**: multi-size (16, 32, 48, 256 px)
- **macOS `.icns`**: 512×512 @2x included
- **Linux `.png`**: 512×512 transparent background

Custom files can be dropped into this directory (`branding/overrides/resources/...`) and will overwrite upstream on rebrand apply.
