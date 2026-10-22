<script setup lang="ts">
import { RouterView } from "vue-router";
import { t } from "@/i18n";
</script>

<template>
    <main
        class="min-h-dvh bg-background text-text flex flex-col items-center justify-center pt-10 pb-6 px-4 sm:p-6 lg:p-8"
    >
        <RouterView />

        <footer class="mt-8 sm:mt-10 text-center select-none">
            <p class="text-sm text-text-subtle">
                {{ t("app.footer.builtWith") }}
                <a
                    href="https://github.com/soheilAla"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-text-muted hover:text-text transition-colors font-medium underline underline-offset-4 decoration-border hover:decoration-text"
                >
                    SoheilAla
                </a>
            </p>
        </footer>
    </main>
</template>
