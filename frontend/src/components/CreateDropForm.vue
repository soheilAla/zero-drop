<script setup lang="ts">
import { computed, ref } from "vue";
import { createDrop } from "@/api/drops";
import MarkdownPreview from "@/components/MarkdownPreview.vue";
import { bytesToBase64Url } from "@/crypto/base64url";
import { encryptContent, encryptContentWithPassword, hashConsumeToken } from "@/crypto/encryption";
import { t, toLatinDigits, translateError } from "@/i18n";
import { evaluatePasswordStrength, MIN_PASSWORD_LENGTH } from "@/utils/password";

export interface CreatedDropPayload {
  dropUrl: string;
  expiresAt: string;
  remainingViews: number | null;
  burnAfterRead: boolean;
  isPasswordProtected: boolean;
}

const emit = defineEmits<(e: "created", payload: CreatedDropPayload) => void>();

const MIN_EXPIRATION_SECONDS = 60;
const MAX_EXPIRATION_SECONDS = 7 * 24 * 60 * 60;
const MIN_REMAINING_VIEWS = 1;
const MAX_REMAINING_VIEWS = 1_000_000;

const secret = ref("");
const editorMode = ref<"raw" | "preview">("raw");
const days = ref<number | string>(0);
const hours = ref<number | string>(1);
const minutes = ref<number | string>(0);

const burnAfterRead = ref(false);
const isUnlimited = ref(true);
const customViews = ref("5");
const viewsError = ref("");

function parseAndValidateViews(raw: string): {
  parsed: number | null;
  error: string;
  isNotWholeNumber?: boolean;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      parsed: null,
      error: "error.viewsEmpty",
    };
  }

  if (!/^\d+$/.test(trimmed)) {
    return {
      parsed: 5,
      error: "",
      isNotWholeNumber: true,
    };
  }

  const num = Number(trimmed);
  if (!Number.isSafeInteger(num) || num < MIN_REMAINING_VIEWS) {
    return {
      parsed: null,
      error: "error.viewsMin",
    };
  }

  if (num > MAX_REMAINING_VIEWS) {
    return {
      parsed: null,
      error: "error.viewsMax",
    };
  }

  return {
    parsed: num,
    error: "",
  };
}

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
      if (!customViews.value.trim() || parseAndValidateViews(customViews.value).parsed === null) {
        customViews.value = "5";
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
const showPassword = ref(false);
const passwordError = ref("");
const passwordStrength = computed(() => evaluatePasswordStrength(password.value));

const isLoading = ref(false);
const submitError = ref("");

const remainingViews = computed<number | null>(() => {
  if (burnAfterRead.value) {
    return 1;
  }
  if (isUnlimited.value) {
    return null;
  }
  return parseAndValidateViews(customViews.value).parsed;
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
    parseAndValidateViews(customViews.value).parsed !== null;
  const hasValidPassword = !password.value || password.value.length >= MIN_PASSWORD_LENGTH;

  return hasSecret && hasValidExpiration && hasValidViews && hasValidPassword;
});

function handleDurationInput(field: "days" | "hours" | "minutes", event: Event) {
  const target = event.target as HTMLInputElement;
  const latin = toLatinDigits(target.value).replace(/\D/g, "");
  if (field === "days") {
    days.value = latin;
  } else if (field === "hours") {
    hours.value = latin;
  } else if (field === "minutes") {
    minutes.value = latin;
  }
  target.value = latin;
  if (durationError.value) {
    validateDuration();
  }
}

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
    durationError.value = "error.durationMin";
    return false;
  } else if (expirationSeconds.value > MAX_EXPIRATION_SECONDS) {
    durationError.value = "error.durationMax";
    return false;
  } else {
    durationError.value = "";
    return true;
  }
}

function handleViewsInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const latin = toLatinDigits(target.value);
  customViews.value = latin;
  target.value = latin;
  if (viewsError.value) {
    const { error } = parseAndValidateViews(customViews.value);
    if (!error) {
      viewsError.value = "";
    }
  }
}

function validateViews(): boolean {
  if (burnAfterRead.value || isUnlimited.value) {
    viewsError.value = "";
    return true;
  }

  const trimmed = customViews.value.trim();
  if (!trimmed) {
    customViews.value = "5";
    viewsError.value = "";
    return true;
  }

  const { parsed, error, isNotWholeNumber } = parseAndValidateViews(customViews.value);

  if (isNotWholeNumber) {
    customViews.value = "5";
    viewsError.value = "";
    return true;
  }

  if (error) {
    viewsError.value = error;
    return false;
  }

  if (parsed !== null) {
    customViews.value = String(parsed);
  }

  viewsError.value = "";
  return true;
}

function validatePassword(): boolean {
  if (password.value && password.value.length < MIN_PASSWORD_LENGTH) {
    passwordError.value = "error.passwordLength";
    return false;
  }
  passwordError.value = "";
  return true;
}

function handlePasswordInput() {
  if (passwordError.value) {
    validatePassword();
  }
  if (submitError.value) {
    submitError.value = "";
  }
}

async function handleCreateDrop() {
  if (isLoading.value) {
    return;
  }

  let hasError = false;

  if (!secret.value.trim()) {
    errorMessage.value = "error.emptySecret";
    hasError = true;
  } else {
    errorMessage.value = "";
  }

  const durationValid = validateDuration();
  const viewsValid = validateViews();
  const passwordValid = validatePassword();

  if (!durationValid || !viewsValid || !passwordValid) {
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
      const encrypted = await encryptContentWithPassword(secret.value, password.value);
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
    submitError.value = error instanceof Error ? error.message : "error.createFailed";
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-14">
        <!-- Title & Textarea -->
        <div class="flex flex-col space-y-6">
            <div>
                <h1
                    class="font-heading text-2xl sm:text-3xl font-semibold text-text tracking-tight"
                >
                    {{ t("create.title") }}
                </h1>
                <p class="text-base text-text-muted mt-1.5 leading-relaxed">
                    {{ t("create.subtitle") }}
                </p>
            </div>

            <div class="flex-1 flex flex-col">
                <div class="flex items-center justify-between mb-2.5">
                    <label
                        for="secret"
                        class="block font-heading text-base font-semibold text-text"
                    >
                        {{ t("create.secretLabel") }}
                    </label>
                    <div
                        role="tablist"
                        aria-label="Editor mode"
                        class="flex items-center p-0.5 rounded-lg bg-surface border border-border text-sm font-heading font-medium"
                    >
                        <button
                            type="button"
                            role="tab"
                            :aria-selected="editorMode === 'raw'"
                            @click="editorMode = 'raw'"
                            :class="[
                                'px-3 py-1 rounded-md transition-colors cursor-pointer focus:outline-none',
                                editorMode === 'raw'
                                    ? 'bg-surface-hover text-text shadow-xs'
                                    : 'text-text-muted hover:text-text',
                            ]"
                        >
                            {{ t("create.modeRaw") }}
                        </button>
                        <button
                            type="button"
                            role="tab"
                            :aria-selected="editorMode === 'preview'"
                            @click="editorMode = 'preview'"
                            :class="[
                                'px-3 py-1 rounded-md transition-colors cursor-pointer focus:outline-none',
                                editorMode === 'preview'
                                    ? 'bg-surface-hover text-text shadow-xs'
                                    : 'text-text-muted hover:text-text',
                            ]"
                        >
                            {{ t("create.modePreview") }}
                        </button>
                    </div>
                </div>

                <div class="flex-1 flex flex-col min-h-65 lg:min-h-82.5">
                    <textarea
                        v-show="editorMode === 'raw'"
                        id="secret"
                        v-model="secret"
                        @input="handleInput"
                        dir="auto"
                        :placeholder="t('create.secretPlaceholder')"
                        :class="[
                            'w-full flex-1 min-h-65 lg:min-h-82.5 p-4 text-base leading-relaxed rounded-xl bg-background text-text placeholder-text-subtle focus:outline-none transition-colors resize-none border',
                            errorMessage
                                ? 'border-danger focus:border-danger'
                                : 'border-border focus:border-text',
                        ]"
                    ></textarea>

                    <div
                        v-show="editorMode === 'preview'"
                        :class="[
                            'w-full flex-1 min-h-65 lg:min-h-82.5 p-4 text-base leading-relaxed rounded-xl bg-background text-text border overflow-y-auto',
                            errorMessage
                                ? 'border-danger'
                                : 'border-border',
                        ]"
                    >
                        <MarkdownPreview
                            :content="secret"
                            :placeholder="t('create.emptyPreview')"
                        />
                    </div>
                </div>

                <p
                    v-if="errorMessage"
                    class="mt-1.5 text-sm text-danger font-medium"
                >
                    {{ translateError(errorMessage) }}
                </p>
            </div>
        </div>

        <!-- Limitations & Password -->
        <div class="flex flex-col space-y-7">
            <div>
                <label
                    class="block font-heading text-base font-semibold text-text mb-2.5"
                >
                    {{ t("create.expirationLabel") }}
                </label>
                <div class="grid grid-cols-3 gap-3.5">
                    <div>
                        <label
                            for="duration-days"
                            class="block text-sm font-medium text-text-muted tracking-wide mb-1.5"
                        >
                            {{ t("create.days") }}
                        </label>
                        <input
                            id="duration-days"
                            :value="days"
                            @input="handleDurationInput('days', $event)"
                            @blur="validateDuration"
                            @keydown.enter="validateDuration"
                            type="text"
                            inputmode="numeric"
                            lang="en"
                            dir="ltr"
                            class="w-full h-12 text-base font-medium rounded-xl border border-border bg-background text-text focus:outline-none focus:border-text transition-colors text-center tabular-nums"
                        />
                    </div>

                    <div>
                        <label
                            for="duration-hours"
                            class="block text-sm font-medium text-text-muted tracking-wide mb-1.5"
                        >
                            {{ t("create.hours") }}
                        </label>
                        <input
                            id="duration-hours"
                            :value="hours"
                            @input="handleDurationInput('hours', $event)"
                            @blur="validateDuration"
                            @keydown.enter="validateDuration"
                            type="text"
                            inputmode="numeric"
                            lang="en"
                            dir="ltr"
                            class="w-full h-12 text-base font-medium rounded-xl border border-border bg-background text-text focus:outline-none focus:border-text transition-colors text-center tabular-nums"
                        />
                    </div>

                    <div>
                        <label
                            for="duration-minutes"
                            class="block text-sm font-medium text-text-muted tracking-wide mb-1.5"
                        >
                            {{ t("create.minutes") }}
                        </label>
                        <input
                            id="duration-minutes"
                            :value="minutes"
                            @input="handleDurationInput('minutes', $event)"
                            @blur="validateDuration"
                            @keydown.enter="validateDuration"
                            type="text"
                            inputmode="numeric"
                            lang="en"
                            dir="ltr"
                            class="w-full h-12 text-base font-medium rounded-xl border border-border bg-background text-text focus:outline-none focus:border-text transition-colors text-center tabular-nums"
                        />
                    </div>
                </div>
                <p
                    v-if="durationError"
                    class="mt-1.5 text-sm text-danger font-medium"
                >
                    {{ translateError(durationError) }}
                </p>
            </div>

            <!-- Views Limit -->
            <div>
                <label
                    class="block font-heading text-base font-semibold text-text mb-2.5"
                >
                    {{ t("create.viewsLabel") }}
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
                            'w-full h-14 px-4 flex items-center justify-between transition-colors cursor-pointer select-none',
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
                                class="font-heading text-base font-semibold text-text ms-3.5"
                            >
                                {{ t("create.viewBurn") }}
                            </span>
                        </div>
                        <div
                            class="w-32 flex items-center justify-end text-end"
                        >
                            <span class="text-sm text-text-muted">
                                {{ t("create.viewBurnDesc") }}
                            </span>
                        </div>
                    </div>

                    <div
                        role="button"
                        tabindex="0"
                        @click="selectViewMode('limited')"
                        @keydown.enter.space.prevent="selectViewMode('limited')"
                        :class="[
                            'w-full h-14 px-4 flex items-center justify-between transition-colors cursor-pointer select-none',
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
                                class="font-heading text-base font-semibold text-text ms-3.5"
                            >
                                {{ t("create.viewLimited") }}
                            </span>
                        </div>

                        <div
                            class="w-34 flex items-center justify-end text-end gap-1.5"
                            @click.stop
                        >
                            <template v-if="viewMode === 'limited'">
                                <input
                                    id="remaining-views-input"
                                    v-model="customViews"
                                    @input="handleViewsInput"
                                    @blur="validateViews"
                                    @keydown.enter="validateViews"
                                    type="text"
                                    inputmode="numeric"
                                    placeholder="5"
                                    :class="[
                                        'w-20 h-8 text-sm font-medium text-center rounded-lg border bg-surface text-text focus:outline-none transition-colors',
                                        viewsError
                                            ? 'border-danger focus:border-danger'
                                            : 'border-border focus:border-text',
                                    ]"
                                />
                                <span class="text-sm text-text-muted">
                                    {{ t("create.viewLimitedUnit") }}
                                </span>
                            </template>
                        </div>
                    </div>

                    <div
                        role="button"
                        tabindex="0"
                        @click="selectViewMode('unlimited')"
                        @keydown.enter.space.prevent="
                            selectViewMode('unlimited')
                        "
                        :class="[
                            'w-full h-14 px-4 flex items-center justify-between transition-colors cursor-pointer select-none',
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
                                class="font-heading text-base font-semibold text-text ms-3.5"
                            >
                                {{ t("create.viewUnlimited") }}
                            </span>
                        </div>
                        <div
                            class="w-32 flex items-center justify-end text-end"
                        >
                            <span class="text-sm text-text-muted">
                                {{ t("create.viewUnlimitedDesc") }}
                            </span>
                        </div>
                    </div>
                </div>

                <p
                    v-if="viewsError"
                    class="mt-1.5 text-sm text-danger font-medium"
                >
                    {{ translateError(viewsError) }}
                </p>
            </div>

            <!-- Password -->
            <div>
                <label
                    for="password"
                    class="block font-heading text-base font-semibold text-text mb-2.5"
                >
                    {{ t("create.passwordLabel") }}
                </label>
                <div class="relative flex items-center">
                    <input
                        id="password"
                        v-model="password"
                        :type="showPassword ? 'text' : 'password'"
                        autocomplete="new-password"
                        :placeholder="t('create.passwordPlaceholder')"
                        @input="handlePasswordInput"
                        @blur="validatePassword"
                        :class="[
                            'w-full h-12 ps-4 pe-11 text-base rounded-xl border bg-background text-text placeholder-text-subtle focus:outline-none transition-colors',
                            passwordError
                                ? 'border-danger focus:border-danger'
                                : 'border-border focus:border-text',
                        ]"
                    />
                    <button
                        type="button"
                        :aria-label="showPassword ? t('create.hidePassword') : t('create.showPassword')"
                        @click="showPassword = !showPassword"
                        class="absolute end-3 p-1 text-text-muted hover:text-text transition-colors cursor-pointer focus:outline-none"
                    >
                        <!-- Visibility toggle (show) -->
                        <svg
                            v-if="showPassword"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            class="w-5 h-5 shrink-0"
                            aria-hidden="true"
                        >
                            <path
                                fill-rule="evenodd"
                                clip-rule="evenodd"
                                d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.091 1.092a4 4 0 00-5.557-5.557z"
                            />
                            <path
                                d="M10.748 13.93l2.523 2.523a9.987 9.987 0 01-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 010-1.186A10.007 10.007 0 014.168 5.477L6.59 7.899a4 4 0 004.159 6.03z"
                            />
                        </svg>
                        <!-- Visibility toggle (hide) -->
                        <svg
                            v-else
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            class="w-5 h-5 shrink-0"
                            aria-hidden="true"
                        >
                            <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                            <path
                                fill-rule="evenodd"
                                clip-rule="evenodd"
                                d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                        </svg>
                    </button>
                </div>
                <div v-if="password" class="mt-2.5 space-y-1.5">
                    <div class="flex items-center justify-between text-sm font-heading">
                        <span class="text-text-muted">
                            {{ t("create.passwordStrength") }}
                        </span>
                        <span :class="passwordStrength.colorClass" class="font-semibold">
                            {{
                                passwordStrength.label === "Too short"
                                    ? t("strength.tooShort")
                                    : passwordStrength.label === "Weak"
                                    ? t("strength.weak")
                                    : passwordStrength.label === "Fair"
                                    ? t("strength.fair")
                                    : passwordStrength.label === "Good"
                                    ? t("strength.good")
                                    : t("strength.strong")
                            }}
                        </span>
                    </div>
                    <div class="grid grid-cols-4 gap-1.5 h-1">
                        <div
                            v-for="i in 4"
                            :key="i"
                            :class="[
                                'h-full rounded-full transition-colors duration-200',
                                i <= passwordStrength.score
                                    ? passwordStrength.barClass
                                    : 'bg-border',
                            ]"
                        />
                    </div>
                </div>
            </div>

            <div class="pt-2">
                <button
                    type="button"
                    :disabled="!isFormValid || isLoading"
                    @click="handleCreateDrop"
                    class="w-full h-12 px-6 font-heading text-base font-semibold bg-primary hover:bg-neutral-200 text-primary-text rounded-xl transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-primary shadow-sm"
                >
                    {{ isLoading ? t("create.submitting") : t("create.submit") }}
                </button>

                <p
                    v-if="submitError"
                    class="mt-2 text-sm text-danger font-medium"
                >
                    {{ translateError(submitError) }}
                </p>
            </div>
        </div>
    </div>
</template>
