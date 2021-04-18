<template>
  <h1>{{ msg }}</h1>
  <p>Upload</p>
</template>

<script lang="ts">
import { ref, defineComponent } from "vue";
export default defineComponent({
  name: "Upload",
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
