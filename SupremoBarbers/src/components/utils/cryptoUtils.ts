/**
 * Web Crypto API based AES-GCM Encryption and Decryption
 */

const getPasswordKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
};

export const encryptData = async (data: string, password: string): Promise<string> => {
  const enc = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await getPasswordKey(password, salt);

  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    enc.encode(data)
  );

  const encryptedContentArr = new Uint8Array(encryptedContent);
  let buff = new Uint8Array(salt.byteLength + iv.byteLength + encryptedContentArr.byteLength);
  buff.set(salt, 0);
  buff.set(iv, salt.byteLength);
  buff.set(encryptedContentArr, salt.byteLength + iv.byteLength);
  
  // Convert to Base64
  return btoa(String.fromCharCode.apply(null, buff as unknown as number[]));
};

export const decryptData = async (encryptedBase64: string, password: string): Promise<string> => {
  try {
    const rawData = atob(encryptedBase64);
    const buff = new Uint8Array(new ArrayBuffer(rawData.length));
    for (let i = 0; i < rawData.length; i++) {
        buff[i] = rawData.charCodeAt(i);
    }

    const salt = buff.slice(0, 16);
    const iv = buff.slice(16, 16 + 12);
    const data = buff.slice(16 + 12);

    const key = await getPasswordKey(password, salt);

    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      data
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedContent);
  } catch (error) {
    throw new Error("Invalid password or corrupted backup file.");
  }
};
