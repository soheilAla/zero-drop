function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

export async function encryptContent(plaintext: string) {
  const key = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    "AES-GCM",
    false,
    ["encrypt"],
  );

  const plaintextBytes = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    cryptoKey,
    plaintextBytes,
  );

  return {
    ciphertext: new Uint8Array(encrypted),
    iv,
    key,
  };
}

export async function decryptContent(
  ciphertext: Uint8Array,
  iv: Uint8Array,
  key: Uint8Array,
) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(key),
    "AES-GCM",
    false,
    ["decrypt"],
  );

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(iv),
    },
    cryptoKey,
    toArrayBuffer(ciphertext),
  );

  return new TextDecoder().decode(decrypted);
}
