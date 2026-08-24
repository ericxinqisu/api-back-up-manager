'use strict';
const crypto = require('crypto');

// KDF and encryption parameters for the vault file.
// scrypt N=2^17 with AES-256-GCM. Nothing is stored that would allow
// recovering the master password or the plaintext without it.
const KDF = { algo: 'scrypt', N: 1 << 17, r: 8, p: 1, keyLen: 32 };
const VERSION = 1;

function deriveKey(password, salt) {
  // scrypt needs 128 * N * r bytes of memory; raise the default cap.
  return crypto.scryptSync(password, salt, KDF.keyLen, {
    N: KDF.N,
    r: KDF.r,
    p: KDF.p,
    maxmem: 256 * 1024 * 1024,
  });
}

function encryptWithKeyAndSalt(plaintext, key, salt) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    version: VERSION,
    kdf: KDF,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

/**
 * Encrypt a plaintext string with a master password.
 * Returns a JSON-serializable payload object.
 */
function encryptVault(plaintext, password) {
  const salt = crypto.randomBytes(16);
  const key = deriveKey(password, salt);
  return encryptWithKeyAndSalt(plaintext, key, salt);
}

/**
 * Encrypt a plaintext string with an already-derived 32-byte key.
 * Used when the session key is known (e.g. unlocked via Touch ID), so
 * re-saving does not re-run the expensive scrypt derivation.
 *
 * `salt` must be the vault's existing KDF salt when the key was derived
 * from a password (keeps password unlocks working); omit it for a fresh
 * random salt.
 */
function encryptVaultWithKey(plaintext, key, salt) {
  return encryptWithKeyAndSalt(plaintext, key, salt || crypto.randomBytes(16));
}

function decryptWithKey(payload, key) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid vault payload');
  }
  const iv = Buffer.from(payload.iv, 'base64');
  const authTag = Buffer.from(payload.authTag, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

/**
 * Decrypt a payload with a master password.
 * Throws if the password is wrong or the data was tampered with (GCM auth).
 */
function decryptVault(payload, password) {
  if (!payload || typeof payload !== 'object' || !payload.salt) {
    throw new Error('Invalid vault payload');
  }
  const salt = Buffer.from(payload.salt, 'base64');
  const key = deriveKey(password, salt);
  return decryptWithKey(payload, key);
}

/**
 * Decrypt a payload with an already-derived 32-byte key
 * (e.g. restored from Touch ID unlock).
 */
function decryptVaultWithKey(payload, key) {
  return decryptWithKey(payload, key);
}

module.exports = {
  encryptVault,
  encryptVaultWithKey,
  decryptVault,
  decryptVaultWithKey,
  deriveKey,
  KDF,
  VERSION,
};
