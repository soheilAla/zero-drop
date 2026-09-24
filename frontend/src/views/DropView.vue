<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { consumeDrop, getDrop, type DropResponse } from "@/api/drops";
import { base64UrlToBytes, bytesToBase64Url } from "@/crypto/base64url";
import {
  decryptContent,
  decryptContentWithPassword,
} from "@/crypto/encryption";

const route = useRoute();

const isLoading = ref(true);
const errorMessage = ref("");
const decryptedSecret = ref("");
const isCopied = ref(false);

const drop = ref<DropResponse | null>(null);
const password = ref("");

async function handleCopySecret() {
  if (!decryptedSecret.value) {
    return;
  }

  try {
    await navigator.clipboard.writeText(decryptedSecret.value);
    isCopied.value = true;
    setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  } catch (err: unknown) {
    console.error("Failed to copy secret:", err);
  }
}

async function loadAndDecryptDrop() {
  isLoading.value = true;
  errorMessage.value = "";

  const rawId = route.params.id;
  const dropId = Array.isArray(rawId) ? rawId[0] : rawId;

  const rawHash = window.location.hash;
  const hashKey = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;

  // Remove the encryption key fragment from the browser URL without reloading
  if (hashKey) {
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  }

  if (!dropId) {
    errorMessage.value = "Drop ID is missing from the URL.";
    isLoading.value = false;
    return;
  }

  try {
    drop.value = await getDrop(dropId);
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.message.toLowerCase().includes("not found")
    ) {
      errorMessage.value =
        "Drop not found or it has already expired / been consumed.";
    } else {
      errorMessage.value =
        err instanceof Error ? err.message : "Failed to fetch drop.";
    }
    isLoading.value = false;
    return;
  }

  if (drop.value.kdf_salt) {
    isLoading.value = false;
    return;
  }

  if (!hashKey) {
    errorMessage.value =
      "Decryption key is missing from the URL. Please verify the full link.";
    isLoading.value = false;
    return;
  }

  let keyBytes: Uint8Array;
  try {
    keyBytes = base64UrlToBytes(hashKey);
    if (keyBytes.length !== 32) {
      errorMessage.value = "Invalid decryption key length.";
      isLoading.value = false;
      return;
    }
  } catch {
    errorMessage.value = "Invalid decryption key format.";
    isLoading.value = false;
    return;
  }

  try {
    const ciphertextBytes = base64UrlToBytes(drop.value.ciphertext);
    const ivBytes = base64UrlToBytes(drop.value.content_iv);
    const { plaintext, consumeToken } = await decryptContent(
      ciphertextBytes,
      ivBytes,
      keyBytes,
    );
    await consumeDrop(drop.value.id, bytesToBase64Url(consumeToken));
    decryptedSecret.value = plaintext;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.message.toLowerCase().includes("not found")
    ) {
      errorMessage.value =
        "Drop not found or it has already expired / been consumed.";
    } else {
      errorMessage.value =
        "Decryption failed. The key may be invalid or the data corrupted.";
    }
    isLoading.value = false;
    return;
  }

  isLoading.value = false;
}

async function handleUnlock() {
  if (!drop.value || !drop.value.kdf_salt) {
    return;
  }

  if (!password.value) {
    errorMessage.value = "Invalid password.";
    return;
  }

  errorMessage.value = "";
  isLoading.value = true;

  try {
    const ciphertextBytes = base64UrlToBytes(drop.value.ciphertext);
    const ivBytes = base64UrlToBytes(drop.value.content_iv);
    const saltBytes = base64UrlToBytes(drop.value.kdf_salt);

    const { plaintext, consumeToken } = await decryptContentWithPassword(
      ciphertextBytes,
      ivBytes,
      password.value,
      saltBytes,
    );

    try {
      await consumeDrop(drop.value.id, bytesToBase64Url(consumeToken));
    } catch {
      drop.value = null;
      errorMessage.value =
        "Drop not found or it has already expired / been consumed.";
      return;
    }

    decryptedSecret.value = plaintext;
  } catch {
    errorMessage.value = "Invalid password.";
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  loadAndDecryptDrop();
});
</script>

<template>
  <section
    class="w-full max-w-xl p-6 sm:p-8 bg-surface rounded-xl border border-border"
  >
    <h1 class="text-2xl sm:text-3xl font-bold text-text mb-6">Secure Drop</h1>

    <div v-if="isLoading && !drop" class="py-10 text-center space-y-3">
      <p class="text-base text-text-muted">Fetching and decrypting drop...</p>
    </div>

    <div v-else-if="errorMessage && !drop?.kdf_salt" class="space-y-5">
      <div
        class="p-4 rounded-lg bg-background border border-danger/40 text-danger"
      >
        <p class="text-sm font-medium">
          {{ errorMessage }}
        </p>
      </div>

      <div class="pt-2">
        <RouterLink
          to="/"
          class="inline-block px-5 py-2.5 text-sm font-semibold bg-surface hover:bg-surface-hover text-text rounded-lg border border-border transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
        >
          Create a new drop
        </RouterLink>
      </div>
    </div>

    <div v-else-if="drop?.kdf_salt && !decryptedSecret" class="space-y-5">
      <div>
        <label
          for="password"
          class="block text-base font-medium text-text mb-2"
        >
          Password
        </label>
        <input
          id="password"
          v-model="password"
          type="password"
          placeholder="Enter password"
          autocomplete="current-password"
          @input="errorMessage = ''"
          @keydown.enter="handleUnlock"
          :class="[
            'w-full p-3.5 text-base rounded-lg border bg-background text-text focus:outline-none transition-colors',
            errorMessage
              ? 'border-danger focus:border-danger'
              : 'border-border focus:border-text',
          ]"
        />
        <p v-if="errorMessage" class="mt-2 text-sm font-medium text-danger">
          {{ errorMessage }}
        </p>
      </div>

      <div class="pt-2">
        <button
          type="button"
          :disabled="isLoading"
          @click="handleUnlock"
          class="w-full sm:w-auto px-6 py-3 text-base font-semibold bg-primary hover:bg-text text-primary-text rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary"
        >
          {{ isLoading ? "Unlocking..." : "Unlock" }}
        </button>
      </div>
    </div>

    <div v-else class="space-y-5">
      <div>
        <div class="flex items-center justify-between mb-2">
          <label
            for="decrypted-secret"
            class="block text-base font-medium text-text"
          >
            Secret Message
          </label>
          <button
            type="button"
            @click="handleCopySecret"
            class="text-sm font-medium text-text-muted hover:text-text transition-colors cursor-pointer"
          >
            {{ isCopied ? "Copied!" : "Copy secret" }}
          </button>
        </div>
        <textarea
          id="decrypted-secret"
          readonly
          rows="6"
          :value="decryptedSecret"
          class="w-full p-3.5 text-base leading-relaxed rounded-lg bg-background text-text border border-border focus:outline-none select-all resize-y"
        ></textarea>
      </div>

      <div class="pt-2">
        <RouterLink
          to="/"
          class="inline-block px-6 py-3 text-base font-semibold bg-primary hover:bg-text text-primary-text rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
        >
          Create your own drop
        </RouterLink>
      </div>
    </div>
  </section>
</template>
