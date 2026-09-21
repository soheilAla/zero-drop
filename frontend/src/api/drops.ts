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

export interface DropResponse {
  id: string;
  ciphertext: string;
  content_iv: string;
  kdf_salt: string | null;
  crypto_version: number;
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

export async function getDrop(id: string): Promise<DropResponse> {
  const response = await fetch(`/drops/${id}`);

  if (!response.ok) {
    let errorMessage = "Failed to fetch drop";
    try {
      const errorData = await response.json();
      if (typeof errorData?.detail === "string") {
        errorMessage = errorData.detail;
      } else if (errorData?.detail) {
        errorMessage = JSON.stringify(errorData.detail);
      }
    } catch {
      // Ignore JSON parse error and use default message
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
