<template>
  <div class="json-tree">
    <details v-if="isContainer" :open="isOpen" @toggle="onToggle">
      <summary>
        <span v-if="label !== undefined" class="json-tree__key">{{ label }}: </span>
        <span>{{ isArray ? '[' : '{' }}</span>
        <span class="json-tree__count">{{ count }} {{ isArray ? 'items' : 'keys' }}</span>
        <span>{{ isArray ? ']' : '}' }}</span>
      </summary>
      <div v-if="isOpen" class="json-tree__children">
        <json-tree
          v-for="(entry, key) in value"
          :key="key"
          :value="entry"
          :label="String(key)"
          :depth="depth + 1"
          :expansion="expansion"
        />
        <span v-if="!count" class="json-tree__count">Empty {{ isArray ? 'array' : 'object' }}</span>
      </div>
    </details>
    <div v-else class="json-tree__leaf">
      <span v-if="label !== undefined" class="json-tree__key">{{ label }}: </span>
      <span :class="`json-tree__${value === null ? 'null' : typeof value}`">{{ formatted }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    value: unknown
    label?: string
    depth?: number
    expansion?: { open: boolean; version: number } | null
  }>(),
  { label: undefined, depth: 0, expansion: null },
)

const isArray = computed(() => Array.isArray(props.value))
const isContainer = computed(() => props.value !== null && typeof props.value === 'object')
const count = computed(() => Object.keys(props.value as object).length)
const formatted = computed(() => JSON.stringify(props.value))
const isOpen = ref(props.expansion?.open ?? props.depth < 2)

watch(
  () => props.expansion,
  (expansion) => {
    if (expansion) isOpen.value = expansion.open
  },
)

function onToggle(event: Event) {
  isOpen.value = (event.target as HTMLDetailsElement).open
}
</script>

<style scoped lang="scss">
.json-tree {
  font:
    0.875rem / 1.8 ui-monospace,
    SFMono-Regular,
    Consolas,
    monospace;
  overflow-wrap: anywhere;
  text-align: left;

  summary {
    cursor: pointer;
    border-radius: 4px;

    &:hover {
      background: #edf3f6;
    }

    &:focus-visible {
      outline: 2px solid #266d85;
    }
  }

  &__children {
    margin-left: 0.45rem;
    padding-left: 1rem;
    border-left: 1px solid #dbe2e8;
  }

  &__leaf {
    padding-left: 1rem;
    white-space: pre-wrap;
  }

  &__key {
    color: #334e68;
    font-weight: 600;
  }

  &__count {
    margin: 0 0.5rem;
    color: #637583;
    font-size: 0.8rem;
  }

  &__string {
    color: #1a714d;
  }

  &__number {
    color: #855300;
  }

  &__boolean {
    color: #7c3d9c;
  }

  &__null {
    color: #637583;
  }
}
</style>
