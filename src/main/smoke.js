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
    await js(`(() => {
      document.querySelector('#lock-password').value = 'smoke-test-password';
      document.querySelector('#lock-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    })()`);
    await sleep(1000);
    const countAfter = await js(`document.querySelectorAll('.item-row').length`);
    check('unlock restores both items', countAfter === 2);

    const failed = results.filter((r) => !r.ok);
    console.log(`[smoke] ${results.length - failed.length}/${results.length} passed`);
    app.exit(failed.length ? 1 : 0);
  } catch (err) {
    console.error('[smoke] ERROR', err);
    app.exit(2);
  }
}

module.exports = { run };
