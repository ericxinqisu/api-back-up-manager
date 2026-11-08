# Vault

A fully-local API key & backup-code manager for macOS with an Apple-style interface.

- 🔒 **Master password encryption** — your vault is encrypted with AES-256-GCM, key derived with scrypt (N=2¹⁷). Nothing is readable without your password.
- 👆 **Touch ID unlock** — enable "Unlock with Touch ID" in Settings to open your vault with a fingerprint. The vault key is parked in your macOS Keychain (via Electron `safeStorage`) and is only released after a successful `systemPreferences.promptTouchID` check.
- 🏠 **100% local** — data lives only in `~/Library/Application Support/Vault/`. No network, no accounts, no cloud.
- 🔑 **API keys** — store, reveal, copy with one click.
- 🛡️ **Backup / 2FA recovery codes** — mark codes used, restore them, copy instantly.
- 🏷️ **Tags & search** — organize and find anything instantly (⌘F focuses search, ⌘N adds an item).
- 📦 **Encrypted export / import** — move your vault between machines as a single encrypted `.vault` file.
- ⏱️ **Auto-lock** — locks when idle (configurable) or when the Mac sleeps.
- ❌ **Close quits** — closing the window quits Vault completely; the vault stays encrypted at rest.
- 🎨 **Apple design** — frosted-glass sidebar, SF-style system fonts and icons, light/dark auto-follows macOS, custom app icon.

## Run from source

```bash
npm install
npm start
```

## Download

Every version is published on the [Releases page](https://github.com/ericxinqisu/api-back-up-manager/releases).
Pick a version and download the `.dmg` (drag Vault into `/Applications`) or the `.zip`.
See [CHANGELOG.md](CHANGELOG.md) for what changed in each version.

## Build the app

```bash
npm run dist:mac   # builds Vault.dmg + zip into release/ (git-ignored)
npm run pack       # just the unpacked .app (fast)
```

> The DMG and zip are ad-hoc/Apple-Development signed but not notarized, so the first launch of a copied build may need a right-click → Open (or `xattr -dr com.apple.quarantine`). Building on this Mac for local use works directly.

## Project layout

```
src/main/       Electron main process (window, IPC, crypto, store)
src/renderer/   UI (HTML / CSS / JS)
src/preload.js  Context-isolated bridge
tools/          Dev-only utilities (smoke test, screenshots, icon) - not packaged
test/           Unit tests (npm test)
build/          App icon sources
.github/        CI + release workflow
```

## Dev utilities

```bash
npm run smoke   # automated UI test (VAULT_SMOKE=1, throwaway data)
npm run shots   # captures UI screenshots into ./shots (light + dark)
npm test         # unit tests for the crypto module
npm run icon    # regenerates build/icon.icns from build/icon.html
```

To include the Touch ID unlock round trip in the smoke test (it uses the
real macOS Keychain and skips only the biometric prompt), run:

```bash
VAULT_SMOKE_TOUCHID=1 npm run smoke
```

## Where is my data?

| What | Where |
| --- | --- |
| Encrypted vault | `~/Library/Application Support/Vault/vault.vlt` |
| Previous vault version | `~/Library/Application Support/Vault/vault.vlt.bak` |
| App settings | `~/Library/Application Support/Vault/settings.json` |
| Touch ID unlock key (Keychain-encrypted) | `~/Library/Application Support/Vault/touchid.vlt` |

## Security notes

- The plaintext vault exists only in main-process memory while unlocked; it is wiped on lock, sleep, or quit.
- The vault file uses scrypt + AES-256-GCM with an auth tag — wrong passwords and tampered files are rejected.
- Touch ID stores the vault key encrypted with the macOS Keychain (`safeStorage`); enabling it may show a one-time Keychain authorization prompt, and macOS may ask again if the app is rebuilt unsigned.
- Back up `vault.vlt` (or use **Export Backup…**) — there is no way to recover a forgotten master password.
