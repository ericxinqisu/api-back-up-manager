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

/**
 * Encrypt a plaintext string with a master password.
 * Returns a JSON-serializable payload object.
 */
function encryptVault(plaintext, password) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = deriveKey(password, salt);
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
 * Decrypt a payload with a master password.
 * Throws if the password is wrong or the data was tampered with (GCM auth).
 */
function decryptVault(payload, password) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid vault payload');
  }
  const salt = Buffer.from(payload.salt, 'base64');
  const iv = Buffer.from(payload.iv, 'base64');
  const authTag = Buffer.from(payload.authTag, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');
  const key = deriveKey(password, salt);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

module.exports = { encryptVault, decryptVault, KDF, VERSION };
