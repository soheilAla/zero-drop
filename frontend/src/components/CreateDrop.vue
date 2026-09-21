<script setup lang="ts">
import { computed, ref } from "vue";

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

const isViewsInputDisabled = computed(
  () => burnAfterRead.value || isUnlimited.value,
);

const displayViewsValue = computed(() => {
  if (burnAfterRead.value) {
    return "1";
  }
  if (isUnlimited.value) {
    return "Unlimited";
  }
  return customViews.value ?? "";
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

function toggleBurnAfterRead() {
  burnAfterRead.value = !burnAfterRead.value;
  if (burnAfterRead.value) {
    isUnlimited.value = false;
  } else {
    isUnlimited.value = false;
    if (!customViews.value || customViews.value < 1) {
      customViews.value = 5;
    }
  }
  viewsError.value = "";
}

function toggleUnlimited() {
  if (!isUnlimited.value) {
    isUnlimited.value = true;
    burnAfterRead.value = false;
  } else {
    isUnlimited.value = false;
    if (!customViews.value || customViews.value < 1) {
      customViews.value = 5;
    }
  }
  viewsError.value = "";
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

function handleCreateDrop() {
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

  console.log("Entered secret:", secret.value);
  console.log("Expiration seconds:", expirationSeconds.value);
  console.log("Remaining views:", remainingViews.value);
}
</script>

<template>
  <section
    class="w-full max-w-xl p-6 sm:p-8 bg-surface rounded-xl border border-border"
  >
    <h1 class="text-2xl sm:text-3xl font-bold text-text mb-6">
      Create a secure drop
    </h1>

    <div class="space-y-5">
      <div>
        <label for="secret" class="block text-base font-medium text-text mb-2">
          Secret Message
        </label>
        <textarea
          id="secret"
          v-model="secret"
          @input="handleInput"
          rows="6"
          placeholder="Enter your sensitive text here..."
          :class="[
            'w-full p-3.5 text-base leading-relaxed rounded-lg bg-background text-text placeholder-text-subtle focus:outline-none transition-colors resize-y border',
            errorMessage
              ? 'border-danger focus:border-danger'
              : 'border-border focus:border-text',
          ]"
        ></textarea>
        <p v-if="errorMessage" class="mt-2 text-sm font-medium text-danger">
          {{ errorMessage }}
        </p>
      </div>

      <!-- Expiration Duration -->
      <div>
        <label class="block text-base font-medium text-text mb-2">
          Expiration Duration
        </label>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label
              for="duration-days"
              class="block text-sm font-medium text-text-muted mb-1.5"
            >
              Days
            </label>
            <input
              id="duration-days"
              v-model.number="days"
              @blur="validateDuration"
              type="number"
              min="0"
              step="1"
              class="w-full p-2.5 text-base rounded-lg border border-border bg-background text-text focus:outline-none focus:border-text transition-colors text-center"
            />
          </div>

          <div>
            <label
              for="duration-hours"
              class="block text-sm font-medium text-text-muted mb-1.5"
            >
              Hours
            </label>
            <input
              id="duration-hours"
              v-model.number="hours"
              @blur="validateDuration"
              type="number"
              min="0"
              step="1"
              class="w-full p-2.5 text-base rounded-lg border border-border bg-background text-text focus:outline-none focus:border-text transition-colors text-center"
            />
          </div>

          <div>
            <label
              for="duration-minutes"
              class="block text-sm font-medium text-text-muted mb-1.5"
            >
              Minutes
            </label>
            <input
              id="duration-minutes"
              v-model.number="minutes"
              @blur="validateDuration"
              type="number"
              min="0"
              step="1"
              class="w-full p-2.5 text-base rounded-lg border border-border bg-background text-text focus:outline-none focus:border-text transition-colors text-center"
            />
          </div>
        </div>
        <p v-if="durationError" class="mt-2 text-sm font-medium text-danger">
          {{ durationError }}
        </p>
      </div>

      <!-- Views Limit -->
      <div class="space-y-3">
        <label class="block text-base font-medium text-text">
          Views Limit
        </label>

        <div
          class="flex items-center justify-between p-3.5 rounded-lg border border-border bg-background"
        >
          <div class="pr-4">
            <span class="block text-base font-medium text-text">
              Burn after read
            </span>
            <span class="block text-sm text-text-muted mt-0.5">
              Drop will be permanently deleted after the first view
            </span>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="burnAfterRead"
            @click="toggleBurnAfterRead"
            :class="[
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface',
              burnAfterRead ? 'bg-primary' : 'bg-border',
            ]"
          >
            <span
              :class="[
                'pointer-events-none inline-block h-5 w-5 rounded-full shadow transform ring-0 transition duration-200 ease-in-out',
                burnAfterRead
                  ? 'translate-x-5 bg-primary-text'
                  : 'translate-x-0 bg-text-muted',
              ]"
            />
          </button>
        </div>

        <div
          class="p-3.5 rounded-lg border border-border bg-background space-y-2.5"
        >
          <div class="flex items-center justify-between">
            <label
              for="remaining-views-input"
              class="text-sm font-medium text-text-muted"
            >
              Remaining Views
            </label>
            <label
              class="inline-flex items-center gap-2 cursor-pointer text-sm text-text-muted hover:text-text transition-colors select-none"
            >
              <input
                type="checkbox"
                :checked="isUnlimited"
                @change="toggleUnlimited"
                class="accent-white rounded cursor-pointer"
              />
              <span>Unlimited</span>
            </label>
          </div>

          <input
            id="remaining-views-input"
            :type="isUnlimited ? 'text' : 'number'"
            :value="displayViewsValue"
            @input="handleViewsInput"
            @blur="validateViews"
            :disabled="isViewsInputDisabled"
            min="1"
            placeholder="Enter view count"
            :class="[
              'w-full p-3 text-base rounded-lg border border-border bg-surface text-text focus:outline-none transition-colors',
              isViewsInputDisabled
                ? 'opacity-50 cursor-not-allowed text-text-muted'
                : 'focus:border-text',
              viewsError ? 'border-danger focus:border-danger' : '',
            ]"
          />

          <p v-if="viewsError" class="text-sm font-medium text-danger">
            {{ viewsError }}
          </p>
          <p class="text-sm text-text-muted">
            Enter the maximum number of times this drop can be viewed.
          </p>
        </div>
      </div>

      <button
        type="button"
        :disabled="!isFormValid"
        @click="handleCreateDrop"
        class="w-full sm:w-auto px-6 py-3 text-base font-semibold bg-primary hover:bg-text text-primary-text rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary"
      >
        Create Drop
      </button>
    </div>
  </section>
</template>
