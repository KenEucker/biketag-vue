<template>
  <h1>{{ msg }}</h1>
  <p>Profile</p>
  <div>
    <BikeTag /> 
  </div>
</template>

<script lang="ts">
import BikeTag from "../components/BikeTag.vue";
import { ref, defineComponent } from "vue";
export default defineComponent({
  name: "Profile",
  props: {
    msg: {
      type: String,
      required: true,
    },
  },
  components: {
    BikeTag,
  },
});
</script>

<style scoped>
</style>
