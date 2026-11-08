# Changelog

## 1.1.2
- Fix Touch ID success being misread as a failure.
- Add `--touchid-self-test` diagnostic mode.

## 1.1.1
- Clearer Touch ID failure messages; strip Electron's IPC error wrapper.

## 1.1.0
- Unlock with Touch ID (vault key parked in the macOS Keychain via `safeStorage`).
- Closing the window now quits the app.

## 1.0.0
- Initial release: encrypted local vault for API keys and backup codes.

## Unreleased
- Touch ID is the default login method when enabled.
- Dev tools moved from `src/main` to `tools/`; added CI and release workflow.
