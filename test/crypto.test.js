'use strict';
/* Quick sanity test for the vault crypto module. Run: node test/crypto.test.js */
const assert = require('assert');
const crypto = require('../src/main/crypto');

const plaintext = JSON.stringify({
  version: 1,
  tags: ['work'],
  items: [{ id: 'x', title: 'GitHub', data: { key: 'sk-abc123' } }],
});

const payload = crypto.encryptVault(plaintext, 'correct horse battery staple');
assert.strictEqual(payload.version, 1);
assert.ok(payload.salt && payload.iv && payload.authTag && payload.ciphertext);

const out = crypto.decryptVault(payload, 'correct horse battery staple');
assert.strictEqual(out, plaintext);

// Wrong password must throw
let threw = false;
try {
  crypto.decryptVault(payload, 'wrong password');
} catch (_) {
  threw = true;
}
assert.ok(threw, 'wrong password should throw');

// Tampered ciphertext must throw (GCM auth)
const tampered = { ...payload, ciphertext: payload.ciphertext.slice(0, -4) + 'AAAA' };
threw = false;
try {
  crypto.decryptVault(tampered, 'correct horse battery staple');
} catch (_) {
  threw = true;
}
assert.ok(threw, 'tampered payload should throw');

// Key-based round trip (used for Touch ID unlock and fast re-saves)
const key = crypto.deriveKey('correct horse battery staple', Buffer.from(payload.salt, 'base64'));
const outByKey = crypto.decryptVaultWithKey(payload, key);
assert.strictEqual(outByKey, plaintext);

// Re-save with the vault's original salt: key AND password must both still open it.
const reencrypted = crypto.encryptVaultWithKey(plaintext, key, Buffer.from(payload.salt, 'base64'));
const outReencrypted = crypto.decryptVaultWithKey(reencrypted, key);
assert.strictEqual(outReencrypted, plaintext);
const outByPassword = crypto.decryptVault(reencrypted, 'correct horse battery staple');
assert.strictEqual(outByPassword, plaintext);

// Wrong key must throw
threw = false;
try {
  crypto.decryptVaultWithKey(payload, crypto.deriveKey('wrong password', Buffer.from(payload.salt, 'base64')));
} catch (_) {
  threw = true;
}
assert.ok(threw, 'wrong key should throw');

console.log('crypto test: OK');
