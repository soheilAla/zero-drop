export interface CreateDropRequest {
  ciphertext: string;
  content_iv: string;
  kdf_salt: string | null;
  consume_token_hash: string;
  crypto_version: number;
  expiration_seconds: number;
  remaining_views: number | null;
}

export interface CreateDropResponse {
  id: string;
  expires_at: string;
  remaining_views: number | null;
}

export interface DropResponse {
  id: string;
  ciphertext: string;
  content_iv: string;
  kdf_salt: string | null;
  crypto_version: number;
  expires_at: string;
  remaining_views: number | null;
}

export async function createDrop(data: CreateDropRequest) {
  const response = await fetch("/drops", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to create drop");
  }

  return response.json();
}

export async function getDrop(dropId: string): Promise<DropResponse> {
  const response = await fetch(`/drops/${dropId}`);

  if (!response.ok) {
    let errorMessage = "Failed to retrieve drop";
    try {
      const errorData = await response.json();
      if (typeof errorData?.detail === "string") {
        errorMessage = errorData.detail;
      } else if (errorData?.detail) {
        errorMessage = JSON.stringify(errorData.detail);
      }
    } catch {}
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function consumeDrop(
  dropId: string,
  consumeToken: string,
): Promise<void> {
  const response = await fetch(`/drops/${dropId}/consume`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      consume_token: consumeToken,
    }),
  });

  if (!response.ok) {
    let errorMessage = "Failed to consume drop";
    try {
      const errorData = await response.json();
      if (typeof errorData?.detail === "string") {
        errorMessage = errorData.detail;
      } else if (errorData?.detail) {
        errorMessage = JSON.stringify(errorData.detail);
      }
    } catch {}
    throw new Error(errorMessage);
  }
}
