<script setup lang="ts">
import { ref } from "vue";
import AppHeader from "@/components/AppHeader.vue";
import CreateDropForm, { type CreatedDropPayload } from "@/components/CreateDropForm.vue";
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
    <div
        :class="[
            'w-full flex flex-col items-center transition-all duration-200',
            createdDrop
                ? 'max-w-xl sm:max-w-2xl lg:max-w-3xl'
                : 'max-w-6xl xl:max-w-340 2xl:max-w-370',
        ]"
    >
        <AppHeader />

        <section
            class="w-full p-6 sm:p-8 lg:p-12 xl:p-14 bg-surface rounded-3xl border border-border"
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
    </div>
</template>
