<script setup lang="ts">
import { computed, ref } from "vue";
import { formatDurationI18n, locale, t } from "@/i18n";

interface Props {
  dropUrl: string;
  expiresAt: string;
  remainingViews: number | null;
  burnAfterRead: boolean;
  isPasswordProtected?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<(e: "create-another") => void>();

const isCopied = ref(false);

const dropExpirationText = computed(() => {
  return formatDurationI18n(props.expiresAt, locale.value);
});

const dropViewsText = computed(() => {
  if (props.burnAfterRead) {
    return t("create.viewBurn");
  }
  if (props.remainingViews === null) {
    return t("create.viewUnlimited");
  }
  return String(props.remainingViews);
});

async function handleCopyLink() {
  if (!props.dropUrl) {
    return;
  }

  try {
    await navigator.clipboard.writeText(props.dropUrl);
    isCopied.value = true;
    setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  } catch (error: unknown) {
    console.error("Failed to copy drop URL to clipboard:", error);
  }
}
</script>

<template>
    <div class="space-y-6">
        <div>
            <h1
                class="font-heading text-2xl sm:text-3xl font-semibold text-text mb-2"
            >
                {{ t("created.title") }}
            </h1>
            <p
                v-if="isPasswordProtected"
                class="text-base text-text-muted leading-relaxed"
            >
                {{ t("created.passwordNote") }}
            </p>
            <p v-else class="text-base text-text-muted leading-relaxed">
                {{ t("created.keyNote") }}
            </p>
        </div>

        <div class="space-y-2">
            <label
                for="drop-url"
                class="block font-heading text-base font-semibold text-text"
            >
                {{ t("created.linkLabel") }}
            </label>
            <div class="flex flex-col sm:flex-row gap-2">
                <input
                    id="drop-url"
                    type="text"
                    readonly
                    :value="dropUrl"
                    dir="ltr"
                    class="w-full p-3.5 text-base rounded-xl border border-border bg-background text-text focus:outline-none focus:border-text select-all"
                />
                <button
                    type="button"
                    @click="handleCopyLink"
                    class="shrink-0 px-5 py-3 font-heading text-base font-semibold bg-primary hover:bg-neutral-200 text-primary-text rounded-xl transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface inline-flex items-center justify-center gap-2"
                >
                    <svg
                        v-if="isCopied"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        class="w-4 h-4 shrink-0"
                        aria-hidden="true"
                    >
                        <path
                            fill-rule="evenodd"
                            clip-rule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        />
                    </svg>
                    <svg
                        v-else
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        class="w-4 h-4 shrink-0"
                        aria-hidden="true"
                    >
                        <path
                            d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z"
                        />
                        <path
                            d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z"
                        />
                    </svg>
                    <span>{{ isCopied ? t("created.copied") : t("created.copyLink") }}</span>
                </button>
            </div>
        </div>

        <div class="rounded-xl border border-border bg-background p-4 sm:p-5">
            <div class="grid grid-cols-2 divide-x divide-border">
                <div class="pe-4 sm:pe-6">
                    <span
                        class="block text-sm font-medium text-text-muted mb-1"
                    >
                        {{ t("created.expiration") }}
                    </span>
                    <span
                        class="block font-heading text-base font-semibold text-text"
                    >
                        {{ dropExpirationText }}
                    </span>
                </div>
                <div class="ps-4 sm:ps-6">
                    <span
                        class="block text-sm font-medium text-text-muted mb-1"
                    >
                        {{ t("created.views") }}
                    </span>
                    <span
                        class="block font-heading text-base font-semibold text-text"
                    >
                        {{ dropViewsText }}
                    </span>
                </div>
            </div>
        </div>

        <div class="pt-2">
            <button
                type="button"
                @click="emit('create-another')"
                class="w-full h-12 px-6 font-heading text-base font-semibold bg-primary hover:bg-neutral-200 text-primary-text rounded-xl transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface shadow-sm"
            >
                {{ t("created.createAnother") }}
            </button>
        </div>
    </div>
</template>
