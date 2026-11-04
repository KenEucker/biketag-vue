<template>
  <main class="container project-document">
    <router-link to="/">BikeTag</router-link>
    <h1>{{ title }}</h1>
    <section-content :filename="filename" />
    <nav aria-label="Project documents" class="d-flex flex-wrap gap-3 mt-4">
      <router-link to="/privacy">Privacy Policy</router-link>
      <router-link to="/terms">Terms of Service</router-link>
      <router-link to="/code-of-conduct">Code of Conduct</router-link>
    </nav>
  </main>
</template>

<script setup>
import SectionContent from '@/components/SectionContent.vue'

defineProps({
  title: { type: String, required: true },
  filename: { type: String, required: true },
})
</script>

<style scoped>
.project-document {
  padding-top: 2rem;
  padding-bottom: 2rem;
  text-align: left;
  overflow-wrap: anywhere;
}
</style>
