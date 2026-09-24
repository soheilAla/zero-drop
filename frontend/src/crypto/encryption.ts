const PBKDF2_ITERATIONS = 600_000;
const PASSWORD_KEY_LENGTH = 32;
const PASSWORD_SALT_LENGTH = 16;

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

async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    passwordKey,
    {
      name: "AES-GCM",
      length: PASSWORD_KEY_LENGTH * 8,
    },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptContentWithPassword(
  plaintext: string,
  password: string,
) {
  const salt = crypto.getRandomValues(new Uint8Array(PASSWORD_SALT_LENGTH));

  const iv = crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKeyFromPassword(password, salt);

  const plaintextBytes = new TextEncoder().encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    plaintextBytes,
  );

  return {
    ciphertext: new Uint8Array(encrypted),
    iv,
    salt,
  };
}

export async function decryptContentWithPassword(
  ciphertext: Uint8Array,
  iv: Uint8Array,
  password: string,
  salt: Uint8Array,
) {
  const key = await deriveKeyFromPassword(password, salt);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(iv),
    },
    key,
    toArrayBuffer(ciphertext),
  );

  return new TextDecoder().decode(decrypted);
}
