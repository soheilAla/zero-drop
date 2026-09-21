export interface CreateDropRequest {
  ciphertext: string;
  content_iv: string;
  kdf_salt: string | null;
  crypto_version: number;
  expiration_seconds: number;
  remaining_views: number | null;
}

export interface CreateDropResponse {
  id: string;
  expires_at: string;
  remaining_views: number | null;
}

export async function createDrop(
  data: CreateDropRequest,
): Promise<CreateDropResponse> {
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
