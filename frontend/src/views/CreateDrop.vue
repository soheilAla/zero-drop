<script setup lang="ts">
import { ref } from "vue";
import CreateDropForm, {
  type CreatedDropPayload,
} from "@/components/CreateDropForm.vue";
import DropCreated from "@/components/DropCreated.vue";

const createdDrop = ref<CreatedDropPayload | null>(null);

function handleDropCreated(payload: CreatedDropPayload) {
  createdDrop.value = payload;
}

function handleCreateAnother() {
  createdDrop.value = null;
}
</script>

<template>
  <section
    class="w-full max-w-xl p-6 sm:p-8 bg-surface rounded-xl border border-border"
  >
    <DropCreated
      v-if="createdDrop"
      :drop-url="createdDrop.dropUrl"
      :expires-at="createdDrop.expiresAt"
      :remaining-views="createdDrop.remainingViews"
      :burn-after-read="createdDrop.burnAfterRead"
      :is-password-protected="createdDrop.isPasswordProtected"
      @create-another="handleCreateAnother"
    />
    <CreateDropForm v-else @created="handleDropCreated" />
  </section>
</template>
