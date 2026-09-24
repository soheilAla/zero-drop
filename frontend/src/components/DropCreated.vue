<script setup lang="ts">
import { computed, ref } from "vue";

interface Props {
  dropUrl: string;
  expiresAt: string;
  remainingViews: number | null;
  burnAfterRead: boolean;
  isPasswordProtected?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "create-another"): void;
}>();

const isCopied = ref(false);

function formatRemainingDuration(expiresAtIso: string): string {
  if (!expiresAtIso) {
    return "";
  }
  const targetDate = new Date(expiresAtIso).getTime();
  if (isNaN(targetDate)) {
    return "";
  }

  const diffSeconds = Math.round((targetDate - Date.now()) / 1000);
  if (diffSeconds <= 0) {
    return "Expired";
  }

  const totalMinutes = Math.max(1, Math.round(diffSeconds / 60));
  const daysVal = Math.floor(totalMinutes / 1440);
  const remainingMinutes = totalMinutes % 1440;
  const hoursVal = Math.floor(remainingMinutes / 60);
  const minutesVal = remainingMinutes % 60;

  const parts: string[] = [];
  if (daysVal > 0) {
    parts.push(`${daysVal} ${daysVal === 1 ? "day" : "days"}`);
  }
  if (hoursVal > 0) {
    parts.push(`${hoursVal} ${hoursVal === 1 ? "hour" : "hours"}`);
  }
  if (minutesVal > 0) {
    parts.push(`${minutesVal} ${minutesVal === 1 ? "minute" : "minutes"}`);
  }

  return parts.length > 0 ? parts.join(", ") : "Less than a minute";
}

const dropExpirationText = computed(() => {
  return formatRemainingDuration(props.expiresAt);
});

const dropViewsText = computed(() => {
  if (props.burnAfterRead) {
    return "Burn after read";
  }
  if (props.remainingViews === null) {
    return "Unlimited";
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
      <h1 class="text-2xl sm:text-3xl font-bold text-text mb-2">
        Your drop is ready!
      </h1>
      <p v-if="isPasswordProtected" class="text-sm text-text-muted">
        The password is not included in the link and was never sent to the
        server. Share the password separately with the recipient.
      </p>
      <p v-else class="text-sm text-text-muted">
        Share this link with your recipient. The decryption key is included in
        the link and was never sent to the server.
      </p>
    </div>

    <div class="space-y-2">
      <label for="drop-url" class="block text-sm font-medium text-text-muted">
        Drop Link
      </label>
      <div class="flex flex-col sm:flex-row gap-2">
        <input
          id="drop-url"
          type="text"
          readonly
          :value="dropUrl"
          class="w-full p-3.5 text-base rounded-lg border border-border bg-background text-text focus:outline-none focus:border-text font-mono select-all"
        />
        <button
          type="button"
          @click="handleCopyLink"
          class="shrink-0 px-5 py-3 text-base font-semibold bg-primary hover:bg-text text-primary-text rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
        >
          {{ isCopied ? "Copied!" : "Copy link" }}
        </button>
      </div>
    </div>

    <!-- Expiration & Views Meta -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
      <div class="p-3.5 rounded-lg border border-border bg-background">
        <span class="block text-xs font-medium text-text-muted mb-1">
          Expiration
        </span>
        <span class="block text-base font-semibold text-text">
          {{ dropExpirationText }}
        </span>
      </div>

      <div class="p-3.5 rounded-lg border border-border bg-background">
        <span class="block text-xs font-medium text-text-muted mb-1">
          Views
        </span>
        <span class="block text-base font-semibold text-text">
          {{ dropViewsText }}
        </span>
      </div>
    </div>

    <div class="pt-2">
      <button
        type="button"
        @click="emit('create-another')"
        class="w-full sm:w-auto px-6 py-3 text-base font-semibold bg-surface hover:bg-surface-hover text-text rounded-lg border border-border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
      >
        Create another
      </button>
    </div>
  </div>
</template>
