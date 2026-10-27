<template>
  <svg
    class="biketag-icon"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <template v-if="name === 'clock'">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </template>
    <template v-else>
      <path d="M11 4 5 9H2v6h3l6 5Z" fill="currentColor" stroke="none" />
      <path v-if="name === 'volume-muted'" d="m16 9 6 6m0-6-6 6" />
      <path v-else d="M15 8a5 5 0 0 1 0 8" />
    </template>
  </svg>
</template>

<script setup lang="ts">
defineProps<{ name: 'clock' | 'volume-muted' | 'volume-low' }>()
</script>

<style scoped>
.biketag-icon {
  display: inline-block;
  width: 1em;
  height: 1em;
  vertical-align: -0.125em;
}
</style>
