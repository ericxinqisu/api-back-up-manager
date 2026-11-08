'use strict';
/* Screenshot harness — captures the UI at key moments to verify the design.
   Enabled with VAULT_SHOT=1 (dev only; throwaway userData, writes PNGs to ./shots). */

const { app, nativeTheme } = require('electron');
const fs = require('fs');
const path = require('path');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(win) {
  const js = (code) => win.webContents.executeJavaScript(code, true);
  const shotsDir = path.join(process.cwd(), 'shots');
  fs.mkdirSync(shotsDir, { recursive: true });
  const log = (m) => console.log('[shot]', m);
  let n = 0;

  const shot = async (name) => {
    n += 1;
    const clean = name.replace(/^\d+-/, '');
    const image = await win.webContents.capturePage();
    fs.writeFileSync(path.join(shotsDir, `${String(n).padStart(2, '0')}-${clean}.png`), image.toPNG());
    log(`captured ${clean}.png`);
  };

  try {
    await sleep(1000);

    // Create the vault and seed it with sample data.
    await js(`(() => {
      document.querySelector('#lock-password').value = 'shot-password';
      document.querySelector('#lock-confirm').value = 'shot-password';
      document.querySelector('#lock-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    })()`);
    await sleep(900);

    // API key item (favorite, with tag)
    await js(`document.querySelector('#btn-new').click()`);
    await sleep(250);
    await js(`(() => {
      document.querySelector('#ed-title').value = 'GitHub API';
      document.querySelector('#ed-key').value = 'demo-github-token-fake';
      document.querySelector('#ed-notes').value = 'Production token — expires 2027-03-01.';
      const tagInput = document.querySelector('.token-input');
      tagInput.value = 'work';
      tagInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      document.querySelector('#ed-fav').click();
      document.querySelector('#editor-save').click();
    })()`);
    await sleep(600);

    // Backup codes item with tag
    await js(`document.querySelector('#btn-new').click()`);
    await sleep(250);
    await js(`(() => {
      document.querySelectorAll('.type-option').forEach((b) => { if (b.getAttribute('data-type') === 'backupCodes') b.click(); });
    })()`);
    await sleep(150);
    await js(`(() => {
      document.querySelector('#ed-title').value = 'Gmail Recovery';
      document.querySelector('#ed-codes').value = 'ABCD-EFGH-1234\\nWXYZ-UVQR-9876\\nJKLN-MNOP-5555';
      document.querySelector('#ed-notes').value = 'Recovery codes for Google account.';
      const tagInput = document.querySelector('.token-input');
      tagInput.value = 'personal';
      tagInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      document.querySelector('#editor-save').click();
    })()`);
    await sleep(600);

    // Third item
    await js(`document.querySelector('#btn-new').click()`);
    await sleep(250);
    await js(`(() => {
      document.querySelector('#ed-title').value = 'Stripe Live Key';
      document.querySelector('#ed-key').value = 'demo-stripe-key-fake';
      document.querySelector('#editor-save').click();
    })()`);
    await sleep(600);

    await shot('01-main-list');

    // Select GitHub, reveal key, capture detail
    await js(`(() => {
      const rows = document.querySelectorAll('.item-row');
      [...rows].find((r) => r.querySelector('.item-title').textContent === 'GitHub API').click();
    })()`);
    await sleep(300);
    await js(`document.querySelector('[data-act="reveal"]').click()`);
    await sleep(200);
    await shot('02-detail-revealed');

    // Editor modal
    await js(`document.querySelector('#btn-new').click()`);
    await sleep(350);
    await shot('03-editor');
    await js(`document.querySelector('#editor-cancel').click()`);
    await sleep(200);

    // Settings popover
    await js(`document.querySelector('#btn-settings').click()`);
    await sleep(300);
    await shot('04-settings-popover');
    await js(`document.querySelector('#btn-settings').click()`);
    await sleep(200);

    // Backup codes detail
    await js(`(() => {
      const rows = document.querySelectorAll('.item-row');
      [...rows].find((r) => r.querySelector('.item-title').textContent === 'Gmail Recovery').click();
    })()`);
    await sleep(300);
    await shot('05-codes-detail');

    // Lock screen
    await js(`document.querySelector('#btn-lock').click()`);
    await sleep(400);
    await shot('06-lock-screen');

    // Dark mode: unlock + captures
    nativeTheme.themeSource = 'dark';
    await sleep(400);
    await js(`(() => {
      document.querySelector('#lock-password').value = 'shot-password';
      document.querySelector('#lock-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    })()`);
    await sleep(1000);
    await shot('07-main-dark');
    await js(`(() => {
      const rows = document.querySelectorAll('.item-row');
      [...rows].find((r) => r.querySelector('.item-title').textContent === 'GitHub API').click();
    })()`);
    await sleep(300);
    await js(`document.querySelector('[data-act="reveal"]').click()`);
    await sleep(200);
    await shot('08-detail-dark');

    log(`done — ${n} screenshots in ${shotsDir}`);
    app.exit(0);
  } catch (err) {
    console.error('[shot] ERROR', err);
    app.exit(2);
  }
}

module.exports = { run };
