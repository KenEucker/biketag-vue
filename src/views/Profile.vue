<template>
  <h1>{{ msg }}</h1>
  <p>Profile</p>
</template>

<script lang="ts">
import { ref, defineComponent } from "vue";
export default defineComponent({
  name: "Profile",
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
