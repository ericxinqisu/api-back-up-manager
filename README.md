# Vault

A fully-local API key and backup-code manager for macOS, with an Apple-style interface.

## Install

1. Open the [Releases page](https://github.com/ericxinqisu/api-back-up-manager/releases/latest).
2. Under **Assets**, download `Vault-<version>-arm64.dmg` (Apple Silicon Macs).
3. Double-click the downloaded `.dmg`.
4. Drag **Vault** into the **Applications** folder.
5. Eject the disk image, then open Vault from Applications or Launchpad.

> **First launch:** the app is not notarized by Apple, so macOS may block it. Right-click Vault in Applications, choose **Open**, then click **Open** again. If it still says the app is damaged, run `xattr -dr com.apple.quarantine /Applications/Vault.app` in Terminal.

Older versions are also on the Releases page; see [CHANGELOG.md](CHANGELOG.md) for what changed in each.

## Features

- 🔒 **Master password encryption:** the vault is encrypted with AES-256-GCM, with the key derived using scrypt (N=2¹⁷). Nothing is readable without your password.
- 👆 **Touch ID unlock:** turn on "Unlock with Touch ID" in Settings. The vault key is kept in your macOS Keychain (via Electron `safeStorage`) and released only after a successful Touch ID check. When enabled, Touch ID is the default login method.
- 🏠 **100% local:** data lives only in `~/Library/Application Support/Vault/`. No network, no accounts, no cloud.
- 🔑 **API keys:** store, reveal and copy with one click.
- 🛡️ **Backup / 2FA recovery codes:** mark codes used, restore them, copy instantly.
- 🏷️ **Tags and search:** ⌘F focuses search, ⌘N adds an item.
- 📦 **Encrypted export / import:** move your vault between machines as a single encrypted `.vault` file.
- ⏱️ **Auto-lock:** locks when idle (configurable) or when the Mac sleeps.
- ❌ **Close quits:** closing the window quits Vault completely; the vault stays encrypted at rest.
- 🎨 **Apple design:** frosted-glass sidebar, system fonts and icons, light/dark mode that follows macOS.

## Where is my data?

| What | Where |
| --- | --- |
| Encrypted vault | `~/Library/Application Support/Vault/vault.vlt` |
| Previous vault version | `~/Library/Application Support/Vault/vault.vlt.bak` |
| App settings | `~/Library/Application Support/Vault/settings.json` |
| Touch ID unlock key (Keychain-encrypted) | `~/Library/Application Support/Vault/touchid.vlt` |

## Security notes

- The plaintext vault exists only in main-process memory while unlocked; it is wiped on lock, sleep or quit.
- The vault file uses scrypt + AES-256-GCM with an auth tag, so wrong passwords and tampered files are rejected.
- Touch ID stores the vault key encrypted with the macOS Keychain (`safeStorage`). Enabling it may show a one-time Keychain prompt, and macOS may ask again if the app is replaced by an unsigned build.
- **Back up `vault.vlt`** (or use **Export Backup…**). There is no way to recover a forgotten master password.

## For developers

```bash
npm install
npm start          # run from source
npm test           # crypto unit tests
npm run smoke      # automated UI test (throwaway data)
npm run shots      # screenshots into ./shots (light + dark)
npm run icon       # regenerate build/icon.icns from build/icon.html
npm run dist:mac   # build .dmg + .zip into release/ (git-ignored)
```

To include the Touch ID round trip in the smoke test (uses the real Keychain, skips only the biometric prompt): `VAULT_SMOKE_TOUCHID=1 npm run smoke`.

### Project layout

```
src/main/       Electron main process (window, IPC, crypto, store)
src/renderer/   UI (HTML / CSS / JS)
src/preload.js  Context-isolated bridge
tools/          Dev-only utilities (smoke test, screenshots, icon), not packaged
test/           Unit tests
build/          App icon sources
release-notes/  Per-version release notes
.github/        CI and release workflow
```

### Publishing a release

Bump `version` in `package.json`, update `CHANGELOG.md`, then push a tag:

```bash
git tag v1.2.0 && git push origin v1.2.0
```

The release workflow builds the macOS app and attaches the `.dmg` and `.zip` to a GitHub Release.

## License

MIT
