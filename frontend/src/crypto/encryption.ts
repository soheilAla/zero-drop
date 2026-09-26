import { base64UrlToBytes, bytesToBase64Url } from "./base64url";

const PBKDF2_ITERATIONS = 600_000;
const PASSWORD_KEY_LENGTH = 32;
const PASSWORD_SALT_LENGTH = 16;

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

function generateConsumeToken(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

function createPayload(plaintext: string, consumeToken: Uint8Array) {
  return JSON.stringify({
    plaintext,
    consume_token: bytesToBase64Url(consumeToken),
  });
}

function parsePayload(payload: string) {
  const parsed = JSON.parse(payload);

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("plaintext" in parsed) ||
    !("consume_token" in parsed) ||
    typeof parsed.plaintext !== "string" ||
    typeof parsed.consume_token !== "string"
  ) {
    throw new Error("Invalid encryption payload");
  }

  const consumeToken = base64UrlToBytes(parsed.consume_token);

  if (consumeToken.length !== 32) {
    throw new Error("Invalid consume token");
  }

  return {
    plaintext: parsed.plaintext,
    consumeToken,
  };
}

export async function hashConsumeToken(consumeToken: Uint8Array) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    toArrayBuffer(consumeToken),
  );

  return hash;
}

export async function encryptContent(plaintext: string) {
  const key = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const consumeToken = generateConsumeToken();

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    "AES-GCM",
    false,
    ["encrypt"],
  );

  const payload = createPayload(plaintext, consumeToken);
  const plaintextBytes = new TextEncoder().encode(payload);

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
    consumeToken,
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

  const payload = new TextDecoder().decode(decrypted);

  return parsePayload(payload);
}

async function deriveKeyFromPassword(password: string, salt: Uint8Array) {
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
  const consumeToken = generateConsumeToken();

  const payload = createPayload(plaintext, consumeToken);
  const plaintextBytes = new TextEncoder().encode(payload);

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
    consumeToken,
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

  const payload = new TextDecoder().decode(decrypted);

  return parsePayload(payload);
}
