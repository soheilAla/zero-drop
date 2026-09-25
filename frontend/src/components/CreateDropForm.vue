<script setup lang="ts">
import { computed, ref } from "vue";
import {
  encryptContent,
  encryptContentWithPassword,
  hashConsumeToken,
} from "@/crypto/encryption";
import { bytesToBase64Url } from "@/crypto/base64url";
import { createDrop } from "@/api/drops";

export interface CreatedDropPayload {
  dropUrl: string;
  expiresAt: string;
  remainingViews: number | null;
  burnAfterRead: boolean;
  isPasswordProtected: boolean;
}

const emit = defineEmits<{
  (e: "created", payload: CreatedDropPayload): void;
}>();

const MIN_EXPIRATION_SECONDS = 60;
const MAX_EXPIRATION_SECONDS = 604800; // 7 days

const secret = ref("");
const days = ref(0);
const hours = ref(1);
const minutes = ref(0);

const burnAfterRead = ref(false);
const isUnlimited = ref(true);
const customViews = ref<number | null>(5);
const viewsError = ref("");

type ViewMode = "burn" | "limited" | "unlimited";
const viewMode = computed<ViewMode>({
  get() {
    if (burnAfterRead.value) return "burn";
    if (isUnlimited.value) return "unlimited";
    return "limited";
  },
  set(mode: ViewMode) {
    if (mode === "burn") {
      burnAfterRead.value = true;
      isUnlimited.value = false;
    } else if (mode === "unlimited") {
      burnAfterRead.value = false;
      isUnlimited.value = true;
    } else {
      burnAfterRead.value = false;
      isUnlimited.value = false;
      if (!customViews.value || customViews.value < 1) {
        customViews.value = 5;
      }
    }
    viewsError.value = "";
  },
});

function selectViewMode(mode: ViewMode) {
  viewMode.value = mode;
  validateViews();
}

const password = ref("");

const isLoading = ref(false);
const submitError = ref("");

const remainingViews = computed<number | null>(() => {
  if (burnAfterRead.value) {
    return 1;
  }
  if (isUnlimited.value) {
    return null;
  }
  return customViews.value && customViews.value >= 1
    ? Math.floor(customViews.value)
    : null;
});

const errorMessage = ref("");
const durationError = ref("");

const expirationSeconds = computed(() => {
  const d = Math.max(0, Number(days.value) || 0);
  const h = Math.max(0, Number(hours.value) || 0);
  const m = Math.max(0, Number(minutes.value) || 0);
  return d * 86400 + h * 3600 + m * 60;
});

const isFormValid = computed(() => {
  const hasSecret = secret.value.trim().length > 0;
  const hasValidExpiration =
    expirationSeconds.value >= MIN_EXPIRATION_SECONDS &&
    expirationSeconds.value <= MAX_EXPIRATION_SECONDS;
  const hasValidViews =
    burnAfterRead.value ||
    isUnlimited.value ||
    (customViews.value !== null && customViews.value >= 1);

  return hasSecret && hasValidExpiration && hasValidViews;
});

function handleInput() {
  if (errorMessage.value && secret.value.trim()) {
    errorMessage.value = "";
  }
  if (submitError.value) {
    submitError.value = "";
  }
}

function normalizeDuration() {
  const d = Math.max(0, Math.floor(Number(days.value) || 0));
  const h = Math.max(0, Math.floor(Number(hours.value) || 0));
  const m = Math.max(0, Math.floor(Number(minutes.value) || 0));

  const totalMinutes = d * 1440 + h * 60 + m;
  days.value = Math.floor(totalMinutes / 1440);
  const remainingMinutes = totalMinutes % 1440;
  hours.value = Math.floor(remainingMinutes / 60);
  minutes.value = remainingMinutes % 60;
}

function validateDuration() {
  normalizeDuration();

  if (expirationSeconds.value < MIN_EXPIRATION_SECONDS) {
    durationError.value = "Total duration must be at least 1 minute.";
    return false;
  } else if (expirationSeconds.value > MAX_EXPIRATION_SECONDS) {
    durationError.value = "Total duration cannot exceed 7 days.";
    return false;
  } else {
    durationError.value = "";
    return true;
  }
}

function handleViewsInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const val = parseInt(target.value, 10);
  customViews.value = isNaN(val) ? null : val;
  if (viewsError.value && customViews.value && customViews.value >= 1) {
    viewsError.value = "";
  }
}

function validateViews() {
  if (burnAfterRead.value || isUnlimited.value) {
    viewsError.value = "";
    return true;
  }

  if (!customViews.value || customViews.value < 1) {
    viewsError.value = "Remaining views must be at least 1.";
    return false;
  } else {
    viewsError.value = "";
    return true;
  }
}

async function handleCreateDrop() {
  if (isLoading.value) {
    return;
  }

  let hasError = false;

  if (!secret.value.trim()) {
    errorMessage.value = "Secret message cannot be empty.";
    hasError = true;
  } else {
    errorMessage.value = "";
  }

  const durationValid = validateDuration();
  const viewsValid = validateViews();

  if (!durationValid || !viewsValid) {
    hasError = true;
  }

  if (hasError) {
    return;
  }

  submitError.value = "";
  isLoading.value = true;

  try {
    const wasBurnAfterRead = burnAfterRead.value;
    let ciphertextBytes: Uint8Array;
    let ivBytes: Uint8Array;
    let saltBase64Url: string | null = null;
    let dropUrlFragment = "";
    let consumeToken: Uint8Array;

    if (password.value) {
      const encrypted = await encryptContentWithPassword(
        secret.value,
        password.value,
      );
      ciphertextBytes = encrypted.ciphertext;
      ivBytes = encrypted.iv;
      saltBase64Url = bytesToBase64Url(encrypted.salt);
      consumeToken = encrypted.consumeToken;
    } else {
      const encrypted = await encryptContent(secret.value);
      ciphertextBytes = encrypted.ciphertext;
      ivBytes = encrypted.iv;
      dropUrlFragment = `#${bytesToBase64Url(encrypted.key)}`;
      consumeToken = encrypted.consumeToken;
    }

    const consumeTokenHash = await hashConsumeToken(consumeToken);

    const response = await createDrop({
      ciphertext: bytesToBase64Url(ciphertextBytes),
      content_iv: bytesToBase64Url(ivBytes),
      kdf_salt: saltBase64Url,
      consume_token_hash: bytesToBase64Url(new Uint8Array(consumeTokenHash)),
      crypto_version: 1,
      expiration_seconds: expirationSeconds.value,
      remaining_views: remainingViews.value,
    });

    const dropUrl = `${window.location.origin}/drop/${response.id}${dropUrlFragment}`;

    emit("created", {
      dropUrl,
      expiresAt: response.expires_at,
      remainingViews: response.remaining_views,
      burnAfterRead: wasBurnAfterRead,
      isPasswordProtected: Boolean(password.value),
    });
  } catch (error: unknown) {
    console.error("Failed to create drop:", error);
    submitError.value =
      error instanceof Error
        ? error.message
        : "Failed to create drop. Please try again.";
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-14">
    <!-- Title & Textarea -->
    <div class="flex flex-col space-y-6">
      <div class="space-y-3">
        <div class="flex items-center gap-3 select-none">
          <div class="w-9 h-9 sm:w-10 sm:h-10 text-text shrink-0">
            <svg
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              class="w-full h-full"
            >
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M24 5C24 5 10 18.2 10 28.5C10 36.232 16.268 42.5 24 42.5C31.732 42.5 38 36.232 38 28.5C38 18.2 24 5 24 5ZM24 21C20.686 21 18 24.358 18 28.5C18 32.642 20.686 36 24 36C27.314 36 30 32.642 30 28.5C30 24.358 27.314 21 24 21Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <span
            class="font-heading text-xl sm:text-2xl font-semibold tracking-wider text-text uppercase translate-y-0.5"
          >
            ZERO DROP
          </span>
        </div>

        <div>
          <h1
            class="font-heading text-2xl sm:text-3xl font-semibold text-text tracking-tight"
          >
            Create a secure drop
          </h1>
          <p class="text-base text-text-muted mt-1.5 leading-relaxed">
            Encrypted in your browser. The decryption key and the password never
            reaches the server.
          </p>
        </div>
      </div>

      <div class="flex-1 flex flex-col">
        <label
          for="secret"
          class="block font-heading text-base font-semibold text-text mb-2.5"
        >
          Secret message
        </label>
        <textarea
          id="secret"
          v-model="secret"
          @input="handleInput"
          placeholder="Enter your sensitive text here..."
          :class="[
            'w-full flex-1 min-h-[260px] lg:min-h-[330px] p-4 text-base leading-relaxed rounded-xl bg-background text-text placeholder-text-subtle focus:outline-none transition-colors resize-none border',
            errorMessage
              ? 'border-danger focus:border-danger'
              : 'border-border focus:border-text',
          ]"
        ></textarea>
        <p v-if="errorMessage" class="mt-1.5 text-sm text-danger font-medium">
          {{ errorMessage }}
        </p>
      </div>
    </div>

    <!-- Limitations & Password -->
    <div class="flex flex-col space-y-7">
      <div>
        <label
          class="block font-heading text-base font-semibold text-text mb-2.5"
        >
          Expiration
        </label>
        <div class="grid grid-cols-3 gap-3.5">
          <div>
            <label
              for="duration-days"
              class="block text-sm font-medium text-text-muted tracking-wide mb-1.5"
            >
              Days
            </label>
            <input
              id="duration-days"
              v-model.number="days"
              @blur="validateDuration"
              type="number"
              min="0"
              max="7"
              step="1"
              class="w-full h-12 text-base font-medium rounded-xl border border-border bg-background text-text focus:outline-none focus:border-text transition-colors text-center"
            />
          </div>

          <div>
            <label
              for="duration-hours"
              class="block text-sm font-medium text-text-muted tracking-wide mb-1.5"
            >
              Hours
            </label>
            <input
              id="duration-hours"
              v-model.number="hours"
              @blur="validateDuration"
              type="number"
              min="0"
              max="23"
              step="1"
              class="w-full h-12 text-base font-medium rounded-xl border border-border bg-background text-text focus:outline-none focus:border-text transition-colors text-center"
            />
          </div>

          <div>
            <label
              for="duration-minutes"
              class="block text-sm font-medium text-text-muted tracking-wide mb-1.5"
            >
              Minutes
            </label>
            <input
              id="duration-minutes"
              v-model.number="minutes"
              @blur="validateDuration"
              type="number"
              min="0"
              max="59"
              step="1"
              class="w-full h-12 text-base font-medium rounded-xl border border-border bg-background text-text focus:outline-none focus:border-text transition-colors text-center"
            />
          </div>
        </div>
        <p v-if="durationError" class="mt-1.5 text-sm text-danger font-medium">
          {{ durationError }}
        </p>
      </div>

      <!-- Views Limit -->
      <div>
        <label
          class="block font-heading text-base font-semibold text-text mb-2.5"
        >
          Views limit
        </label>

        <div
          class="rounded-xl border border-border bg-background divide-y divide-border overflow-hidden"
        >
          <div
            role="button"
            tabindex="0"
            @click="selectViewMode('burn')"
            @keydown.enter.space.prevent="selectViewMode('burn')"
            :class="[
              'w-full h-[56px] px-4 flex items-center justify-between text-left transition-colors cursor-pointer select-none',
              viewMode === 'burn'
                ? 'bg-surface-hover/70 text-text'
                : 'text-text-muted hover:text-text hover:bg-surface/50',
            ]"
          >
            <div class="flex items-center">
              <span
                :class="[
                  'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                  viewMode === 'burn'
                    ? 'border-text bg-text'
                    : 'border-border bg-transparent',
                ]"
              >
                <span
                  v-if="viewMode === 'burn'"
                  class="w-1.5 h-1.5 rounded-full bg-background"
                />
              </span>
              <span
                class="font-heading text-base font-semibold text-text ml-3.5"
              >
                Burn after read
              </span>
            </div>
            <div class="w-32 flex items-center justify-end text-right">
              <span class="text-sm text-text-muted">1 view only</span>
            </div>
          </div>

          <div
            role="button"
            tabindex="0"
            @click="selectViewMode('limited')"
            @keydown.enter.space.prevent="selectViewMode('limited')"
            :class="[
              'w-full h-[56px] px-4 flex items-center justify-between text-left transition-colors cursor-pointer select-none',
              viewMode === 'limited'
                ? 'bg-surface-hover/70 text-text'
                : 'text-text-muted hover:text-text hover:bg-surface/50',
            ]"
          >
            <div class="flex items-center">
              <span
                :class="[
                  'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                  viewMode === 'limited'
                    ? 'border-text bg-text'
                    : 'border-border bg-transparent',
                ]"
              >
                <span
                  v-if="viewMode === 'limited'"
                  class="w-1.5 h-1.5 rounded-full bg-background"
                />
              </span>
              <span
                class="font-heading text-base font-semibold text-text ml-3.5"
                >Limited</span
              >
            </div>

            <div
              class="w-32 flex items-center justify-end text-right gap-1.5"
              @click.stop
            >
              <template v-if="viewMode === 'limited'">
                <input
                  id="remaining-views-input"
                  v-model.number="customViews"
                  @input="handleViewsInput"
                  @blur="validateViews"
                  type="number"
                  min="1"
                  placeholder="5"
                  class="w-16 h-8 text-sm font-medium text-center rounded-lg border border-border bg-surface text-text focus:outline-none focus:border-text transition-colors"
                />
                <span class="text-sm text-text-muted">views</span>
              </template>
            </div>
          </div>

          <div
            role="button"
            tabindex="0"
            @click="selectViewMode('unlimited')"
            @keydown.enter.space.prevent="selectViewMode('unlimited')"
            :class="[
              'w-full h-[56px] px-4 flex items-center justify-between text-left transition-colors cursor-pointer select-none',
              viewMode === 'unlimited'
                ? 'bg-surface-hover/70 text-text'
                : 'text-text-muted hover:text-text hover:bg-surface/50',
            ]"
          >
            <div class="flex items-center">
              <span
                :class="[
                  'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                  viewMode === 'unlimited'
                    ? 'border-text bg-text'
                    : 'border-border bg-transparent',
                ]"
              >
                <span
                  v-if="viewMode === 'unlimited'"
                  class="w-1.5 h-1.5 rounded-full bg-background"
                />
              </span>
              <span
                class="font-heading text-base font-semibold text-text ml-3.5"
                >Unlimited</span
              >
            </div>
          </div>
        </div>

        <p v-if="viewsError" class="mt-1.5 text-sm text-danger font-medium">
          {{ viewsError }}
        </p>
      </div>

      <!-- Password -->
      <div>
        <div class="flex items-center justify-between mb-2.5">
          <label
            for="password"
            class="block font-heading text-base font-semibold text-text"
          >
            Password
          </label>
          <span class="text-sm text-text-muted font-normal">Optional</span>
        </div>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="new-password"
          placeholder="Optional password"
          class="w-full h-12 px-4 text-base rounded-xl border border-border bg-background text-text placeholder-text-subtle focus:outline-none focus:border-text transition-colors"
        />
      </div>

      <div class="pt-2">
        <button
          type="button"
          :disabled="!isFormValid || isLoading"
          @click="handleCreateDrop"
          class="w-full h-12 px-6 font-heading text-base font-semibold bg-primary hover:bg-neutral-200 text-primary-text rounded-xl transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-primary shadow-sm"
        >
          {{ isLoading ? "Creating drop..." : "Create drop" }}
        </button>

        <p v-if="submitError" class="mt-2 text-sm text-danger font-medium">
          {{ submitError }}
        </p>
      </div>
    </div>
  </div>
</template>
