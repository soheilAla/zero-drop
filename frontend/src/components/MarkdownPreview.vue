<script setup lang="ts">
import { computed } from "vue";
import { renderMarkdown } from "@/utils/markdown";

interface Props {
  content: string;
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: "Nothing to preview",
});

const renderedHtml = computed(() => renderMarkdown(props.content));
</script>

<template>
    <div
        v-if="renderedHtml"
        class="markdown-body"
        dir="auto"
        v-html="renderedHtml"
    ></div>
    <p
        v-else
        class="text-text-subtle select-none italic text-base leading-relaxed"
        dir="auto"
    >
        {{ placeholder }}
    </p>
</template>
