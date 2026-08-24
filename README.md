# Vault

A fully-local API key & backup-code manager for macOS with an Apple-style interface.

- 🔒 **Master password encryption** — your vault is encrypted with AES-256-GCM, key derived with scrypt (N=2¹⁷). Nothing is readable without your password.
- 🏠 **100% local** — data lives only in `~/Library/Application Support/Vault/`. No network, no accounts, no cloud.
- 🔑 **API keys** — store, reveal, copy with one click.
- 🛡️ **Backup / 2FA recovery codes** — mark codes used, restore them, copy instantly.
- 🏷️ **Tags & search** — organize and find anything instantly (⌘F focuses search, ⌘N adds an item).
- 📦 **Encrypted export / import** — move your vault between machines as a single encrypted `.vault` file.
- ⏱️ **Auto-lock** — locks when idle (configurable) or when the Mac sleeps.
- 🎨 **Apple design** — frosted-glass sidebar, SF-style system fonts and icons, light/dark auto-follows macOS, custom app icon.

## Run from source

```bash
npm install
npm start
```

## Use the built app

- `release/mac-arm64/Vault.app` — drag into `/Applications`.
- `release/Vault-1.0.0-arm64-mac.zip` — distributable archive (unzip, drag to Applications).
- DMG: build it with `npm run dist:mac` (see note below).

## Build the app

```bash
npm run dist:mac   # builds Vault.dmg + zip into release/
npm run pack       # just the unpacked .app (fast)
```

> Note: if you build inside a sandboxed/CI environment, `hdiutil` may be blocked and the DMG step fails — the `.zip` and `.app` still build fine.

## Dev utilities

```bash
npm run smoke   # automated 10-check UI test (VAULT_SMOKE=1, throwaway data)
npm run shots   # captures UI screenshots into ./shots (light + dark)
npm run icon    # regenerates build/icon.icns from build/icon.html
```

## Where is my data?

| What | Where |
| --- | --- |
| Encrypted vault | `~/Library/Application Support/Vault/vault.vlt` |
| Previous vault version | `~/Library/Application Support/Vault/vault.vlt.bak` |
| App settings | `~/Library/Application Support/Vault/settings.json` |

## Security notes

- The plaintext vault exists only in main-process memory while unlocked; it is wiped on lock, sleep, or quit.
- The vault file uses scrypt + AES-256-GCM with an auth tag — wrong passwords and tampered files are rejected.
- Back up `vault.vlt` (or use **Export Backup…**) — there is no way to recover a forgotten master password.
