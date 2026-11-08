'use strict';
/* Dev utility: renders build/icon.html to PNG, then generates a full .icns
   via sips + iconutil. Enabled with VAULT_ICON=1. */

const { app, BrowserWindow } = require('electron');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const root = process.cwd();
  const png = path.join(root, 'build', 'icon-1024.png');
  const iconset = path.join(root, 'build', 'icon.iconset');

  const win = new BrowserWindow({
    width: 1024,
    height: 1024,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: { offscreen: true },
  });
  await win.loadFile(path.join(root, 'build', 'icon.html'));
  await sleep(800);
  const image = await win.webContents.capturePage();
  fs.writeFileSync(png, image.toPNG());
  win.destroy();

  // Generate all iconset sizes
  const sizes = [
    ['icon_16x16.png', 16],
    ['icon_16x16@2x.png', 32],
    ['icon_32x32.png', 32],
    ['icon_32x32@2x.png', 64],
    ['icon_128x128.png', 128],
    ['icon_128x128@2x.png', 256],
    ['icon_256x256.png', 256],
    ['icon_256x256@2x.png', 512],
    ['icon_512x512.png', 512],
    ['icon_512x512@2x.png', 1024],
  ];
  fs.mkdirSync(iconset, { recursive: true });
  for (const [name, px] of sizes) {
    execFileSync('sips', ['-z', String(px), String(px), png, '--out', path.join(iconset, name)]);
  }
  execFileSync('iconutil', ['-c', 'icns', iconset, '-o', path.join(root, 'build', 'icon.icns')]);
  console.log('[icon] created build/icon.icns');
  app.exit(0);
}

module.exports = { run };
