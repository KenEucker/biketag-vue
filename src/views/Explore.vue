<template>
  <h1>{{ msg }}</h1>
  <p>Explore</p>
</template>

<script lang="ts">
import { ref, defineComponent } from "vue";
export default defineComponent({
  name: "Explore",
  props: {
    msg: {
      type: String,
      required: true,
    },
  },
});
</script>

<style scoped>
</style>
