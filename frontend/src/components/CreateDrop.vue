<script setup lang="ts">
import { computed, ref } from "vue";

const secret = ref("");
const days = ref(0);
const hours = ref(1);
const minutes = ref(0);

const burnAfterRead = ref(true);
const isUnlimited = ref(false);
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

const errorMessage = ref("");
const durationError = ref("");

const expirationSeconds = computed(() => {
  const d = Math.max(0, Number(days.value) || 0);
  const h = Math.max(0, Number(hours.value) || 0);
  const m = Math.max(0, Number(minutes.value) || 0);
  return d * 86400 + h * 3600 + m * 60;
});

function handleInput() {
  if (errorMessage.value && secret.value.trim()) {
    errorMessage.value = "";
  }
}

function handleDurationInput() {
  if (durationError.value && expirationSeconds.value > 0) {
    durationError.value = "";
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

function handleCreateDrop() {
  let hasError = false;

  if (!secret.value.trim()) {
    errorMessage.value = "Secret message cannot be empty.";
    hasError = true;
  } else {
    errorMessage.value = "";
  }

  if (expirationSeconds.value <= 0) {
    durationError.value = "Total duration must be greater than zero.";
    hasError = true;
  } else {
    durationError.value = "";
  }

  if (!burnAfterRead.value && !isUnlimited.value) {
    if (!customViews.value || customViews.value < 1) {
      viewsError.value = "Remaining views must be at least 1.";
      hasError = true;
    } else {
      viewsError.value = "";
    }
  } else {
    viewsError.value = "";
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
    class="w-full max-w-xl p-6 bg-surface rounded-xl border border-border"
  >
    <h1 class="text-2xl font-semibold text-text mb-4">Create a secure drop</h1>

    <div class="space-y-4">
      <div>
        <label
          for="secret"
          class="block text-sm font-medium text-text-muted mb-1.5"
        >
          Secret Message
        </label>
        <textarea
          id="secret"
          v-model="secret"
          @input="handleInput"
          rows="6"
          placeholder="Enter your sensitive text here..."
          :class="[
            'w-full p-3 text-sm rounded-lg bg-background text-text placeholder-text-subtle focus:outline-none transition-colors resize-y border',
            errorMessage
              ? 'border-danger focus:border-danger'
              : 'border-border focus:border-text',
          ]"
        ></textarea>
        <p v-if="errorMessage" class="mt-1.5 text-xs text-danger">
          {{ errorMessage }}
        </p>
      </div>

      <!-- Expiration Duration -->
      <div>
        <label class="block text-sm font-medium text-text-muted mb-1.5">
          Expiration Duration
        </label>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label
              for="duration-days"
              class="block text-xs font-medium text-text-subtle mb-1"
            >
              Days
            </label>
            <input
              id="duration-days"
              v-model.number="days"
              @input="handleDurationInput"
              type="number"
              min="0"
              class="w-full p-2.5 text-sm rounded-lg border border-border bg-background text-text focus:outline-none focus:border-text transition-colors text-center"
            />
          </div>

          <div>
            <label
              for="duration-hours"
              class="block text-xs font-medium text-text-subtle mb-1"
            >
              Hours
            </label>
            <input
              id="duration-hours"
              v-model.number="hours"
              @input="handleDurationInput"
              type="number"
              min="0"
              max="23"
              class="w-full p-2.5 text-sm rounded-lg border border-border bg-background text-text focus:outline-none focus:border-text transition-colors text-center"
            />
          </div>

          <div>
            <label
              for="duration-minutes"
              class="block text-xs font-medium text-text-subtle mb-1"
            >
              Minutes
            </label>
            <input
              id="duration-minutes"
              v-model.number="minutes"
              @input="handleDurationInput"
              type="number"
              min="0"
              max="59"
              class="w-full p-2.5 text-sm rounded-lg border border-border bg-background text-text focus:outline-none focus:border-text transition-colors text-center"
            />
          </div>
        </div>
        <p v-if="durationError" class="mt-1.5 text-xs text-danger">
          {{ durationError }}
        </p>
      </div>

      <!-- Views Limit -->
      <div class="space-y-3">
        <label class="block text-sm font-medium text-text-muted">
          Views Limit
        </label>

        <div
          class="flex items-center justify-between p-3 rounded-lg border border-border bg-background"
        >
          <div class="pr-4">
            <span class="block text-sm font-medium text-text"
              >Burn after read</span
            >
            <span class="block text-xs text-text-subtle">
              Drop will be permanently deleted after the first view
            </span>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="burnAfterRead"
            @click="burnAfterRead = !burnAfterRead"
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
          class="p-3 rounded-lg border border-border bg-background space-y-2"
        >
          <div class="flex items-center justify-between">
            <label
              for="remaining-views-input"
              class="text-xs font-medium text-text-muted"
            >
              Remaining Views
            </label>
            <label
              v-if="!burnAfterRead"
              class="inline-flex items-center gap-1.5 cursor-pointer text-xs text-text-muted hover:text-text transition-colors select-none"
            >
              <input
                type="checkbox"
                v-model="isUnlimited"
                class="accent-white rounded cursor-pointer"
              />
              <span>Unlimited</span>
            </label>
          </div>

          <input
            id="remaining-views-input"
            v-if="!isUnlimited || burnAfterRead"
            :value="burnAfterRead ? 1 : customViews"
            @input="handleViewsInput"
            :disabled="burnAfterRead"
            type="number"
            min="1"
            placeholder="Enter view count"
            :class="[
              'w-full p-2.5 text-sm rounded-lg border border-border bg-surface text-text focus:outline-none transition-colors',
              burnAfterRead
                ? 'opacity-50 cursor-not-allowed text-text-muted'
                : 'focus:border-text',
              viewsError ? 'border-danger focus:border-danger' : '',
            ]"
          />
          <div
            v-else
            class="w-full p-2.5 text-sm rounded-lg border border-border bg-surface text-text-muted italic select-none"
          >
            Unlimited views allowed
          </div>

          <p v-if="burnAfterRead" class="text-xs text-text-subtle">
            Drop will be deleted after the first view.
          </p>
          <p v-else-if="viewsError" class="text-xs text-danger">
            {{ viewsError }}
          </p>
          <p v-else-if="!isUnlimited" class="text-xs text-text-subtle">
            Enter the maximum number of times this drop can be viewed.
          </p>
        </div>
      </div>

      <button
        type="button"
        @click="handleCreateDrop"
        class="w-full sm:w-auto px-5 py-2.5 bg-primary hover:bg-text text-primary-text font-medium rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
      >
        Create Drop
      </button>
    </div>
  </section>
</template>
