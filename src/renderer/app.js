'use strict';
/* Vault — renderer application logic */

const api = window.vaultAPI;

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

/* ---------------- Icons (inline SVG, SF-Symbols style) ---------------- */
const ICONS = {
  search:
    '<circle cx="11" cy="11" r="7"></circle><line x1="16.5" y1="16.5" x2="21" y2="21"></line>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>',
  gear: '<circle cx="12" cy="12" r="3.2"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.03Z"></path>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"></circle><path d="M10.8 12.2 20 3"></path><path d="M15.5 7.5l3 3"></path><path d="M17.5 5.5l2 2"></path>',
  shield:
    '<path d="M12 3l7 2.6v5.1c0 4.6-3 8.6-7 10.3-4-1.7-7-5.7-7-10.3V5.6L12 3Z"></path><path d="M9 12l2 2 4-4"></path>',
  star: '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5-5.9-3.1-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9 2.9-6Z"></path>',
  'square.stack':
    '<rect x="4" y="5" width="16" height="12" rx="2.5"></rect><path d="M8 21h8"></path><path d="M9.5 9.5h5"></path>',
  tag: '<path d="M3.5 11.5 11 4a2 2 0 0 1 1.4-.6H19a1.5 1.5 0 0 1 1.5 1.5v6.6a2 2 0 0 1-.6 1.4l-7.5 7.5a2 2 0 0 1-2.8 0l-6.1-6.1a2 2 0 0 1 0-2.8Z"></path><circle cx="16" cy="8" r="1.4" fill="currentColor" stroke="none"></circle>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2.5"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path>',
  export: '<path d="M12 15V4"></path><path d="m7 9 5-5 5 5"></path><path d="M5 20h14"></path>',
  import: '<path d="M12 4v11"></path><path d="m7 10 5 5 5-5"></path><path d="M5 20h14"></path>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"></path><circle cx="12" cy="12" r="3"></circle>',
  'eye.slash':
    '<path d="M4 4l16 16"></path><path d="M9.9 5.9A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17.8 17.8 0 0 1-3.3 4"></path><path d="M6.6 7.6A17.9 17.9 0 0 0 2.5 12S6 18.5 12 18.5a9.4 9.4 0 0 0 3.4-.6"></path><path d="M9.9 10.2a3 3 0 0 0 4 4"></path>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M5 15V5a2 2 0 0 1 2-2h10"></path>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"></path>',
  trash:
    '<path d="M4 7h16"></path><path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2"></path><path d="M6.5 7l1 12a2 2 0 0 0 2 1.9h5a2 2 0 0 0 2-1.9l1-12"></path><path d="M10 11v6"></path><path d="M14 11v6"></path>',
  pencil:
    '<path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z"></path><path d="m13.5 6.5 4 4"></path>',
  inbox:
    '<path d="M3 13h4l2 3h6l2-3h4"></path><path d="M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"></path>',
  selection: '<rect x="5" y="5" width="14" height="14" rx="3"></rect><path d="M9 9h6v6H9z"></path>',
  restore: '<path d="M4 10a8 8 0 1 1 2 6.5"></path><path d="M4 5v5h5"></path>',
  checkmark: '<path d="m5 12.5 4.5 4.5L19 7.5"></path>',
  chevron: '<path d="m9 6 6 6-6 6"></path>',
};

function icon(name, size) {
  const paths = ICONS[name] || '';
  return `<span class="icon" data-icon="${name}" style="${size ? `width:${size}px;height:${size}px` : ''}" aria-hidden="true"><svg viewBox="0 0 24 24">${paths}</svg></span>`;
}

function hydrateIcons(root = document) {
  $$('[data-icon]', root).forEach((el) => {
    const name = el.getAttribute('data-icon');
    if (name && ICONS[name]) {
      el.innerHTML = `<svg viewBox="0 0 24 24">${ICONS[name]}</svg>`;
    }
  });
}

/* ---------------- State ---------------- */
const state = {
  vault: null,
  mode: 'loading', // 'setup' | 'lock' | 'unlocked'
  filter: 'all', // all | apikeys | backupcodes | favorites | tag:<name>
  search: '',
  selectedId: null,
  revealed: new Set(), // item ids whose key is revealed
};

const AUTO_LOCK_OPTIONS = [
  { label: 'Never', value: 0 },
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
];

let settings = { autoLockMinutes: 5 };
let pendingImport = null; // reserved
let confirmResolver = null;
let activitySentAt = 0;

/* ---------------- Utilities ---------------- */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function typeLabel(item) {
  return item.type === 'apiKey' ? 'API Key' : 'Backup Codes';
}

function maskKey(value) {
  if (!value) return 'Empty';
  if (value.length <= 10) return '•'.repeat(value.length);
  return value.slice(0, 6) + '•'.repeat(Math.max(6, Math.min(12, value.length - 8)));
}

function itemCounts() {
  const v = state.vault;
  return {
    all: v.items.length,
    apikeys: v.items.filter((i) => i.type === 'apiKey').length,
    backupcodes: v.items.filter((i) => i.type === 'backupCodes').length,
    favorites: v.items.filter((i) => i.favorite).length,
  };
}

function filteredItems() {
  const v = state.vault;
  const q = state.search.trim().toLowerCase();
  let list = v.items;
  if (state.filter === 'apikeys') list = list.filter((i) => i.type === 'apiKey');
  else if (state.filter === 'backupcodes') list = list.filter((i) => i.type === 'backupCodes');
  else if (state.filter === 'favorites') list = list.filter((i) => i.favorite);
  else if (state.filter.startsWith('tag:')) {
    const t = state.filter.slice(4);
    list = list.filter((i) => (i.tags || []).includes(t));
  }
  if (q) {
    list = list.filter((i) => {
      let hay = [i.title, i.notes, (i.tags || []).join(' '), i.data.key || '']
        .join(' ')
        .toLowerCase();
      if (i.type === 'backupCodes') {
        hay += ' ' + (i.data.codes || []).map((c) => c.code).join(' ');
      }
      return hay.includes(q);
    });
  }
  return list.slice().sort((a, b) => {
    if (!!a.favorite !== !!b.favorite) return a.favorite ? -1 : 1;
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  });
}

/* ---------------- Persistence ---------------- */
function persist() {
  if (!state.vault) return;
  state.vault.meta.updatedAt = Date.now();
  api.save(JSON.stringify(state.vault)).catch((err) => {
    toast('Could not save: ' + message(err));
  });
}

/* ---------------- Toasts ---------------- */
function toast(text, ms = 2200) {
  const wrap = $('#toast-wrap');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  wrap.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 260);
  }, ms);
}

async function copyText(text, label = 'Copied') {
  try {
    await api.copyText(text);
    toast(label);
  } catch (_) {
    toast('Could not copy');
  }
}

function message(err) {
  return err && err.message ? err.message : String(err);
}

/* ---------------- Lock / unlock flow ---------------- */
function showScreen(name) {
  $('#screen-lock').classList.toggle('hidden', name !== 'lock');
  $('#screen-main').classList.toggle('hidden', name !== 'main');
}

function setLockMode(mode) {
  state.mode = mode;
  const isSetup = mode === 'setup';
  $('#lock-title').textContent = isSetup ? 'Create Your Master Password' : 'Welcome Back';
  $('#lock-subtitle').textContent = isSetup
    ? 'This password encrypts your vault. There is no recovery.'
    : 'Enter your master password to continue';
  $('#lock-confirm').classList.toggle('hidden', !isSetup);
  $('#lock-hint').classList.toggle('hidden', !isSetup);
  $('#lock-button').textContent = isSetup ? 'Create Vault' : 'Unlock';
  $('#lock-password').value = '';
  $('#lock-confirm').value = '';
  $('#lock-error').classList.add('hidden');
  setTimeout(() => $('#lock-password').focus(), 60);
}

function showLockError(msg) {
  const el = $('#lock-error');
  el.textContent = msg;
  el.classList.remove('hidden');
  const card = $('.lock-card');
  card.classList.remove('shake');
  void card.offsetWidth;
  card.classList.add('shake');
}

async function boot() {
  try {
    const { created } = await api.status();
    if (created) {
      setLockMode('lock');
      showScreen('lock');
    } else {
      setLockMode('setup');
      showScreen('lock');
    }
  } catch (err) {
    showLockError(message(err));
  }
}

async function handleUnlock(e) {
  e.preventDefault();
  const pw = $('#lock-password').value;
  if (!pw) return showLockError('Enter your master password');
  const isSetup = state.mode === 'setup';
  if (isSetup) {
    if (pw.length < 8) return showLockError('Master password must be at least 8 characters');
    if (pw !== $('#lock-confirm').value) return showLockError('Passwords do not match');
  }
  const btn = $('#lock-button');
  btn.disabled = true;
  try {
    let res;
    if (isSetup) {
      await api.setup(pw);
      const r2 = await api.unlock(pw);
      res = r2;
    } else {
      res = await api.unlock(pw);
    }
    enterVault(res.vault);
  } catch (err) {
    showLockError(message(err));
  } finally {
    btn.disabled = false;
  }
}

function enterVault(vault) {
  state.vault = vault;
  state.filter = 'all';
  state.search = '';
  state.selectedId = null;
  state.revealed = new Set();
  $('#search').value = '';
  showScreen('main');
  renderAll();
  $('#search').focus();
}

async function lockNow(quiet) {
  try {
    await api.lock();
  } catch (_) {
    /* ignore */
  }
  state.vault = null;
  state.selectedId = null;
  state.revealed = new Set();
  closePopover();
  closeEditor();
  if (!quiet) toast('Vault locked');
  setLockMode('lock');
  showScreen('lock');
}

/* ---------------- Rendering ---------------- */
function renderAll() {
  renderSidebar();
  renderList();
  renderDetail();
}

function filterLabel() {
  const f = state.filter;
  if (f === 'all') return 'All Items';
  if (f === 'apikeys') return 'API Keys';
  if (f === 'backupcodes') return 'Backup Codes';
  if (f === 'favorites') return 'Favorites';
  if (f.startsWith('tag:')) return 'Tag: ' + f.slice(4);
  return 'All Items';
}

function renderSidebar() {
  const counts = itemCounts();
  const map = { all: 'square.stack', apikeys: 'key', backupcodes: 'shield', favorites: 'star' };
  $$('.nav-row[data-filter]').forEach((row) => {
    const f = row.getAttribute('data-filter');
    const label = f === 'all' ? 'All Items' : f === 'apikeys' ? 'API Keys' : f === 'backupcodes' ? 'Backup Codes' : 'Favorites';
    row.classList.toggle('active', state.filter === f);
    row.innerHTML = `${icon(map[f])}<span>${label}</span><span class="nav-count">${counts[f]}</span>`;
  });
  hydrateIcons($('#sidebar'));

  const tagList = $('#tag-list');
  tagList.innerHTML = '';
  const tags = state.vault.tags || [];
  tags.forEach((t) => {
    const n = state.vault.items.filter((i) => (i.tags || []).includes(t)).length;
    const row = document.createElement('button');
    row.className = 'nav-row' + (state.filter === 'tag:' + t ? ' active' : '');
    row.innerHTML = `${icon('tag')}<span class="tag-name"></span><span class="nav-count">${n}</span><span class="row-delete" data-icon="x"></span>`;
    row.querySelector('.tag-name').textContent = t;
    row.addEventListener('click', (e) => {
      if (e.target.closest('.row-delete')) return;
      state.filter = 'tag:' + t;
      state.selectedId = null;
      renderAll();
    });
    const del = row.querySelector('.row-delete');
    del.innerHTML = '<svg viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18"></line><line x1="18" y1="6" x2="6" y2="18"></line></svg>';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTag(t);
    });
    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, [
        { label: 'Rename Tag', icon: 'pencil', action: () => renameTag(t) },
        { label: 'Delete Tag', icon: 'trash', danger: true, action: () => deleteTag(t) },
      ]);
    });
    tagList.appendChild(row);
  });
}

function renderList() {
  const list = $('#item-list');
  const items = filteredItems();
  $('#list-title').textContent = filterLabel();
  $('#list-count').textContent = items.length ? `${items.length} item${items.length === 1 ? '' : 's'}` : '';

  $('#empty-state').classList.toggle('hidden', items.length > 0);
  $('#empty-title').textContent = items.length ? '' : 'No Items';
  $('#empty-sub').textContent =
    state.search.trim() || state.filter !== 'all'
      ? 'Try a different search or filter'
      : 'Press \u2318N or the + button to add one';

  list.innerHTML = '';
  items.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'item-row' + (item.id === state.selectedId ? ' selected' : '');
    row.style.animationDelay = Math.min(idx * 18, 220) + 'ms';
    const sub = item.type === 'apiKey' ? 'API Key' : `${(item.data.codes || []).length} codes`;
    row.innerHTML = `
      <div class="item-icon ${item.type === 'apiKey' ? 'apiKey' : 'backupCodes'}">${icon(item.type === 'apiKey' ? 'key' : 'shield')}</div>
      <div class="item-info"><div class="item-title"></div><div class="item-subtitle"></div></div>
      <button class="fav-btn${item.favorite ? ' on' : ''}" title="Favorite">${icon('star')}</button>
    `;
    row.querySelector('.item-title').textContent = item.title;
    const extra = (item.tags || []).length ? ' · ' + (item.tags || []).join(', ') : '';
    row.querySelector('.item-subtitle').textContent = sub + extra;

    row.addEventListener('click', () => {
      state.selectedId = item.id;
      renderList();
      renderDetail();
    });
    row.addEventListener('dblclick', () => openEditor(item));
    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, [
        item.type === 'apiKey'
          ? { label: 'Copy Key', icon: 'copy', action: () => copyText(item.data.key, 'Key copied') }
          : {
              label: 'Copy Unused Codes',
              icon: 'copy',
              action: () =>
                copyText(
                  (item.data.codes || []).filter((c) => !c.used).map((c) => c.code).join('\n'),
                  'Codes copied'
                ),
            },
        { label: 'Edit…', icon: 'pencil', action: () => openEditor(item) },
        {
          label: item.favorite ? 'Remove from Favorites' : 'Add to Favorites',
          icon: 'star',
          action: () => toggleFavorite(item),
        },
        { label: 'Delete', icon: 'trash', danger: true, action: () => deleteItem(item) },
      ]);
    });
    const fav = row.querySelector('.fav-btn');
    fav.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(item);
    });
    list.appendChild(row);
  });
  hydrateIcons(list);
}

/* ---------------- Detail ---------------- */
function selectedItem() {
  return state.vault.items.find((i) => i.id === state.selectedId) || null;
}

function renderDetail() {
  const detail = $('#detail');
  const empty = $('#detail-empty');
  const item = selectedItem();
  if (!item) {
    empty.classList.remove('hidden');
    detail.classList.add('hidden');
    return;
  }
  empty.classList.add('hidden');
  detail.classList.remove('hidden');

  const isKey = item.type === 'apiKey';
  const revealed = state.revealed.has(item.id);
  const value = isKey ? item.data.key || '' : '';
  const codes = isKey ? [] : item.data.codes || [];
  const tags = item.tags || [];

  // Build the complete detail HTML first, then bind listeners once.
  let html = `
    <div class="detail-head">
      <div class="detail-icon ${isKey ? 'apiKey' : 'backupCodes'}">${icon(isKey ? 'key' : 'shield')}</div>
      <div class="detail-head-info">
        <div class="detail-title-row"><h1 class="detail-title"></h1><span class="badge ${isKey ? 'apiKey' : 'backupCodes'}">${typeLabel(item)}</span></div>
        <p class="detail-meta">Updated ${fmtDate(item.updatedAt || item.createdAt)}</p>
      </div>
      <div class="detail-actions">
        <button class="btn secondary" data-act="edit">${icon('pencil')}<span>Edit</span></button>
        <button class="btn secondary" data-act="delete">${icon('trash')}<span>Delete</span></button>
      </div>
    </div>
  `;

  if (isKey) {
    html += `
      <div class="group">
        <div class="group-label">API Key</div>
        <div class="group-card">
          <div class="secret-row">
            <code class="key-code${revealed ? ' revealed' : ''}"></code>
            <button class="secret-btn" data-act="reveal" title="${revealed ? 'Hide' : 'Reveal'}">${icon(revealed ? 'eye.slash' : 'eye')}</button>
            <button class="secret-btn" data-act="copy" title="Copy">${icon('copy')}</button>
          </div>
        </div>
      </div>
    `;
  } else {
    html += `
      <div class="group">
        <div class="group-label">Recovery Codes <span class="list-count">${codes.filter((c) => !c.used).length} of ${codes.length} remaining</span></div>
        <div class="group-card"><div class="codes-grid"></div></div>
      </div>
    `;
  }

  html += `
    <div class="group">
      <div class="group-label">Notes</div>
      <div class="group-card"><p class="notes-text${item.notes ? '' : ' notes-empty'}"></p></div>
    </div>
    <div class="group">
      <div class="group-label">Tags</div>
      <div class="group-card"><div class="tag-row"></div></div>
    </div>
  `;

  detail.innerHTML = html;
  detail.querySelector('.detail-title').textContent = item.title;

  if (isKey) {
    detail.querySelector('.key-code').textContent = revealed ? value : maskKey(value);
    detail.querySelector('[data-act="reveal"]').addEventListener('click', () => {
      if (revealed) state.revealed.delete(item.id);
      else state.revealed.add(item.id);
      renderDetail();
    });
    detail.querySelector('[data-act="copy"]').addEventListener('click', () => {
      if (!value) return toast('Nothing to copy');
      copyText(value, 'Key copied');
    });
  } else {
    const grid = detail.querySelector('.codes-grid');
    codes.forEach((c, idx) => {
      const chip = document.createElement('div');
      chip.className = 'code-chip' + (c.used ? ' used' : '');
      chip.innerHTML = `
        <code></code>
        <button class="chip-btn copy" title="Copy">${icon('copy')}</button>
        <button class="chip-btn ${c.used ? 'restore' : 'use'}" title="${c.used ? 'Restore' : 'Mark used'}">${icon(c.used ? 'restore' : 'checkmark')}</button>
      `;
      chip.querySelector('code').textContent = c.code || `Code ${idx + 1}`;
      chip.querySelector('.copy').addEventListener('click', () => copyText(c.code, 'Code copied'));
      chip.querySelector(c.used ? '.restore' : '.use').addEventListener('click', () => {
        c.used = !c.used;
        persist();
        renderDetail();
      });
      grid.appendChild(chip);
    });
  }

  const notesEl = detail.querySelector('.notes-text');
  notesEl.textContent = item.notes || 'No notes';

  const tagRow = detail.querySelector('.tag-row');
  if (!tags.length) {
    tagRow.innerHTML = '<span class="notes-empty">No tags</span>';
  } else {
    tags.forEach((t) => {
      const pill = document.createElement('span');
      pill.className = 'tag-pill';
      pill.textContent = t;
      pill.addEventListener('click', () => {
        state.filter = 'tag:' + t;
        state.selectedId = null;
        renderAll();
      });
      tagRow.appendChild(pill);
    });
  }

  detail.querySelector('[data-act="edit"]').addEventListener('click', () => openEditor(item));
  detail.querySelector('[data-act="delete"]').addEventListener('click', () => deleteItem(item));
  hydrateIcons(detail);
}

/* ---------------- Item mutations ---------------- */
function toggleFavorite(item) {
  item.favorite = !item.favorite;
  persist();
  renderList();
  renderDetail();
}

function deleteItem(item) {
  confirmModal('Delete "' + item.title + '"?', 'This item and its secrets will be permanently removed from your vault.', 'Delete', true).then(
    (ok) => {
      if (!ok) return;
      state.vault.items = state.vault.items.filter((i) => i.id !== item.id);
      if (state.selectedId === item.id) state.selectedId = null;
      persist();
      renderAll();
      toast('Item deleted');
    }
  );
}

/* ---------------- Tags ---------------- */
function addTag(name) {
  name = name.trim().replace(/^#+/, '');
  if (!name) return;
  if (!(state.vault.tags || []).includes(name)) {
    state.vault.tags.push(name);
    persist();
  }
  renderSidebar();
}

function deleteTag(name) {
  confirmModal('Delete tag "' + name + '"?', 'The tag will be removed from all items. Your items stay safe.', 'Delete Tag', true).then(
    (ok) => {
      if (!ok) return;
      state.vault.tags = (state.vault.tags || []).filter((t) => t !== name);
      state.vault.items.forEach((i) => {
        i.tags = (i.tags || []).filter((t) => t !== name);
      });
      if (state.filter === 'tag:' + name) {
        state.filter = 'all';
        state.selectedId = null;
      }
      persist();
      renderAll();
      toast('Tag deleted');
    }
  );
}

function renameTag(oldName) {
  promptText('Rename Tag', 'Enter a new name for this tag.', oldName, (newName) => {
    if (newName == null) return;
    const clean = newName.trim().replace(/^#+/, '');
    if (!clean || clean === oldName) return;
    const tags = state.vault.tags || [];
    if (tags.includes(clean)) return toast('A tag with that name already exists');
    tags[tags.indexOf(oldName)] = clean;
    state.vault.items.forEach((i) => {
      const idx = (i.tags || []).indexOf(oldName);
      if (idx !== -1) i.tags[idx] = clean;
    });
    if (state.filter === 'tag:' + oldName) state.filter = 'tag:' + clean;
    persist();
    renderAll();
  });
}

/* ---------------- Editor modal ---------------- */
let editingId = null;
let editorType = 'apiKey';
let editorTags = [];
let editorFavorite = false;

function openEditor(item) {
  editingId = item ? item.id : null;
  editorType = item ? item.type : 'apiKey';
  editorTags = item ? [...(item.tags || [])] : [];
  editorFavorite = item ? !!item.favorite : false;

  const isNew = !item;
  $('#editor-title').textContent = isNew ? 'New Item' : 'Edit Item';
  const body = $('#editor-body');

  const codesValue = item && item.type === 'backupCodes' ? (item.data.codes || []).map((c) => c.code).join('\n') : '';

  body.innerHTML = `
    <div class="form-field">
      <label class="form-label">Type</label>
      <div class="type-seg">
        <button class="type-option" data-type="apiKey">${icon('key')}<span>API Key</span></button>
        <button class="type-option" data-type="backupCodes">${icon('shield')}<span>Backup Codes</span></button>
      </div>
    </div>
    <div class="form-field">
      <label class="form-label">Name</label>
      <input id="ed-title" class="text-input" type="text" placeholder="e.g. GitHub" spellcheck="false" value="${escAttr(item ? item.title : '')}" />
    </div>
    <div class="form-field" id="ed-key-field">
      <label class="form-label">API Key</label>
      <input id="ed-key" class="text-input" type="text" placeholder="sk-…" spellcheck="false" autocomplete="off" value="${escAttr(item && item.type === 'apiKey' ? item.data.key || '' : '')}" />
    </div>
    <div class="form-field hidden" id="ed-codes-field">
      <label class="form-label">Recovery Codes</label>
      <textarea id="ed-codes" class="text-input form-textarea" placeholder="One code per line" spellcheck="false"></textarea>
      <p class="codes-editor-hint">One code per line. Used status is kept for codes that stay unchanged.</p>
    </div>
    <div class="form-field">
      <label class="form-label">Notes</label>
      <textarea id="ed-notes" class="text-input form-textarea" placeholder="Anything you want to remember…" spellcheck="false"></textarea>
    </div>
    <div class="form-field">
      <label class="form-label">Tags</label>
      <div class="token-wrap" id="ed-tag-wrap"></div>
    </div>
    <div class="form-field switch-row">
      <span class="switch-label">Favorite</span>
      <button class="switch" id="ed-fav" role="switch" aria-checked="false"></button>
    </div>
  `;
  $('#ed-codes').value = codesValue;
  $('#ed-notes').value = item ? item.notes || '' : '';
  renderTokens();
  renderTypeSeg();

  body.querySelectorAll('.type-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      editorType = btn.getAttribute('data-type');
      renderTypeSeg();
    });
  });

  const fav = $('#ed-fav');
  fav.addEventListener('click', () => {
    editorFavorite = !editorFavorite;
    fav.classList.toggle('on', editorFavorite);
    fav.setAttribute('aria-checked', String(editorFavorite));
  });
  fav.classList.toggle('on', editorFavorite);
  fav.setAttribute('aria-checked', String(editorFavorite));

  hydrateIcons(body);
  $('#editor-backdrop').classList.remove('hidden');
  setTimeout(() => $('#ed-title').focus(), 50);
}

function renderTypeSeg() {
  $$('.type-option').forEach((b) => b.classList.toggle('active', b.getAttribute('data-type') === editorType));
  $('#ed-key-field').classList.toggle('hidden', editorType !== 'apiKey');
  $('#ed-codes-field').classList.toggle('hidden', editorType !== 'backupCodes');
}

function renderTokens() {
  const wrap = $('#ed-tag-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  editorTags.forEach((t) => {
    const tok = document.createElement('span');
    tok.className = 'token';
    tok.innerHTML = `<span class="tok-label"></span><button class="token-x" type="button">×</button>`;
    tok.querySelector('.tok-label').textContent = t;
    tok.querySelector('.token-x').addEventListener('click', () => {
      editorTags = editorTags.filter((x) => x !== t);
      renderTokens();
    });
    wrap.appendChild(tok);
  });
  const input = document.createElement('input');
  input.className = 'token-input';
  input.placeholder = editorTags.length ? '' : 'Add tag, press Return';
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitToken(input);
    } else if (e.key === 'Backspace' && !input.value && editorTags.length) {
      editorTags.pop();
      renderTokens();
      const inp = wrap.querySelector('.token-input');
      if (inp) inp.focus();
    }
  });
  input.addEventListener('blur', () => commitToken(input));
  wrap.appendChild(input);
  const inp = wrap.querySelector('.token-input');
  if (inp) inp.focus();
}

function commitToken(input) {
  const val = input.value.trim().replace(/^#+/, '');
  if (val && !editorTags.includes(val)) {
    editorTags.push(val);
    if (state.vault.tags && !state.vault.tags.includes(val)) {
      state.vault.tags.push(val);
    }
  }
  renderTokens();
}

function closeEditor() {
  $('#editor-backdrop').classList.add('hidden');
  editingId = null;
}

function saveEditor() {
  const title = $('#ed-title').value.trim();
  if (!title) {
    showEditorError('Give this item a name');
    return;
  }

  // Build the data payload and validate before touching state.
  const data = {};
  if (editorType === 'apiKey') {
    data.key = $('#ed-key').value.trim();
    if (!data.key) {
      showEditorError('Enter an API key value');
      return;
    }
  } else {
    const lines = $('#ed-codes')
      .value.split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) {
      showEditorError('Enter at least one recovery code');
      return;
    }
    const oldCodes = editingId
      ? (() => {
          const it = state.vault.items.find((i) => i.id === editingId);
          return it && it.type === 'backupCodes' ? it.data.codes || [] : [];
        })()
      : [];
    const oldByValue = new Map(oldCodes.map((c) => [c.code, c.used]));
    data.codes = lines.map((code) => ({ code, used: oldByValue.get(code) || false }));
  }

  const isNew = !editingId;
  let item;
  if (isNew) {
    item = {
      id: uid(),
      type: editorType,
      title,
      notes: $('#ed-notes').value.trim(),
      tags: [...editorTags],
      favorite: editorFavorite,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      data,
    };
    state.vault.items.push(item);
  } else {
    item = state.vault.items.find((i) => i.id === editingId);
    item.title = title;
    item.notes = $('#ed-notes').value.trim();
    item.tags = [...editorTags];
    item.favorite = editorFavorite;
    item.type = editorType;
    item.data = data;
    item.updatedAt = Date.now();
  }

  persist();
  state.selectedId = item.id;
  closeEditor();
  renderAll();
  toast(isNew ? 'Item added' : 'Item updated');
}

function showEditorError(msg) {
  const el = $('#editor-error');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2500);
}

function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ---------------- Confirm modal ---------------- */
function confirmModal(title, messageText, okLabel = 'OK', danger = false) {
  $('#confirm-title').textContent = title;
  $('#confirm-message').textContent = messageText;
  const ok = $('#confirm-ok');
  ok.textContent = okLabel;
  ok.classList.toggle('danger-solid', danger);
  $('#confirm-backdrop').classList.remove('hidden');
  return new Promise((resolve) => {
    confirmResolver = resolve;
  });
}

/* ---------------- Context menu ---------------- */
function showContextMenu(x, y, items) {
  const menu = $('#context-menu');
  menu.innerHTML = '';
  items.forEach((it) => {
    if (it.sep) {
      const s = document.createElement('div');
      s.className = 'context-sep';
      menu.appendChild(s);
      return;
    }
    const b = document.createElement('button');
    b.className = 'context-item' + (it.danger ? ' danger' : '');
    b.innerHTML = `${icon(it.icon || '')}<span></span>`;
    b.querySelector('span').textContent = it.label;
    b.addEventListener('click', () => {
      hideContextMenu();
      it.action();
    });
    menu.appendChild(b);
  });
  hydrateIcons(menu);
  menu.classList.remove('hidden');
  const r = menu.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  menu.style.left = Math.min(x, vw - r.width - 8) + 'px';
  menu.style.top = Math.min(y, vh - r.height - 8) + 'px';
}

function hideContextMenu() {
  $('#context-menu').classList.add('hidden');
}

/* ---------------- Settings popover ---------------- */
function renderAutoLockSeg() {
  const seg = $('#auto-lock-seg');
  seg.innerHTML = '';
  AUTO_LOCK_OPTIONS.forEach((opt) => {
    const b = document.createElement('button');
    b.textContent = opt.label;
    b.classList.toggle('active', settings.autoLockMinutes === opt.value);
    b.addEventListener('click', async () => {
      settings = await api.setSettings({ autoLockMinutes: opt.value });
      renderAutoLockSeg();
      toast('Auto-Lock updated');
    });
    seg.appendChild(b);
  });
}

function openPopover() {
  renderAutoLockSeg();
  $('#cp-old').value = '';
  $('#cp-new').value = '';
  $('#cp-error').classList.add('hidden');
  $('#settings-pop').classList.remove('hidden');
}

function closePopover() {
  $('#settings-pop').classList.add('hidden');
}

async function changePassword() {
  const oldP = $('#cp-old').value;
  const newP = $('#cp-new').value;
  if (!oldP || !newP) return showCpError('Enter both passwords');
  if (newP.length < 8) return showCpError('New password must be at least 8 characters');
  try {
    await api.changePassword(oldP, newP);
    $('#cp-old').value = '';
    $('#cp-new').value = '';
    toast('Master password changed');
  } catch (err) {
    showCpError(message(err));
  }
}

function showCpError(msg) {
  const el = $('#cp-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

/* ---------------- Export / import ---------------- */
async function doExport() {
  try {
    const res = await api.exportVault();
    if (res.canceled) return;
    if (res.error) return toast(res.error);
    toast('Backup exported');
  } catch (err) {
    toast(message(err));
  }
}

async function doImport() {
  try {
    const res = await api.importVault();
    if (res.canceled) return;
    if (res.error) return toast(res.error);
    // Ask for the password of the backup file to decrypt & confirm it.
    const pw = await promptPassword('Import Backup', 'Enter the master password for this backup file to open it.');
    if (pw == null) return;
    try {
      const r2 = await api.importWithPassword(pw);
      state.vault = r2.vault;
      state.filter = 'all';
      state.selectedId = null;
      state.revealed = new Set();
      closePopover();
      renderAll();
      toast('Backup imported');
    } catch (err) {
      toast(message(err));
    }
  } catch (err) {
    toast(message(err));
  }
}

function promptText(title, subtitle, initialValue, onDone) {
  const backdrop = document.createElement('div');
  backdrop.className = 'backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <h2></h2>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:14px;line-height:1.5"></p>
      <input type="text" class="text-input" style="height:34px" autocomplete="off" spellcheck="false" />
      <div class="modal-footer">
        <button class="btn secondary">Cancel</button>
        <button class="btn primary">OK</button>
      </div>
    </div>
  `;
  backdrop.querySelector('h2').textContent = title;
  backdrop.querySelector('p').textContent = subtitle;
  const input = backdrop.querySelector('input');
  input.value = initialValue || '';
  const [cancelBtn, okBtn] = backdrop.querySelectorAll('button');
  let done = false;
  const finish = (val) => {
    if (done) return;
    done = true;
    backdrop.remove();
    onDone(val);
  };
  cancelBtn.addEventListener('click', () => finish(null));
  okBtn.addEventListener('click', () => finish(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') finish(input.value);
    if (e.key === 'Escape') finish(null);
  });
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) finish(null);
  });
  $('#screen-main').appendChild(backdrop);
  setTimeout(() => {
    input.focus();
    input.select();
  }, 50);
}

function promptPassword(title, subtitle) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';
    backdrop.innerHTML = `
      <div class="modal">
        <h2></h2>
        <p class="confirm-message" style="font-size:13px;color:var(--text-secondary);margin-bottom:14px;line-height:1.5"></p>
        <input type="password" class="text-input" style="height:34px" autocomplete="off" spellcheck="false" />
        <div class="modal-footer">
          <button class="btn secondary">Cancel</button>
          <button class="btn primary">OK</button>
        </div>
      </div>
    `;
    backdrop.querySelector('h2').textContent = title;
    backdrop.querySelector('.confirm-message').textContent = subtitle;
    const input = backdrop.querySelector('input');
    const [cancelBtn, okBtn] = backdrop.querySelectorAll('button');
    let done = false;
    const finish = (val) => {
      if (done) return;
      done = true;
      backdrop.remove();
      resolve(val);
    };
    cancelBtn.addEventListener('click', () => finish(null));
    okBtn.addEventListener('click', () => finish(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finish(input.value);
      if (e.key === 'Escape') finish(null);
    });
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) finish(null);
    });
    $('#screen-main').appendChild(backdrop);
    setTimeout(() => input.focus(), 50);
  });
}

/* ---------------- Activity / auto-lock ---------------- */
function pingActivity() {
  const now = Date.now();
  if (now - activitySentAt < 10000) return;
  activitySentAt = now;
  api.activity().catch(() => {});
}

/* ---------------- Events ---------------- */
function bindEvents() {
  // Lock screen
  $('#lock-form').addEventListener('submit', handleUnlock);

  // Search
  $('#search').addEventListener('input', (e) => {
    state.search = e.target.value;
    state.selectedId = null;
    renderList();
    renderDetail();
  });

  // Sidebar nav
  $$('.nav-row[data-filter]').forEach((row) => {
    row.addEventListener('click', () => {
      const f = row.getAttribute('data-filter');
      if (state.filter === f) return;
      state.filter = f;
      state.selectedId = null;
      renderAll();
    });
  });

  // New item
  $('#btn-new').addEventListener('click', () => openEditor(null));

  // Add tag
  const tagInputWrap = $('#tag-input-wrap');
  const tagInput = $('#tag-input');
  $('#btn-add-tag').addEventListener('click', () => {
    tagInputWrap.classList.toggle('hidden');
    if (!tagInputWrap.classList.contains('hidden')) {
      tagInput.focus();
    }
  });
  tagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addTag(tagInput.value);
      tagInput.value = '';
      tagInputWrap.classList.add('hidden');
    } else if (e.key === 'Escape') {
      tagInput.value = '';
      tagInputWrap.classList.add('hidden');
    }
  });

  // Sidebar footer
  $('#btn-export').addEventListener('click', doExport);
  $('#btn-import').addEventListener('click', doImport);
  $('#btn-lock').addEventListener('click', () => lockNow(false));

  // Settings
  $('#btn-settings').addEventListener('click', (e) => {
    e.stopPropagation();
    const pop = $('#settings-pop');
    if (pop.classList.contains('hidden')) openPopover();
    else closePopover();
  });
  $('#cp-save').addEventListener('click', changePassword);
  $('#pop-export').addEventListener('click', doExport);
  $('#pop-import').addEventListener('click', doImport);

  // Editor
  $('#editor-cancel').addEventListener('click', closeEditor);
  $('#editor-save').addEventListener('click', saveEditor);

  // Confirm
  $('#confirm-cancel').addEventListener('click', () => {
    $('#confirm-backdrop').classList.add('hidden');
    if (confirmResolver) confirmResolver(false);
  });
  $('#confirm-ok').addEventListener('click', () => {
    $('#confirm-backdrop').classList.add('hidden');
    if (confirmResolver) confirmResolver(true);
  });

  // Close on outside click / Escape
  document.addEventListener('click', (e) => {
    const pop = $('#settings-pop');
    if (!pop.classList.contains('hidden') && !pop.contains(e.target) && !$('#btn-settings').contains(e.target)) {
      closePopover();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideContextMenu();
      closePopover();
      if (!$('#editor-backdrop').classList.contains('hidden')) closeEditor();
    }
    // Cmd+N / Ctrl+N new item
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      if (!state.vault) return;
      openEditor(null);
    }
    // Cmd+F / Ctrl+F focus search
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      if (state.vault) $('#search').focus();
    }
    if (e.key === 'Enter' && state.vault) {
      // Enter opens the first item's editor if list focused? Keep simple: nothing.
    }
  });

  // Backdrops close on click
  $('#editor-backdrop').addEventListener('mousedown', (e) => {
    if (e.target === $('#editor-backdrop')) closeEditor();
  });
  $('#confirm-backdrop').addEventListener('mousedown', (e) => {
    if (e.target === $('#confirm-backdrop')) {
      $('#confirm-backdrop').classList.add('hidden');
      if (confirmResolver) confirmResolver(false);
    }
  });

  // Hide context menu anywhere
  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('#context-menu')) hideContextMenu();
  });
  window.addEventListener('blur', hideContextMenu);

  // Activity ping for auto-lock
  ['pointermove', 'keydown', 'pointerdown', 'wheel'].forEach((ev) => {
    document.addEventListener(ev, pingActivity, { passive: true });
  });

  // Auto-lock from main
  api.onAutoLock(() => {
    toast('Vault locked automatically');
    lockNow(true);
  });
}

/* ---------------- Init ---------------- */
hydrateIcons();
bindEvents();
api
  .getSettings()
  .then((s) => {
    settings = s || settings;
    // One-time migration: the "1 hr" option was removed — fall back to 5 min.
    if (!AUTO_LOCK_OPTIONS.some((o) => o.value === settings.autoLockMinutes)) {
      settings = { ...settings, autoLockMinutes: 5 };
      api.setSettings({ autoLockMinutes: 5 }).catch(() => {});
    }
  })
  .catch(() => {});
boot();
