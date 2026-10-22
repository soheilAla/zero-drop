<script setup lang="ts">
import { RouterLink } from "vue-router";
import { locale, setLocale, t } from "@/i18n";
</script>

<template>
    <header
        class="w-full mb-8 sm:mb-10 flex items-center justify-between px-1 select-none"
    >
        <RouterLink
            to="/"
            class="flex items-center gap-3 text-text hover:opacity-90 transition-opacity"
        >
            <div class="w-10 h-10 sm:w-12 sm:h-12 text-text shrink-0">
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
                class="font-heading text-2xl sm:text-3xl font-semibold tracking-wider text-text uppercase translate-y-0.5"
            >
                {{ t("app.title") }}
            </span>
        </RouterLink>

        <div
            role="group"
            aria-label="Language selection"
            class="flex items-center p-0.5 rounded-lg bg-surface border border-border text-xs sm:text-sm font-medium"
        >
            <button
                type="button"
                :aria-pressed="locale === 'en'"
                @click="setLocale('en')"
                :class="[
                    'px-2.5 sm:px-3 py-1 rounded-md transition-colors cursor-pointer focus:outline-none',
                    locale === 'en'
                        ? 'bg-surface-hover text-text font-semibold shadow-xs'
                        : 'text-text-muted hover:text-text',
                ]"
            >
                ENGLISH
            </button>
            <button
                type="button"
                :aria-pressed="locale === 'fa'"
                @click="setLocale('fa')"
                :class="[
                    'px-2.5 sm:px-3 py-1 rounded-md transition-colors cursor-pointer focus:outline-none',
                    locale === 'fa'
                        ? 'bg-surface-hover text-text font-semibold shadow-xs'
                        : 'text-text-muted hover:text-text',
                ]"
            >
                فارسی
            </button>
        </div>
    </header>
</template>
