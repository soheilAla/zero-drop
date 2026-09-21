<script setup lang="ts">
import { ref } from "vue";

const secret = ref("");
const errorMessage = ref("");

function handleInput() {
  if (errorMessage.value && secret.value.trim()) {
    errorMessage.value = "";
  }
}

function handleCreateDrop() {
  if (!secret.value.trim()) {
    errorMessage.value = "Secret message cannot be empty.";
    return;
  }

  errorMessage.value = "";
  console.log("Entered secret:", secret.value);
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
