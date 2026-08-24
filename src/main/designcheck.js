'use strict';
/* Throwaway: verify the Apple-style design applied via computed styles. */
const { app } = require('electron');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(win) {
  const js = (code) => win.webContents.executeJavaScript(code, true);
  try {
    await sleep(900);
    await js(`(() => {
      document.querySelector('#lock-password').value = 'check-password';
      document.querySelector('#lock-confirm').value = 'check-password';
      document.querySelector('#lock-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    })()`);
    await sleep(900);
    // Open settings popover and check the Auto-Lock grid fits inside
    await js(`document.querySelector('#btn-settings').click()`);
    await sleep(300);
    const report = await js(`(() => {
      const cs = (el) => getComputedStyle(el);
      const root = cs(document.documentElement);
      const sidebar = cs(document.querySelector('#sidebar'));
      const row = document.querySelector('.nav-row');
      const btn = cs(document.querySelector('.btn.primary'));
      const search = cs(document.querySelector('.search-wrap input'));
      const seg = document.querySelector('#auto-lock-seg');
      const pop = document.querySelector('#settings-pop');
      const segR = seg.getBoundingClientRect();
      const popR = pop.getBoundingClientRect();
      const iconEl = row.querySelector('[data-icon]');
      const footBtn = document.querySelector('#btn-export');
      const footIcon = footBtn.querySelector('[data-icon]');
      return {
        font: cs(document.body).fontFamily.split(',')[0],
        accent: root.getPropertyValue('--accent').trim(),
        sidebarBlur: sidebar.backdropFilter || sidebar.webkitBackdropFilter,
        navIconSize: iconEl ? iconEl.getBoundingClientRect().width : null,
        footIconSize: footIcon ? footIcon.getBoundingClientRect().width : null,
        footBtnHeight: Math.round(footBtn.getBoundingClientRect().height),
        footBtnFont: cs(footBtn).fontSize,
        grid: cs(document.querySelector('.main-body')).gridTemplateColumns,
        autoLockColumns: cs(seg).gridTemplateColumns,
        segInsidePop: segR.right <= popR.right + 1 && segR.left >= popR.left - 1 && segR.bottom <= popR.bottom + 1,
        segWidth: Math.round(segR.width),
        popWidth: Math.round(popR.width),
        btnCount: seg.querySelectorAll('button').length,
      };
    })()`);
    console.log('[check]', JSON.stringify(report, null, 2));
    app.exit(0);
  } catch (err) {
    console.error('[check] ERROR', err);
    app.exit(2);
  }
}
module.exports = { run };
