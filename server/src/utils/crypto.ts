import crypto from 'crypto';
import { config } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

function getKey(): Buffer {
  if (!config.encryption.key) {
    throw new Error('ENCRYPTION_KEY is not set');
  }
  
  // Use the first 32 bytes of the key
  return Buffer.from(config.encryption.key.padEnd(32, '0').slice(0, 32));
}

export function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Combine iv + authTag + salt + encrypted
  return Buffer.concat([
    iv,
    authTag,
    salt,
    Buffer.from(encrypted, 'hex'),
  ]).toString('base64');
}

export function decrypt(encryptedData: string): string {
  const key = getKey();
  const buffer = Buffer.from(encryptedData, 'base64');
  
  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const salt = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH + SALT_LENGTH);
  const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH + SALT_LENGTH);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
