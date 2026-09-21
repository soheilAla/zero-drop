export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\//g, "_")
    .replace(/\+/g, "-")
    .replace(/=+$/, "");
}

export function base64UrlToBytes(base64Url: string): Uint8Array {
  const padded = base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = padded.replace(/_/g, "/").replace(/-/g, "+");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}
