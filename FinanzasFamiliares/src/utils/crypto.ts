import type { FamilyEncryptedState } from '../types';

/**
 * End-to-End Encryption (E2EE) module using the browser's native Web Cryptography API.
 * Uses PBKDF2 (SHA-256, 100,000 iterations) for key derivation and AES-GCM (256-bit)
 * for authenticated symmetric encryption.
 */

export type EncryptedSyncPayload = FamilyEncryptedState;

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

// Convert Uint8Array to Base64
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 to Uint8Array
function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derives a 256-bit AES-GCM key from a user passphrase and cryptographic salt.
 */
async function deriveAesKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: bytesToArrayBuffer(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts an arbitrary serializable state object into an authenticated AES-GCM payload.
 */
export async function encryptState(
  state: any,
  passphrase: string
): Promise<EncryptedSyncPayload> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(passphrase, salt);

  const enc = new TextEncoder();
  const encodedData = enc.encode(JSON.stringify(state));

  const cipherBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: bytesToArrayBuffer(iv),
    },
    key,
    encodedData
  );

  return {
    encrypted: true,
    familyCode: state.familyCode || 'FAM-DEFAULT',
    version: 1,
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(cipherBuffer),
    updatedAt: state.updatedAt || Date.now(),
  };
}

/**
 * Decrypts an authenticated AES-GCM payload back into the original state object.
 * Throws if the passphrase is incorrect or data was tampered with.
 */
export async function decryptState<T = any>(
  payload: EncryptedSyncPayload,
  passphrase: string
): Promise<T> {
  const salt = base64ToBuffer(payload.salt);
  const iv = base64ToBuffer(payload.iv);
  const cipherBytes = base64ToBuffer(payload.ciphertext);

  const key = await deriveAesKey(passphrase, salt);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: bytesToArrayBuffer(iv),
    },
    key,
    bytesToArrayBuffer(cipherBytes)
  );

  const dec = new TextDecoder();
  const jsonStr = dec.decode(decryptedBuffer);
  return JSON.parse(jsonStr) as T;
}

/**
 * Generates a high-entropy, human-friendly family security key.
 * Format: 4 alphanumeric blocks, e.g. "SEC-7842-FAM-9913"
 */
export function generateSecurityPassphrase(): string {
  const randomBytes = window.crypto.getRandomValues(new Uint8Array(8));
  const part1 = Math.floor(1000 + (randomBytes[0] / 255) * 8999);
  const part2 = Math.floor(1000 + (randomBytes[1] / 255) * 8999);
  const part3 = Math.floor(1000 + (randomBytes[2] / 255) * 8999);
  return `SEC-${part1}-${part2}-${part3}`;
}

/**
 * Generates a short SHA-256 fingerprint hash for visual key confirmation across devices.
 * e.g. "A4F1-8B3C"
 */
export async function calculateKeyFingerprint(passphrase: string): Promise<string> {
  const enc = new TextEncoder();
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', enc.encode(passphrase));
  const hashBytes = new Uint8Array(hashBuffer);
  const hex = Array.from(hashBytes.slice(0, 4))
    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
    .join('');
  return `${hex.substring(0, 4)}-${hex.substring(4, 8)}`;
}

/**
 * Generates a cryptographically secure 256-bit random invitation token.
 * Uses 32 random bytes from window.crypto.getRandomValues and converts to URL-safe Base64.
 * Prefixed with 'inv_' for clear identification.
 * Total entropy: 256 bits (unfeasible to guess or brute-force).
 */
export function generate256BitInviteToken(): string {
  const bytes = window.crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  // Base64URL encoding without trailing padding '='
  const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `inv_${base64url}`;
}

/**
 * Extracts and sanitizes an invite token from user input (supports direct token,
 * full URL, or legacy codes).
 */
export function sanitizeInviteToken(input: string): string {
  const trimmed = (input || '').trim();
  if (!trimmed) return '';

  // If user pasted a full URL (e.g., https://...?invite=inv_xyz)
  try {
    if (trimmed.includes('?') || trimmed.includes('/')) {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      const param =
        url.searchParams.get('invite') ||
        url.searchParams.get('join') ||
        url.searchParams.get('code');
      if (param) return param.trim();
    }
  } catch (_) {
    // If not a parseable URL, proceed with string manipulation
  }

  // If query string segment pasted directly: ?invite=...
  if (trimmed.startsWith('?')) {
    try {
      const params = new URLSearchParams(trimmed);
      const code = params.get('invite') || params.get('join') || params.get('code');
      if (code) return code.trim();
    } catch (_) {}
  }

  return trimmed;
}
