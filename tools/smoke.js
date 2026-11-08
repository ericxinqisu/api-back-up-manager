'use strict';
/* Automated smoke test — drives the real UI via executeJavaScript.
   Enabled with VAULT_SMOKE=1 (dev only; uses a throwaway userData dir). */

const { app } = require('electron');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(win) {
  const js = (code) => win.webContents.executeJavaScript(code, true);
  const results = [];
  const check = (name, ok) => {
    results.push({ name, ok });
    console.log(`[smoke] ${ok ? 'PASS' : 'FAIL'} ${name}`);
  };

  try {
    await sleep(900); // let the page boot

    // 1. First run → setup screen
    const setupTitle = await js(`document.querySelector('#lock-title').textContent`);
    check('setup screen shown', setupTitle === 'Create Your Master Password');

    // 2. Create vault (short password should be rejected first)
    await js(`(() => {
      document.querySelector('#lock-password').value = 'short';
      document.querySelector('#lock-confirm').value = 'short';
      document.querySelector('#lock-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    })()`);
    await sleep(300);
    const errVisible = await js(`!document.querySelector('#lock-error').classList.contains('hidden')`);
    check('weak password rejected', errVisible);

    await js(`(() => {
      document.querySelector('#lock-password').value = 'smoke-test-password';
      document.querySelector('#lock-confirm').value = 'smoke-test-password';
      document.querySelector('#lock-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    })()`);
    await sleep(1000);
    const mainVisible = await js(`!document.querySelector('#screen-main').classList.contains('hidden')`);
    check('vault created + unlocked', mainVisible);

    // 3. Add an API key item
    await js(`document.querySelector('#btn-new').click()`);
    await sleep(250);
    await js(`(() => {
      document.querySelector('#ed-title').value = 'GitHub API';
      document.querySelector('#ed-key').value = 'sk-test-1234567890';
      document.querySelector('#editor-save').click();
    })()`);
    await sleep(600);
    const rowTitle = await js(`(() => { const r = document.querySelector('.item-row .item-title'); return r ? r.textContent : null; })()`);
    check('api key item added', rowTitle === 'GitHub API');

    // 4. Select + reveal the key
    await js(`document.querySelector('.item-row').click()`);
    await sleep(250);
    await js(`document.querySelector('[data-act="reveal"]').click()`);
    await sleep(200);
    const keyText = await js(`document.querySelector('.key-code').textContent`);
    check('key reveals in detail', keyText === 'sk-test-1234567890');

    // 5. Add a backup codes item
    await js(`document.querySelector('#btn-new').click()`);
    await sleep(250);
    await js(`(() => {
      document.querySelectorAll('.type-option').forEach((b) => { if (b.getAttribute('data-type') === 'backupCodes') b.click(); });
    })()`);
    await sleep(150);
    await js(`(() => {
      document.querySelector('#ed-title').value = 'Gmail Recovery';
      document.querySelector('#ed-codes').value = 'ABCD-1234\\nEFGH-5678';
      document.querySelector('#editor-save').click();
    })()`);
    await sleep(600);
    const itemCount = await js(`document.querySelectorAll('.item-row').length`);
    check('backup codes item added (2 items total)', itemCount === 2);

    // 6. Mark a code used
    await js(`(() => {
      const rows = document.querySelectorAll('.item-row');
      [...rows].find((r) => r.querySelector('.item-title').textContent === 'Gmail Recovery').click();
    })()`);
    await sleep(250);
    await js(`document.querySelector('.code-chip .use').click()`);
    await sleep(250);
    const usedCount = await js(`document.querySelectorAll('.code-chip.used').length`);
    check('mark code used', usedCount === 1);

    // 7. Search narrows the list (type real keystrokes into the field)
    await js(`document.querySelector('#search').focus()`);
    await sleep(150);
    for (const ch of 'Gmail') {
      win.webContents.sendInputEvent({ type: 'char', keyCode: ch });
      await sleep(25);
    }
    await sleep(350);
    const searchState = await js(`(() => {
      const s = document.querySelector('#search');
      return { val: s.value, count: document.querySelectorAll('.item-row').length, listCount: document.querySelector('#list-count').textContent };
    })()`);
    console.log('[smoke] debug searchState =', JSON.stringify(searchState));
    const searchCount = await js(`document.querySelectorAll('.item-row').length`);
    check('search narrows to 1 item', searchCount === 1);
    await js(`(() => { const s = document.querySelector('#search'); s.value = ''; s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await sleep(200);

    // 8. Lock and unlock — data persists
    await js(`document.querySelector('#btn-lock').click()`);
    await sleep(500);
    const locked = await js(`!document.querySelector('#screen-lock').classList.contains('hidden')`);
    check('lock returns to lock screen', locked);

    // 7b. Touch ID round trip (requires VAULT_SMOKE_TOUCHID=1 + a usable
    // macOS Keychain; the biometric prompt itself is skipped by the flag).
    if (process.env.VAULT_SMOKE_TOUCHID) {
      await js(`(() => {
        document.querySelector('#lock-password').value = 'smoke-test-password';
        document.querySelector('#lock-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      })()`);
      await sleep(1000);
      const tid1 = await js(`window.vaultAPI.touchIdStatus()`);
      check('touch id hardware available', tid1.available === true);
      await js(`window.vaultAPI.setSettings({ touchIdEnabled: true })`);
      const tid2 = await js(`window.vaultAPI.touchIdStatus()`);
      check('touch id key parked in keychain', tid2.enabled === true && tid2.ready === true);
      await js(`document.querySelector('#btn-lock').click()`);
      await sleep(500);
      const rowShown = await js(`!document.querySelector('#touchid-row').classList.contains('hidden')`);
      check('touch id row visible when enabled', rowShown);
      const res = await js(`window.vaultAPI.unlockWithTouchId().then((r) => ({ ok: true, items: r.vault && r.vault.items.length }), (e) => ({ ok: false, msg: e.message }))`);
      check('touch id unlock restores vault', res.ok === true && res.items === 2);
      // Disable Touch ID again and re-lock from the renderer so the UI state
      // (hidden Touch ID row) matches the settings for the checks below.
      await js(`window.vaultAPI.setSettings({ touchIdEnabled: false }).then(() => lockNow(true))`);
      await sleep(500);
    }

    const touchIdRowHidden = await js(`document.querySelector('#touchid-row').classList.contains('hidden')`);
    check('touch id row hidden while disabled', touchIdRowHidden);
    const touchIdErr = await js(`window.vaultAPI.unlockWithTouchId().then(() => 'ok', (e) => e.message)`);
    check(
      'touch id unlock refused while disabled',
      typeof touchIdErr === 'string' && touchIdErr.includes('Touch ID unlock is turned off')
    );
    await js(`(() => {
      document.querySelector('#lock-password').value = 'smoke-test-password';
      document.querySelector('#lock-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    })()`);
    await sleep(1000);
    const countAfter = await js(`document.querySelectorAll('.item-row').length`);
    check('unlock restores both items', countAfter === 2);

    const failed = results.filter((r) => !r.ok);
    console.log(`[smoke] ${results.length - failed.length}/${results.length} passed`);
    if (failed.length) {
      app.exit(1);
    }
    // Success path: close the window instead of exiting. The process must
    // then quit on its own via window-all-closed -> app.quit(); if it
    // doesn't, the smoke run hangs and the caller times out (a failure).
    win.close();
  } catch (err) {
    console.error('[smoke] ERROR', err);
    app.exit(2);
  }
}

module.exports = { run };
